import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Audio feature columns for similarity matching
const FEATURE_COLS = [
  'danceability', 'energy', 'loudness', 'speechiness', 
  'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo'
];

interface Track {
  track_id: string;
  artists: string;
  album_name: string;
  track_name: string;
  popularity: number;
  track_genre: string;
  danceability: number;
  energy: number;
  loudness: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
}

interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  loudness: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
}

// Parse CSV dataset
function parseCSV(csvText: string): Track[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const tracks: Track[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const track: any = {};
    headers.forEach((header, idx) => {
      const h = header.trim().replace(/^"|"$/g, '');
      let val = values[idx] || '';
      val = val.replace(/^"|"$/g, '');
      
      if (['popularity', 'duration_ms', 'key', 'mode', 'time_signature'].includes(h)) {
        track[h] = parseInt(val) || 0;
      } else if (FEATURE_COLS.includes(h)) {
        track[h] = parseFloat(val) || 0;
      } else {
        track[h] = val;
      }
    });
    
    if (track.track_id && track.track_genre) {
      tracks.push(track as Track);
    }
  }
  
  return tracks;
}

// Get feature stats from dataset for normalization
function getFeatureStats(tracks: Track[]): { mins: number[]; maxs: number[] } {
  const mins: number[] = FEATURE_COLS.map(() => Infinity);
  const maxs: number[] = FEATURE_COLS.map(() => -Infinity);
  
  for (const track of tracks) {
    FEATURE_COLS.forEach((col, i) => {
      const val = (track as any)[col] || 0;
      mins[i] = Math.min(mins[i], val);
      maxs[i] = Math.max(maxs[i], val);
    });
  }
  
  return { mins, maxs };
}

