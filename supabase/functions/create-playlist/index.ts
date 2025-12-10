import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dataset URL - using the public CSV
const DATASET_URL = 'https://120fcb9f-fc72-47a4-8533-a7a3545ec8ce.lovableproject.com/data/dataset.csv';

interface Track {
  track_id: string;
  artists: string;
  album_name: string;
  track_name: string;
  popularity: number;
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
  track_genre: string;
}

// Parse CSV into tracks
function parseCSV(csvText: string): Track[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  const tracks: Track[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 20) continue;
    
    tracks.push({
      track_id: values[1],
      artists: values[2],
      album_name: values[3],
      track_name: values[4],
      popularity: parseFloat(values[5]) || 0,
      danceability: parseFloat(values[8]) || 0,
      energy: parseFloat(values[9]) || 0,
      key: parseFloat(values[10]) || 0,
      loudness: parseFloat(values[11]) || 0,
      mode: parseFloat(values[12]) || 0,
      speechiness: parseFloat(values[13]) || 0,
      acousticness: parseFloat(values[14]) || 0,
      instrumentalness: parseFloat(values[15]) || 0,
      liveness: parseFloat(values[16]) || 0,
      valence: parseFloat(values[17]) || 0,
      tempo: parseFloat(values[18]) || 0,
      track_genre: values[20] || 'unknown',
    });
  }
  return tracks;
}

// Normalize features to 0-1 range
function normalizeFeatures(tracks: Track[]): { tracks: Track[], mins: number[], maxs: number[] } {
  const features = ['danceability', 'energy', 'key', 'loudness', 'speechiness', 
                    'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo'];
  
  const mins = features.map(() => Infinity);
  const maxs = features.map(() => -Infinity);
  
  // Find min/max for each feature
  for (const track of tracks) {
    features.forEach((f, i) => {
      const val = (track as any)[f] as number;
      if (val < mins[i]) mins[i] = val;
      if (val > maxs[i]) maxs[i] = val;
    });
  }
  
  return { tracks, mins, maxs };
}

