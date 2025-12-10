import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature columns for similarity matching (matching Python notebook)
const FEATURE_COLS = [
  'danceability', 'energy', 'key', 'loudness', 'mode',
  'speechiness', 'acousticness', 'instrumentalness',
  'liveness', 'valence', 'tempo'
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
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
}

// Parse CSV dataset - handles CSV with index column
function parseCSV(csvText: string): Track[] {
  const lines = csvText.split('\n');
  if (lines.length === 0) {
    console.log('CSV is empty');
    return [];
  }
  
  // Parse headers - handle potential index column (empty first header)
  let headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  console.log(`CSV headers: ${headers.slice(0, 5).join(', ')}...`);
  
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
      if (!header) return; // Skip empty header (index column)
      let val = values[idx] || '';
      val = val.replace(/^"|"$/g, '');
      
      if (['popularity', 'duration_ms', 'key', 'mode', 'time_signature'].includes(header)) {
        track[header] = parseInt(val) || 0;
      } else if (['danceability', 'energy', 'loudness', 'speechiness', 'acousticness', 
                  'instrumentalness', 'liveness', 'valence', 'tempo'].includes(header)) {
        track[header] = parseFloat(val) || 0;
      } else {
        track[header] = val;
      }
    });
    
    if (track.track_id && track.track_genre) {
      tracks.push(track as Track);
    }
  }
  
  console.log(`Parsed ${tracks.length} valid tracks from CSV`);
  if (tracks.length > 0) {
    console.log(`Sample track: ${tracks[0].track_name} by ${tracks[0].artists}`);
  }
  
  return tracks;
}

// Calculate min/max for normalization (matching Python MinMaxScaler)
function getFeatureStats(tracks: Track[]): { mins: Record<string, number>; maxs: Record<string, number> } {
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};
  
  FEATURE_COLS.forEach(col => {
    mins[col] = Infinity;
    maxs[col] = -Infinity;
  });
  
  for (const track of tracks) {
    FEATURE_COLS.forEach(col => {
      const val = (track as any)[col] || 0;
      mins[col] = Math.min(mins[col], val);
      maxs[col] = Math.max(maxs[col], val);
    });
  }
  
  return { mins, maxs };
}

