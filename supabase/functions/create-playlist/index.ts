import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dataset URL - hardcoded for edge function context
const DATASET_URL = 'https://wpczgwxsriezaubncuom.lovableproject.com/data/dataset.csv';

interface DatasetTrack {
  track_id: string;
  artists: string;
  album_name: string;
  track_name: string;
  popularity: number;
  duration_ms: number;
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
  time_signature: number;
  track_genre: string;
}

interface NormalizedTrack extends DatasetTrack {
  danceability_norm: number;
  energy_norm: number;
  key_norm: number;
  loudness_norm: number;
  mode_norm: number;
  speechiness_norm: number;
  acousticness_norm: number;
  instrumentalness_norm: number;
  liveness_norm: number;
  valence_norm: number;
  tempo_norm: number;
}

const FEATURE_COLS = [
  'danceability', 'energy', 'key', 'loudness', 'mode',
  'speechiness', 'acousticness', 'instrumentalness',
  'liveness', 'valence', 'tempo'
] as const;

async function fetchWithAuth(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return response;
}

// Parse CSV to tracks
function parseCSV(csvText: string): DatasetTrack[] {
  const lines = csvText.trim().split('\n');
  const tracks: DatasetTrack[] = [];
  
  // Skip header
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
    
    // CSV columns: index, track_id, artists, album_name, track_name, popularity, duration_ms, explicit, 
    // danceability, energy, key, loudness, mode, speechiness, acousticness, instrumentalness, 
    // liveness, valence, tempo, time_signature, track_genre
    if (values.length >= 21) {
      const track: DatasetTrack = {
        track_id: values[1],
        artists: values[2],
        album_name: values[3],
        track_name: values[4],
        popularity: parseFloat(values[5]) || 0,
        duration_ms: parseFloat(values[6]) || 0,
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
        time_signature: parseFloat(values[19]) || 4,
        track_genre: values[20] || '',
      };
      
      if (track.track_id && track.track_genre) {
        tracks.push(track);
      }
    }
  }
  
  return tracks;
}

// MinMax normalize features
function normalizeFeatures(tracks: DatasetTrack[]): { data: NormalizedTrack[], mins: Record<string, number>, maxs: Record<string, number> } {
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};
  
  // Find min/max for each feature
  for (const col of FEATURE_COLS) {
    mins[col] = Infinity;
    maxs[col] = -Infinity;
    for (const track of tracks) {
      const val = track[col as keyof DatasetTrack] as number;
      if (val < mins[col]) mins[col] = val;
      if (val > maxs[col]) maxs[col] = val;
    }
  }
  
  // Normalize
  const normalized: NormalizedTrack[] = tracks.map(track => {
    const normTrack = { ...track } as NormalizedTrack;
    for (const col of FEATURE_COLS) {
      const val = track[col as keyof DatasetTrack] as number;
      const range = maxs[col] - mins[col];
      (normTrack as any)[`${col}_norm`] = range > 0 ? (val - mins[col]) / range : 0;
    }
    return normTrack;
  });
  
  return { data: normalized, mins, maxs };
}

// Get normalized feature vector
function getFeatureVector(track: NormalizedTrack): number[] {
  return FEATURE_COLS.map(col => (track as any)[`${col}_norm`] || 0);
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
  
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dotProduct / denom : 0;
}

// Simple KMeans clustering implementation
function kMeansCluster(tracks: NormalizedTrack[], k: number, maxIterations = 10): Map<number, NormalizedTrack[]> {
  if (tracks.length === 0) return new Map();
  
  const n = tracks.length;
  k = Math.min(k, n);
  
  // Initialize centroids randomly from data points
  const centroidIndices = new Set<number>();
  while (centroidIndices.size < k) {
    centroidIndices.add(Math.floor(Math.random() * n));
  }
  let centroids = [...centroidIndices].map(i => getFeatureVector(tracks[i]));
  
  let assignments = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each point to nearest centroid
    for (let i = 0; i < n; i++) {
      const point = getFeatureVector(tracks[i]);
      let bestCluster = 0;
      let bestSim = -1;
      
      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(point, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }
      assignments[i] = bestCluster;
    }
    
    // Update centroids
    const newCentroids: number[][] = Array(k).fill(null).map(() => 
      new Array(FEATURE_COLS.length).fill(0)
    );
    const counts = new Array(k).fill(0);
    
    for (let i = 0; i < n; i++) {
      const cluster = assignments[i];
      const point = getFeatureVector(tracks[i]);
      counts[cluster]++;
      for (let j = 0; j < point.length; j++) {
        newCentroids[cluster][j] += point[j];
      }
    }
    
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < newCentroids[c].length; j++) {
          newCentroids[c][j] /= counts[c];
        }
      }
    }
    centroids = newCentroids;
  }
  
  // Group tracks by cluster
  const clusters = new Map<number, NormalizedTrack[]>();
  for (let i = 0; i < n; i++) {
    const cluster = assignments[i];
    if (!clusters.has(cluster)) clusters.set(cluster, []);
    clusters.get(cluster)!.push(tracks[i]);
  }
  
  return clusters;
}