// Normalize a single feature vector
function normalizeVector(features: number[], mins: number[], maxs: number[]): number[] {
  return features.map((val, i) => {
    const range = maxs[i] - mins[i];
    return range > 0 ? (val - mins[i]) / range : 0;
  });
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

// Get recommendations based on user's audio feature profile
function getRecommendationsByFeatures(
  userProfile: number[],
  datasetTracks: Track[],
  featureStats: { mins: number[]; maxs: number[] },
  excludeTrackIds: Set<string>,
  numResults: number = 50
): Track[] {
  const similarities: { track: Track; similarity: number }[] = [];
  
  for (const track of datasetTracks) {
    if (excludeTrackIds.has(track.track_id)) continue;
    
    const trackFeatures = FEATURE_COLS.map(col => (track as any)[col] || 0);
    const normalizedTrack = normalizeVector(trackFeatures, featureStats.mins, featureStats.maxs);
    
    const similarity = cosineSimilarity(userProfile, normalizedTrack);
    similarities.push({ track, similarity });
  }
  
  // Sort by similarity, then by popularity for ties
  similarities.sort((a, b) => {
    const simDiff = b.similarity - a.similarity;
    if (Math.abs(simDiff) < 0.01) {
      return b.track.popularity - a.track.popularity;
    }
    return simDiff;
  });
  
  return similarities.slice(0, numResults).map(s => s.track);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, playlist_name = 'TrendTracks Recommendations', num_tracks = 30, dataset_url } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dataset_url) {
      return new Response(
        JSON.stringify({ error: 'Dataset URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating playlist:', playlist_name);

    // 1. Fetch user's top tracks from Spotify
    const topTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );

    if (!topTracksResponse.ok) {
      const error = await topTracksResponse.text();
      console.error('Failed to fetch top tracks:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch your top tracks from Spotify' }),
        { status: topTracksResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topTracksData = await topTracksResponse.json();
    const userTopTracks = topTracksData.items || [];
    const userTopTrackIds = userTopTracks.map((t: any) => t.id);
    
    console.log(`Found ${userTopTracks.length} top tracks`);

    if (userTopTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No top tracks found. Listen to more music on Spotify!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch audio features for user's top tracks from Spotify API
    console.log('Fetching audio features for top tracks...');
    const audioFeaturesResponse = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${userTopTrackIds.join(',')}`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );

    let userAudioFeatures: SpotifyAudioFeatures[] = [];
    if (audioFeaturesResponse.ok) {
      const audioFeaturesData = await audioFeaturesResponse.json();
      userAudioFeatures = (audioFeaturesData.audio_features || []).filter((f: any) => f !== null);
      console.log(`Got audio features for ${userAudioFeatures.length} tracks`);
    } else {
      console.log('Could not fetch audio features, will use dataset matching');
    }

    // 3. Fetch user's playlists to exclude known tracks
    const excludeTrackIds = new Set<string>(userTopTrackIds);
    
    try {
      const playlistsResponse = await fetch(
        'https://api.spotify.com/v1/me/playlists?limit=50',
        { headers: { 'Authorization': `Bearer ${access_token}` } }
      );
      
      if (playlistsResponse.ok) {
        const playlistsData = await playlistsResponse.json();
        const userProfile = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${access_token}` }
        }).then(r => r.json());
        
        for (const playlist of playlistsData.items || []) {
          if (playlist.owner?.id === userProfile.id) {
            try {
              const tracksResponse = await fetch(
                `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100&fields=items(track(id))`,
                { headers: { 'Authorization': `Bearer ${access_token}` } }
              );
              if (tracksResponse.ok) {
                const tracksData = await tracksResponse.json();
                for (const item of tracksData.items || []) {
                  if (item.track?.id) {
                    excludeTrackIds.add(item.track.id);
                  }
                }
              }
            } catch (e) {
              console.log('Could not fetch playlist tracks:', playlist.name);
            }
          }
        }
      }
    } catch (e) {
      console.log('Could not fetch user playlists, continuing without exclusions');
    }
    
    console.log(`Excluding ${excludeTrackIds.size} known tracks`);

    // 4. Load and parse the dataset
    console.log('Fetching dataset from:', dataset_url);
    
    const datasetResponse = await fetch(dataset_url);
    if (!datasetResponse.ok) {
      console.error('Failed to fetch dataset:', datasetResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch dataset' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const csvText = await datasetResponse.text();
    const datasetTracks = parseCSV(csvText);
    console.log(`Loaded ${datasetTracks.length} tracks from dataset`);

    // 5. Calculate user's taste profile from audio features
    const featureStats = getFeatureStats(datasetTracks);
    
    let userProfile: number[];
    
    if (userAudioFeatures.length > 0) {
      // Average the user's audio features to create a taste profile
      const avgFeatures = FEATURE_COLS.map(() => 0);
      for (const features of userAudioFeatures) {
        FEATURE_COLS.forEach((col, i) => {
          avgFeatures[i] += (features as any)[col] || 0;
        });
      }
      avgFeatures.forEach((_, i) => {
        avgFeatures[i] /= userAudioFeatures.length;
      });
      
      userProfile = normalizeVector(avgFeatures, featureStats.mins, featureStats.maxs);
      console.log('Created user taste profile from Spotify audio features');
    } else {
      // Fallback: use a balanced profile
      userProfile = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      console.log('Using balanced fallback profile');
    }

    // 6. Get recommendations based on user's taste profile
    const recommendations = getRecommendationsByFeatures(
      userProfile,
      datasetTracks,
      featureStats,
      excludeTrackIds,
      num_tracks * 2 // Get extra to filter
    );

    console.log(`Generated ${recommendations.length} recommendations`);

    if (recommendations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate recommendations',
          message: 'Unable to find matching tracks. Please try again.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Create the playlist on Spotify
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const userData = await userResponse.json();
    const userId = userData.id;

    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlist_name,
          description: 'Personalized recommendations based on your listening habits - Created by TrendTracks',
          public: false
        })
      }
    );

    if (!createPlaylistResponse.ok) {
      const error = await createPlaylistResponse.text();
      console.error('Failed to create playlist:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create playlist on Spotify' }),
        { status: createPlaylistResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newPlaylist = await createPlaylistResponse.json();
    const playlistId = newPlaylist.id;

    console.log(`Created playlist: ${playlistId}`);

    // 8. Add tracks to the playlist
    const trackUris = recommendations
      .slice(0, num_tracks)
      .map(t => `spotify:track:${t.track_id}`);

    if (trackUris.length > 0) {
      const addTracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: trackUris })
        }
      );

      if (!addTracksResponse.ok) {
        console.error('Failed to add tracks:', await addTracksResponse.text());
      }
    }

    console.log(`Added ${trackUris.length} tracks to playlist`);

    return new Response(
      JSON.stringify({
        success: true,
        playlist_id: playlistId,
        playlist_url: newPlaylist.external_urls?.spotify,
        tracks_added: trackUris.length,
        recommendations: recommendations.slice(0, num_tracks).map(t => ({
          id: t.track_id,
          name: t.track_name,
          artist: t.artists,
          album: t.album_name,
          genre: t.track_genre,
          popularity: t.popularity
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating playlist:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create playlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});