// Get feature vector for a track (normalized)
function getFeatureVector(track: Track, mins: number[], maxs: number[]): number[] {
  const features = ['danceability', 'energy', 'key', 'loudness', 'speechiness', 
                    'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo'];
  
  return features.map((f, i) => {
    const val = (track as any)[f] as number;
    const range = maxs[i] - mins[i];
    if (range === 0) return 0;
    return (val - mins[i]) / range;
  });
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find similar tracks using cosine similarity on audio features
function findSimilarTracks(
  userTrackIds: string[],
  allTracks: Track[],
  mins: number[],
  maxs: number[],
  excludeIds: Set<string>,
  numTracks: number
): Track[] {
  // Build a map of track_id to track
  const trackMap = new Map<string, Track>();
  for (const t of allTracks) {
    trackMap.set(t.track_id, t);
  }
  
  // Find user tracks that exist in the dataset
  const userTracksInDataset: Track[] = [];
  for (const id of userTrackIds) {
    const track = trackMap.get(id);
    if (track) {
      userTracksInDataset.push(track);
    }
  }
  
  console.log(`Found ${userTracksInDataset.length}/${userTrackIds.length} user tracks in dataset`);
  
  if (userTracksInDataset.length === 0) {
    // Fallback: get average features from genres that appear in Spotify top tracks
    console.log('No exact matches, using genre-based recommendations...');
    return getGenreBasedRecommendations(allTracks, excludeIds, numTracks);
  }
  
  // Calculate average feature vector from user's tracks
  const userVectors = userTracksInDataset.map(t => getFeatureVector(t, mins, maxs));
  const avgVector = userVectors[0].map((_, i) => 
    userVectors.reduce((sum, v) => sum + v[i], 0) / userVectors.length
  );
  
  // Get user's genres
  const userGenres = new Set(userTracksInDataset.map(t => t.track_genre));
  console.log('User genres from dataset:', Array.from(userGenres).join(', '));
  
  // Calculate similarity for all tracks
  const similarities: { track: Track; similarity: number }[] = [];
  
  for (const track of allTracks) {
    if (excludeIds.has(track.track_id)) continue;
    
    const trackVector = getFeatureVector(track, mins, maxs);
    const similarity = cosineSimilarity(avgVector, trackVector);
    
    // Boost score if same genre as user's tracks
    const genreBoost = userGenres.has(track.track_genre) ? 0.2 : 0;
    
    similarities.push({
      track,
      similarity: similarity + genreBoost
    });
  }
  
  // Sort by similarity (descending) and popularity as tiebreaker
  similarities.sort((a, b) => {
    if (Math.abs(b.similarity - a.similarity) > 0.01) {
      return b.similarity - a.similarity;
    }
    return b.track.popularity - a.track.popularity;
  });
  
  return similarities.slice(0, numTracks).map(s => s.track);
}

// Fallback: get popular tracks from common genres
function getGenreBasedRecommendations(
  allTracks: Track[],
  excludeIds: Set<string>,
  numTracks: number
): Track[] {
  // Get genre distribution
  const genrePopularity = new Map<string, { count: number; totalPop: number }>();
  
  for (const track of allTracks) {
    if (!excludeIds.has(track.track_id)) {
      const existing = genrePopularity.get(track.track_genre) || { count: 0, totalPop: 0 };
      existing.count++;
      existing.totalPop += track.popularity;
      genrePopularity.set(track.track_genre, existing);
    }
  }
  
  // Pick diverse popular tracks from top genres
  const tracks: Track[] = [];
  const usedTrackIds = new Set<string>();
  
  // Sort tracks by popularity
  const sortedTracks = allTracks
    .filter(t => !excludeIds.has(t.track_id))
    .sort((a, b) => b.popularity - a.popularity);
  
  // Get tracks from different genres
  const usedGenres = new Set<string>();
  for (const track of sortedTracks) {
    if (usedTrackIds.has(track.track_id)) continue;
    
    // Limit tracks per genre for diversity
    const genreCount = Array.from(usedGenres).filter(g => g === track.track_genre).length;
    if (genreCount >= 5) continue;
    
    tracks.push(track);
    usedTrackIds.add(track.track_id);
    usedGenres.add(track.track_genre);
    
    if (tracks.length >= numTracks) break;
  }
  
  return tracks;
}

async function fetchWithAuth(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return response;
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

    // Fetch dataset
    console.log('Fetching dataset...');
    const datasetResponse = await fetch(DATASET_URL);
    if (!datasetResponse.ok) {
      throw new Error('Failed to fetch dataset');
    }
    const csvText = await datasetResponse.text();
    const allTracks = parseCSV(csvText);
    console.log(`Loaded ${allTracks.length} tracks from dataset`);

    // Normalize features
    const { mins, maxs } = normalizeFeatures(allTracks);

    // Get user info
    const userResponse = await fetchWithAuth('https://api.spotify.com/v1/me', access_token);
    const userData = await userResponse.json();
    console.log('User:', userData.id);

    // Get user's top tracks from Spotify
    const topTracksResponse = await fetchWithAuth(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
      access_token
    );

    if (!topTracksResponse.ok) {
      console.error('Failed to fetch top tracks');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch your top tracks from Spotify' }),
        { status: topTracksResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topTracksData = await topTracksResponse.json();
    const userTopTracks = topTracksData.items || [];
    console.log(`Found ${userTopTracks.length} Spotify top tracks`);

    if (userTopTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No top tracks found. Listen to more music on Spotify!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect IDs to exclude
    const excludeIds = new Set<string>(userTopTracks.map((t: any) => t.id));
    const userTrackIds = userTopTracks.map((t: any) => t.id);

    // Find similar tracks using dataset
    console.log('Finding similar tracks using audio features...');
    const recommendations = findSimilarTracks(
      userTrackIds,
      allTracks,
      mins,
      maxs,
      excludeIds,
      num_tracks
    );

    console.log(`Found ${recommendations.length} recommendations`);

    if (recommendations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate recommendations',
          message: 'Unable to find matching tracks in the dataset.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create playlist
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
          description: 'Personalized recommendations based on audio features - Created by TrendTracks',
          public: false
        })
      }
    );

    if (!createPlaylistResponse.ok) {
      const errorText = await createPlaylistResponse.text();
      console.error('Failed to create playlist:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create playlist on Spotify' }),
        { status: createPlaylistResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newPlaylist = await createPlaylistResponse.json();
    console.log(`Created playlist: ${newPlaylist.id}`);

    // Add tracks to playlist
    const trackUris = recommendations.map(t => `spotify:track:${t.track_id}`);
    
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