// Build KMeans models per genre (like notebook)
function buildKMeansPerGenre(
  userGenres: string[],
  data: NormalizedTrack[],
  nClusters = 15,
  minSongsPerGenre = 100
): Map<string, { clusters: Map<number, NormalizedTrack[]>, genreTracks: NormalizedTrack[] }> {
  const genreModels = new Map<string, { clusters: Map<number, NormalizedTrack[]>, genreTracks: NormalizedTrack[] }>();
  
  for (const genre of userGenres) {
    const genreTracks = data.filter(t => t.track_genre === genre);
    
    if (genreTracks.length < minSongsPerGenre) {
      console.log(`Skipping genre ${genre}: only ${genreTracks.length} songs`);
      continue;
    }
    
    const k = Math.min(nClusters, Math.max(2, Math.floor(genreTracks.length / 5)));
    console.log(`Building ${k} clusters for genre ${genre} (${genreTracks.length} songs)`);
    
    const clusters = kMeansCluster(genreTracks, k);
    genreModels.set(genre, { clusters, genreTracks });
  }
  
  return genreModels;
}

// Get recommendations for a single track using cluster-based approach
function getRecommendationsByGenre(
  inputTrack: NormalizedTrack,
  genreModels: Map<string, { clusters: Map<number, NormalizedTrack[]>, genreTracks: NormalizedTrack[] }>,
  numRecommendations = 5
): NormalizedTrack[] {
  const inputGenre = inputTrack.track_genre;
  
  if (!genreModels.has(inputGenre)) {
    return [];
  }
  
  const { clusters, genreTracks } = genreModels.get(inputGenre)!;
  const inputVector = getFeatureVector(inputTrack);
  
  // Find which cluster the input track belongs to
  let bestCluster = 0;
  let bestSim = -1;
  
  for (const [clusterId, clusterTracks] of clusters) {
    if (clusterTracks.length === 0) continue;
    
    // Calculate cluster centroid
    const centroid = new Array(FEATURE_COLS.length).fill(0);
    for (const track of clusterTracks) {
      const vec = getFeatureVector(track);
      for (let i = 0; i < vec.length; i++) {
        centroid[i] += vec[i];
      }
    }
    for (let i = 0; i < centroid.length; i++) {
      centroid[i] /= clusterTracks.length;
    }
    
    const sim = cosineSimilarity(inputVector, centroid);
    if (sim > bestSim) {
      bestSim = sim;
      bestCluster = clusterId;
    }
  }
  
  // Get tracks from same cluster
  let clusterTracks = clusters.get(bestCluster) || [];
  
  // Exclude the input track itself
  clusterTracks = clusterTracks.filter(t => t.track_id !== inputTrack.track_id);
  
  // If not enough tracks in cluster, use all genre tracks
  if (clusterTracks.length < numRecommendations + 1) {
    clusterTracks = genreTracks.filter(t => t.track_id !== inputTrack.track_id);
  }
  
  // Sort by popularity and return top N
  clusterTracks.sort((a, b) => b.popularity - a.popularity);
  
  return clusterTracks.slice(0, numRecommendations);
}

