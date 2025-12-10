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

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string };
}

// Parse CSV dataset
function parseCSV(csvText: string): Track[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const tracks: Track[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Handle CSV parsing with potential commas in quoted fields
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

// Normalize features to 0-1 range
function normalizeFeatures(tracks: Track[]): Map<string, number[]> {
  const mins: number[] = FEATURE_COLS.map(() => Infinity);
  const maxs: number[] = FEATURE_COLS.map(() => -Infinity);
  
  // Find min/max for each feature
  for (const track of tracks) {
    FEATURE_COLS.forEach((col, i) => {
      const val = (track as any)[col] || 0;
      mins[i] = Math.min(mins[i], val);
      maxs[i] = Math.max(maxs[i], val);
    });
  }
  
  // Normalize
  const normalized = new Map<string, number[]>();
  for (const track of tracks) {
    const features = FEATURE_COLS.map((col, i) => {
      const val = (track as any)[col] || 0;
      const range = maxs[i] - mins[i];
      return range > 0 ? (val - mins[i]) / range : 0;
    });
    normalized.set(track.track_id, features);
  }
  
  return normalized;
}

// Calculate cosine similarity between two feature vectors
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

// Get recommendations based on user's top tracks
function getRecommendations(
  userTopTrackIds: string[],
  datasetTracks: Track[],
  normalizedFeatures: Map<string, number[]>,
  excludeTrackIds: Set<string>,
  recsPerTrack: number = 5
): Track[] {
  const recommendations: Map<string, { track: Track; score: number }> = new Map();
  
  // Group dataset tracks by genre for faster lookup
  const tracksByGenre = new Map<string, Track[]>();
  for (const track of datasetTracks) {
    const genre = track.track_genre;
    if (!tracksByGenre.has(genre)) {
      tracksByGenre.set(genre, []);
    }
    tracksByGenre.get(genre)!.push(track);
  }
  
  // For each user top track that exists in dataset
  for (const userTrackId of userTopTrackIds) {
    const userTrack = datasetTracks.find(t => t.track_id === userTrackId);
    if (!userTrack) continue;
    
    const userFeatures = normalizedFeatures.get(userTrackId);
    if (!userFeatures) continue;
    
    const genre = userTrack.track_genre;
    const genreTracks = tracksByGenre.get(genre) || [];
    
    // Calculate similarity with all tracks in same genre
    const similarities: { track: Track; similarity: number }[] = [];
    for (const candidate of genreTracks) {
      if (candidate.track_id === userTrackId) continue;
      if (excludeTrackIds.has(candidate.track_id)) continue;
      
      const candidateFeatures = normalizedFeatures.get(candidate.track_id);
      if (!candidateFeatures) continue;
      
      const similarity = cosineSimilarity(userFeatures, candidateFeatures);
      similarities.push({ track: candidate, similarity });
    }
    
    // Sort by similarity and take top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topRecs = similarities.slice(0, recsPerTrack);
    
    for (const rec of topRecs) {
      const existing = recommendations.get(rec.track.track_id);
      if (!existing || rec.similarity > existing.score) {
        recommendations.set(rec.track.track_id, { track: rec.track, score: rec.similarity });
      }
    }
  }
  
  // Convert to array and sort by popularity
  const result = Array.from(recommendations.values())
    .map(r => r.track)
    .sort((a, b) => b.popularity - a.popularity);
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, playlist_name = 'TrendTracks Recommendations', num_tracks = 30 } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
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
    const userTopTracks: SpotifyTrack[] = topTracksData.items || [];
    const userTopTrackIds = userTopTracks.map(t => t.id);
    
    console.log(`Found ${userTopTracks.length} top tracks`);

    if (userTopTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No top tracks found. Listen to more music on Spotify!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch user's playlists to get known tracks (to exclude from recommendations)
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

    // 3. Load and parse the dataset
    // Fetch from the public URL of the dataset
    const datasetUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}/storage/v1/object/public/datasets/dataset.csv`;
    
    // Try to fetch from storage, fall back to embedded sample if not available
    let datasetTracks: Track[] = [];
    
    try {
      const datasetResponse = await fetch(datasetUrl);
      if (datasetResponse.ok) {
        const csvText = await datasetResponse.text();
        datasetTracks = parseCSV(csvText);
      }
    } catch (e) {
      console.log('Dataset not in storage, using request body dataset');
    }

    // If no dataset available, return error with helpful message
    if (datasetTracks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Dataset not available. Please ensure the dataset is uploaded.',
          message: 'The recommendation system requires the track dataset to generate personalized playlists.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Loaded ${datasetTracks.length} tracks from dataset`);

    // 4. Normalize features and get recommendations
    const normalizedFeatures = normalizeFeatures(datasetTracks);
    const recommendations = getRecommendations(
      userTopTrackIds,
      datasetTracks,
      normalizedFeatures,
      excludeTrackIds,
      10 // recommendations per top track
    );

    console.log(`Generated ${recommendations.length} recommendations`);

    if (recommendations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate recommendations',
          message: 'Your top tracks were not found in our dataset. Try listening to more varied music!'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create the playlist on Spotify
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

    // 6. Add tracks to the playlist
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