// Normalize features (MinMaxScaler style)
function normalizeTrack(track: Track, mins: Record<string, number>, maxs: Record<string, number>): number[] {
  return FEATURE_COLS.map(col => {
    const val = (track as any)[col] || 0;
    const range = maxs[col] - mins[col];
    return range > 0 ? (val - mins[col]) / range : 0;
  });
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

// Get recommendations by genre (matching Python logic)
function getRecommendationsByGenre(
  inputTrack: Track,
  inputNorm: number[],
  genreTracks: Track[],
  mins: Record<string, number>,
  maxs: Record<string, number>,
  excludeIds: Set<string>,
  numRecs: number
): Track[] {
  const similarities: { track: Track; sim: number }[] = [];
  
  for (const candidate of genreTracks) {
    if (candidate.track_id === inputTrack.track_id) continue;
    if (excludeIds.has(candidate.track_id)) continue;
    
    const candidateNorm = normalizeTrack(candidate, mins, maxs);
    const sim = cosineSimilarity(inputNorm, candidateNorm);
    similarities.push({ track: candidate, sim });
  }
  
  // Sort by similarity, then popularity
  similarities.sort((a, b) => {
    const simDiff = b.sim - a.sim;
    if (Math.abs(simDiff) < 0.01) {
      return b.track.popularity - a.track.popularity;
    }
    return simDiff;
  });
  
  return similarities.slice(0, numRecs).map(s => s.track);
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

    // 1. Fetch user's top tracks from Spotify (like Python: get_user_top_tracks)
    const topTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );

    if (!topTracksResponse.ok) {
      console.error('Failed to fetch top tracks:', await topTracksResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch your top tracks from Spotify' }),
        { status: topTracksResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topTracksData = await topTracksResponse.json();
    const userTopTracks = topTracksData.items || [];
    const userTopTrackIds: string[] = userTopTracks.map((t: any) => t.id);
    
    console.log(`Found ${userTopTracks.length} top tracks`);

    if (userTopTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No top tracks found. Listen to more music on Spotify!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get all known track IDs from user playlists (like Python: get_all_user_playlist_track_ids)
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
                  if (item.track?.id) excludeTrackIds.add(item.track.id);
                }
              }
            } catch (e) { /* skip */ }
          }
        }
      }
    } catch (e) {
      console.log('Could not fetch user playlists, continuing without exclusions');
    }
    
    console.log(`Excluding ${excludeTrackIds.size} known tracks`);

    // 3. Load and parse the dataset (like Python: pd.read_csv)
    console.log('Fetching dataset from:', dataset_url);
    const datasetResponse = await fetch(dataset_url);
    console.log('Dataset response status:', datasetResponse.status);
    
    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error('Dataset fetch failed:', errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: 'Failed to fetch dataset', details: `Status: ${datasetResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const csvText = await datasetResponse.text();
    console.log(`CSV text length: ${csvText.length}, first 100 chars: ${csvText.substring(0, 100)}`);
    const datasetTracks = parseCSV(csvText);
    console.log(`Loaded ${datasetTracks.length} tracks from dataset`);

    // 4. Prepare data: calculate feature stats for normalization (like Python: prepare_kaggle_data)
    const { mins, maxs } = getFeatureStats(datasetTracks);
    
    // Create lookup maps
    const trackById = new Map<string, Track>();
    const tracksByGenre = new Map<string, Track[]>();
    
    for (const track of datasetTracks) {
      trackById.set(track.track_id, track);
      if (!tracksByGenre.has(track.track_genre)) {
        tracksByGenre.set(track.track_genre, []);
      }
      tracksByGenre.get(track.track_genre)!.push(track);
    }

    // 5. Find user's top tracks that exist in dataset (like Python: merge_df)
    const matchedTracks: Track[] = [];
    for (const userTrack of userTopTracks) {
      const datasetTrack = trackById.get(userTrack.id);
      if (datasetTrack) {
        matchedTracks.push(datasetTrack);
      }
    }
    
    console.log(`Matched ${matchedTracks.length} of ${userTopTracks.length} top tracks in dataset`);

    // 6. Generate recommendations (like Python: get_recommendations_from_top_tracks_genre)
    const allRecommendations = new Map<string, Track>();
    const recsPerSong = 10;
    
    if (matchedTracks.length > 0) {
      // Use matched tracks for genre-based recommendations
      for (const inputTrack of matchedTracks) {
        const inputNorm = normalizeTrack(inputTrack, mins, maxs);
        const genreTracks = tracksByGenre.get(inputTrack.track_genre) || [];
        
        const recs = getRecommendationsByGenre(
          inputTrack, inputNorm, genreTracks, mins, maxs, excludeTrackIds, recsPerSong
        );
        
        for (const rec of recs) {
          if (!allRecommendations.has(rec.track_id)) {
            allRecommendations.set(rec.track_id, rec);
          }
        }
      }
    } else {
      // Fallback: Use Spotify audio features API
      console.log('No tracks matched, using Spotify audio features fallback...');
      const idsToFetch = userTopTrackIds.join(',');
      const audioFeaturesResponse = await fetch(
        `https://api.spotify.com/v1/audio-features?ids=${idsToFetch}`,
        { headers: { 'Authorization': `Bearer ${access_token}` } }
      );
      
      if (audioFeaturesResponse.ok) {
        const audioFeaturesData = await audioFeaturesResponse.json();
        const features = (audioFeaturesData.audio_features || []).filter((f: any) => f);
        
        if (features.length > 0) {
          // Calculate average user profile
          const avgProfile: number[] = FEATURE_COLS.map(() => 0);
          for (const f of features) {
            FEATURE_COLS.forEach((col, i) => {
              avgProfile[i] += (f[col] || 0);
            });
          }
          avgProfile.forEach((_, i) => avgProfile[i] /= features.length);
          
          // Normalize using dataset stats
          const normalizedProfile = FEATURE_COLS.map((col, i) => {
            const range = maxs[col] - mins[col];
            return range > 0 ? (avgProfile[i] - mins[col]) / range : 0;
          });
          
          // Find similar tracks across all genres
          const similarities: { track: Track; sim: number }[] = [];
          for (const track of datasetTracks) {
            if (excludeTrackIds.has(track.track_id)) continue;
            const trackNorm = normalizeTrack(track, mins, maxs);
            const sim = cosineSimilarity(normalizedProfile, trackNorm);
            similarities.push({ track, sim });
          }
          
          similarities.sort((a, b) => {
            const simDiff = b.sim - a.sim;
            return Math.abs(simDiff) < 0.01 ? b.track.popularity - a.track.popularity : simDiff;
          });
          
          for (const s of similarities.slice(0, num_tracks * 2)) {
            allRecommendations.set(s.track.track_id, s.track);
          }
        }
      }
    }

    // 7. Sort by popularity and limit
    const recommendations = Array.from(allRecommendations.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, num_tracks);

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

    // 8. Create playlist (like Python: create_recommendations_playlist)
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const userData = await userResponse.json();

    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlist_name,
          description: 'Playlist with songs you may like - Created by TrendTracks',
          public: false
        })
      }
    );

    if (!createPlaylistResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to create playlist on Spotify' }),
        { status: createPlaylistResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newPlaylist = await createPlaylistResponse.json();
    console.log(`Created playlist: ${newPlaylist.id}`);

    // 9. Add tracks to playlist
    const trackUris = recommendations.map(t => `spotify:track:${t.track_id}`);
    
    // Add in batches of 100 (like Python)
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await fetch(
        `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: batch })
        }
      );
    }

    console.log(`Added ${trackUris.length} tracks to playlist`);

    return new Response(
      JSON.stringify({
        success: true,
        playlist_id: newPlaylist.id,
        playlist_url: newPlaylist.external_urls?.spotify,
        tracks_added: trackUris.length,
        matched_tracks: matchedTracks.length,
        recommendations: recommendations.map(t => ({
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