// Get all track IDs from user's playlists
async function getAllUserPlaylistTrackIds(accessToken: string): Promise<Set<string>> {
  const knownTrackIds = new Set<string>();
  
  try {
    // Get current user
    const userResponse = await fetchWithAuth('https://api.spotify.com/v1/me', accessToken);
    const userData = await userResponse.json();
    const userId = userData.id;
    
    // Get user's playlists
    let offset = 0;
    const limit = 50;
    
    while (true) {
      const playlistsResponse = await fetchWithAuth(
        `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`,
        accessToken
      );
      
      if (!playlistsResponse.ok) break;
      
      const playlistsData = await playlistsResponse.json();
      const playlists = playlistsData.items || [];
      
      // Only process playlists owned by user
      for (const playlist of playlists) {
        if (playlist.owner?.id !== userId) continue;
        
        // Get tracks from playlist
        let trackOffset = 0;
        while (true) {
          const tracksResponse = await fetchWithAuth(
            `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100&offset=${trackOffset}`,
            accessToken
          );
          
          if (!tracksResponse.ok) break;
          
          const tracksData = await tracksResponse.json();
          const items = tracksData.items || [];
          
          for (const item of items) {
            if (item.track?.id) {
              knownTrackIds.add(item.track.id);
            }
          }
          
          if (!tracksData.next) break;
          trackOffset += 100;
          
          // Limit to avoid timeout
          if (trackOffset > 500) break;
        }
      }
      
      if (!playlistsData.next) break;
      offset += limit;
      
      // Limit to avoid timeout
      if (offset > 200) break;
    }
    
    console.log(`Found ${knownTrackIds.size} tracks in user playlists`);
  } catch (error) {
    console.error('Error fetching user playlists:', error);
  }
  
  return knownTrackIds;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, playlist_name, num_tracks = 30 } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toLocaleDateString('en-GB');
    const finalPlaylistName = playlist_name || `TrendTracks For You - ${today}`;
    console.log('Creating playlist:', finalPlaylistName);

    // Step 1: Fetch dataset
    console.log('Fetching dataset...');
    const datasetResponse = await fetch(DATASET_URL);
    if (!datasetResponse.ok) {
      console.error('Failed to fetch dataset');
      return new Response(
        JSON.stringify({ error: 'Failed to load music database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const csvText = await datasetResponse.text();
    console.log(`Dataset fetched, parsing...`);
    
    const rawTracks = parseCSV(csvText);
    console.log(`Parsed ${rawTracks.length} tracks from dataset`);

    // Step 2: Get user's top 50 tracks (short_term like notebook)
    const topTracksResponse = await fetchWithAuth(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term',
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
    console.log(`Found ${userTopTracks.length} user top tracks`);

    if (userTopTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No top tracks found. Listen to more music on Spotify!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Normalize dataset features
    console.log('Normalizing features...');
    const { data: normalizedData, mins, maxs } = normalizeFeatures(rawTracks);

    // Step 4: Merge user top tracks with dataset to get features
    const userTrackIds = userTopTracks.map((t: any) => t.id);
    const datasetTrackMap = new Map(normalizedData.map(t => [t.track_id, t]));
    
    const userTracksWithFeatures: NormalizedTrack[] = [];
    for (const userTrack of userTopTracks) {
      const datasetTrack = datasetTrackMap.get(userTrack.id);
      if (datasetTrack) {
        userTracksWithFeatures.push(datasetTrack);
      }
    }
    
    console.log(`Matched ${userTracksWithFeatures.length} user tracks with dataset`);

    // Step 5: Get unique genres from user's top tracks
    const userGenres = [...new Set(userTracksWithFeatures.map(t => t.track_genre).filter(g => g))];
    console.log(`User genres: ${userGenres.join(', ')}`);

    if (userGenres.length === 0) {
      // Fallback: get genres from artist data
      console.log('No matching tracks in dataset, using Spotify API genres...');
      return new Response(
        JSON.stringify({ error: 'Your top tracks were not found in our database. Try listening to more diverse music!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Build KMeans models per genre
    console.log('Building KMeans clusters per genre...');
    const genreModels = buildKMeansPerGenre(userGenres, normalizedData, 15, 100);

    // Step 7: Get all known track IDs from user's playlists
    console.log('Fetching user playlist tracks to exclude...');
    const knownTrackIds = await getAllUserPlaylistTrackIds(access_token);
    
    // Add user's top tracks to exclusion set
    for (const trackId of userTrackIds) {
      knownTrackIds.add(trackId);
    }

    // Step 8: Get recommendations for each user track
    console.log('Generating recommendations...');
    const allRecommendations = new Map<string, NormalizedTrack>();
    
    for (const userTrack of userTracksWithFeatures) {
      const recs = getRecommendationsByGenre(userTrack, genreModels, 10);
      
      for (const rec of recs) {
        // Skip if already known
        if (knownTrackIds.has(rec.track_id)) continue;
        
        // Add to recommendations if not already there
        if (!allRecommendations.has(rec.track_id)) {
          allRecommendations.set(rec.track_id, rec);
        }
      }
    }

    console.log(`Generated ${allRecommendations.size} unique recommendations`);

    // Sort by popularity and take top N
    const sortedRecommendations = [...allRecommendations.values()]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, num_tracks);

    console.log(`Final recommendations: ${sortedRecommendations.length}`);

    if (sortedRecommendations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not generate recommendations based on your listening history' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 9: Get user info for playlist creation
    const userResponse = await fetchWithAuth('https://api.spotify.com/v1/me', access_token);
    const userData = await userResponse.json();

    // Step 10: Create playlist
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalPlaylistName,
          description: `ML-based recommendations from genres: ${userGenres.slice(0, 5).join(', ')} - Created by TrendTracks`,
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

    // Step 11: Add tracks to playlist in batches
    const trackUris = sortedRecommendations.map(t => `spotify:track:${t.track_id}`);

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
        genres_used: userGenres.slice(0, 5),
        recommendations: sortedRecommendations.slice(0, 10).map(t => ({
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
