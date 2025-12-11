import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATASET_URL = 'https://120fcb9f-fc72-47a4-8533-a7a3545ec8ce.lovableproject.com/data/dataset.csv';

// HARDCODED SEED TRACKS FROM playlist_juan.csv (45 tracks)
const SEED_TRACKS = [
  { track_id: "6dGnYIeXmHdcikdzNNDMm2", track_name: "Here Comes The Sun - Remastered 2009", artists: "The Beatles", album_name: "Abbey Road (Remastered)", track_genre: "psych-rock", popularity: 82 },
  { track_id: "6GG73Jik4jUlQCkKg9JuGO", track_name: "The Middle", artists: "Jimmy Eat World", album_name: "Bleed American", track_genre: "punk-rock", popularity: 81 },
  { track_id: "7B3z0ySL9Rr0XvZEAjWZzM", track_name: "Sofia", artists: "Clairo", album_name: "Immunity", track_genre: "indie-pop", popularity: 81 },
  { track_id: "4EchqUKQ3qAQuRNKmeIpnf", track_name: "The Kids Aren't Alright", artists: "The Offspring", album_name: "Americana", track_genre: "punk-rock", popularity: 81 },
  { track_id: "2IVsRhKrx8hlQBOWy4qebo", track_name: "Mr Loverman", artists: "Ricky Montgomery", album_name: "Montgomery Ricky", track_genre: "indie-pop", popularity: 79 },
  { track_id: "4qbEaaJ29p32GI8EWQmm6R", track_name: "dumb dumb", artists: "mazie", album_name: "the rainbow cassette", track_genre: "indie-pop", popularity: 79 },
  { track_id: "7DcJ6fEBb7BaKuYKTwiDxK", track_name: "Homage", artists: "Mild High Club", album_name: "Skiptracing", track_genre: "psych-rock", popularity: 78 },
  { track_id: "1i6N76fftMZhijOzFQ5ZtL", track_name: "Psycho Killer - 2005 Remaster", artists: "Talking Heads", album_name: "Talking Heads '77 (Deluxe Version)", track_genre: "punk-rock", popularity: 78 },
  { track_id: "5ln5yQdUywVbf8HhFsOcd6", track_name: "Walls Could Talk", artists: "Halsey", album_name: "hopeless fountain kingdom (Deluxe)", track_genre: "indie-pop", popularity: 77 },
  { track_id: "6mFkJmJqdDVQ1REhVfGgd1", track_name: "Wish You Were Here", artists: "Pink Floyd", album_name: "Wish You Were Here", track_genre: "psych-rock", popularity: 77 },
  { track_id: "1fJFuvU2ldmeAm5nFIHcPP", track_name: "First Date", artists: "blink-182", album_name: "Take Off Your Pants And Jacket", track_genre: "punk-rock", popularity: 77 },
  { track_id: "3BQHpFgAp4l80e1XslIjNI", track_name: "Yesterday - Remastered 2009", artists: "The Beatles", album_name: "Help! (Remastered)", track_genre: "psych-rock", popularity: 76 },
  { track_id: "6UFivO2zqqPFPoQYsEMuCc", track_name: "Bags", artists: "Clairo", album_name: "Immunity", track_genre: "indie-pop", popularity: 75 },
  { track_id: "3Pzh926pXggbMe2ZpXyMV7", track_name: "Ain't No Rest for the Wicked", artists: "Cage The Elephant", album_name: "Cage The Elephant (Expanded Edition)", track_genre: "punk-rock", popularity: 74 },
  { track_id: "5jgFfDIR6FR0gvlA56Nakr", track_name: "Blackbird - Remastered 2009", artists: "The Beatles", album_name: "The Beatles (Remastered)", track_genre: "psych-rock", popularity: 74 },
  { track_id: "2i0AUcEnsDm3dsqLrFWUCq", track_name: "Tonight Tonight", artists: "Hot Chelle Rae", album_name: "Whatever", track_genre: "punk-rock", popularity: 73 },
  { track_id: "7CFfqRW50ffULvBv7lfIIg", track_name: "Violent", artists: "carolesdaughter", album_name: "Violent", track_genre: "indie-pop", popularity: 72 },
  { track_id: "3JiaA3hvuKu4Fjf6AWwVMX", track_name: "Difficult", artists: "Gracie Abrams", album_name: "Difficult", track_genre: "indie-pop", popularity: 72 },
  { track_id: "7aGyRfJWtLqgJaZoG9lJhE", track_name: "Mad at Disney", artists: "salem ilese", album_name: "Mad at Disney", track_genre: "indie-pop", popularity: 72 },
  { track_id: "27hhIs2fp6w06N5zx4Eaa5", track_name: "Dream A Little Dream Of Me", artists: "The Mamas & The Papas", album_name: "The Papas & The Mamas", track_genre: "psych-rock", popularity: 72 },
  { track_id: "5oQcOu1omDykbIPSdSQQNJ", track_name: "1985", artists: "Bowling For Soup", album_name: "A Hangover You Don't Deserve", track_genre: "punk-rock", popularity: 71 },
  { track_id: "0cKk8BKEi7zXbdrYdyqBP5", track_name: "Behind Blue Eyes", artists: "The Who", album_name: "Who's Next (Deluxe Edition)", track_genre: "psych-rock", popularity: 71 },
  { track_id: "2ctvdKmETyOzPb2GiJJT53", track_name: "Breathe (In the Air)", artists: "Pink Floyd", album_name: "The Dark Side of the Moon", track_genre: "psych-rock", popularity: 71 },
  { track_id: "2CJc3U1pViZ5E44pA0f2YI", track_name: "Common", artists: "Quinn XCII;Big Sean", album_name: "Common", track_genre: "indie-pop", popularity: 70 },
  { track_id: "5gb9UJkh8TfrNMRYOJNbew", track_name: "Gives You Hell", artists: "The All-American Rejects", album_name: "When The World Comes Down", track_genre: "punk-rock", popularity: 70 },
  { track_id: "7uEcCGtM1FBBGIhPozhJjv", track_name: "Daydream Believer", artists: "The Monkees", album_name: "The Birds, The Bees, & The Monkees", track_genre: "psych-rock", popularity: 70 },
  { track_id: "73W5aXorr5vxrySFcoZqIN", track_name: "Renegade", artists: "Big Red Machine;Taylor Swift", album_name: "How Long Do You Think It's Gonna Last?", track_genre: "indie-pop", popularity: 69 },
  { track_id: "1UKobFsdqNXQb8OthimCKe", track_name: "Helplessly Hoping - 2005 Remaster", artists: "Crosby, Stills & Nash", album_name: "Crosby, Stills & Nash", track_genre: "psych-rock", popularity: 68 },
  { track_id: "2hitsKa8SthKhRJBXUHbIv", track_name: "Our House", artists: "Crosby, Stills, Nash & Young", album_name: "Deja Vu", track_genre: "psych-rock", popularity: 68 },
  { track_id: "6iGU74CwXuT4XVepjc9Emf", track_name: "God Only Knows", artists: "The Beach Boys", album_name: "Pet Sounds", track_genre: "psych-rock", popularity: 68 },
  { track_id: "6L5BZEcZmD6RBJnimzlyKr", track_name: "Nights In White Satin", artists: "The Moody Blues", album_name: "Days Of Future Passed", track_genre: "psych-rock", popularity: 68 },
  { track_id: "6pnwfWyaWjQiHCKTiZLItr", track_name: "Shine On You Crazy Diamond (Pts. 1-5)", artists: "Pink Floyd", album_name: "Wish You Were Here", track_genre: "psych-rock", popularity: 67 },
  { track_id: "4TOMI010Sd4ZAX4aZ5TS85", track_name: "Perfect Day", artists: "Lou Reed", album_name: "Transformer", track_genre: "psych-rock", popularity: 67 },
  { track_id: "6yLIqXX9edg1x0HZS7cZEv", track_name: "The Air That I Breathe", artists: "The Hollies", album_name: "Hollies", track_genre: "psych-rock", popularity: 66 },
  { track_id: "11VwZwNF29HrqwalYUMitb", track_name: "Pale Blue Eyes", artists: "The Velvet Underground", album_name: "The Velvet Underground", track_genre: "psych-rock", popularity: 65 },
  { track_id: "11607FzqoipskTsXrwEHnJ", track_name: "Sunday Morning", artists: "The Velvet Underground", album_name: "The Velvet Underground & Nico", track_genre: "psych-rock", popularity: 65 },
  { track_id: "3mlMpmY8oZIBFc39D9zLbh", track_name: "The Long And Winding Road", artists: "The Beatles", album_name: "Let It Be (Remastered)", track_genre: "psych-rock", popularity: 64 },
  { track_id: "0WNGPpmWqzPnk0psUhJ3SX", track_name: "All the Young Dudes", artists: "Mott The Hoople", album_name: "All The Young Dudes", track_genre: "psych-rock", popularity: 64 },
  { track_id: "2O3l4X1yTua8oMMCtazkyo", track_name: "The Happiest Days of Our Lives", artists: "Pink Floyd", album_name: "The Wall", track_genre: "psych-rock", popularity: 59 },
  { track_id: "0vMr3GXZJi1IIIWE8bBJuZ", track_name: "Plants", artists: "Crumb", album_name: "Locket", track_genre: "psych-rock", popularity: 59 },
  { track_id: "0B6oBwvkyLptGexpwJVz7c", track_name: "Balloon", artists: "Crumb", album_name: "Ice Melt", track_genre: "psych-rock", popularity: 59 },
  { track_id: "60ifqqPhbselSwXyGrGyMK", track_name: "Soldier Of Fortune", artists: "Deep Purple", album_name: "Stormbringer", track_genre: "psych-rock", popularity: 59 },
  { track_id: "21j1PsCiTaO8ZW88UZrh3A", track_name: "Shine On You Crazy Diamond (Pts. 6-9)", artists: "Pink Floyd", album_name: "Wish You Were Here", track_genre: "psych-rock", popularity: 58 },
  { track_id: "54qG9hpUjLgkgTJQ9qvB1P", track_name: "Dear Angie", artists: "Badfinger", album_name: "Magic Christian Music", track_genre: "psych-rock", popularity: 58 },
  { track_id: "5a4MgIUSf9K8wXLSm6xPEx", track_name: "High Hopes", artists: "Pink Floyd", album_name: "The Division Bell", track_genre: "psych-rock", popularity: 57 },
];

const FEATURE_COLUMNS = ["danceability", "energy", "key", "loudness", "mode", "speechiness", "acousticness", "instrumentalness", "liveness", "valence", "tempo"];

function prepare_kaggle_data(raw_kaggle: any[]) {
  let data = raw_kaggle.filter(row => {
    if (!row.track_genre) return false;
    for (const col of FEATURE_COLUMNS) {
      if (row[col] === null || row[col] === undefined || isNaN(row[col])) return false;
    }
    return true;
  });

  const mins: Record<string, number> = {}, maxs: Record<string, number> = {};
  for (const col of FEATURE_COLUMNS) {
    mins[col] = Infinity; maxs[col] = -Infinity;
    for (const row of data) {
      const val = parseFloat(row[col]);
      if (val < mins[col]) mins[col] = val;
      if (val > maxs[col]) maxs[col] = val;
    }
  }

  const normalized_columns = FEATURE_COLUMNS.map(c => `${c}_norm`);
  for (const row of data) {
    for (let i = 0; i < FEATURE_COLUMNS.length; i++) {
      const col = FEATURE_COLUMNS[i], norm_col = normalized_columns[i];
      const val = parseFloat(row[col]), range = maxs[col] - mins[col];
      row[norm_col] = range > 0 ? (val - mins[col]) / range : 0;
    }
  }
  return { data, normalized_columns };
}

class KMeans {
  n_clusters: number; random_state: number; n_init: number; cluster_centers_: number[][] = [];
  constructor(n_clusters: number, random_state = 42, n_init = 10) {
    this.n_clusters = n_clusters; this.random_state = random_state; this.n_init = n_init;
  }
  private seededRandom(seed: number) { return function() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
  fit(X: number[][]) {
    const n_samples = X.length, n_features = X[0].length, k = Math.min(this.n_clusters, n_samples);
    let best_inertia = Infinity, best_centers: number[][] = [];
    for (let init = 0; init < this.n_init; init++) {
      const random = this.seededRandom(this.random_state + init);
      const centroid_indices: number[] = [];
      while (centroid_indices.length < k) { const idx = Math.floor(random() * n_samples); if (!centroid_indices.includes(idx)) centroid_indices.push(idx); }
      let centroids = centroid_indices.map(i => [...X[i]]), labels = new Array(n_samples).fill(0);
      for (let iter = 0; iter < 100; iter++) {
        const prev_labels = [...labels];
        for (let i = 0; i < n_samples; i++) {
          let best_cluster = 0, best_dist = Infinity;
          for (let c = 0; c < k; c++) { let dist = 0; for (let f = 0; f < n_features; f++) dist += Math.pow(X[i][f] - centroids[c][f], 2); if (dist < best_dist) { best_dist = dist; best_cluster = c; } }
          labels[i] = best_cluster;
        }
        let converged = true; for (let i = 0; i < n_samples; i++) if (labels[i] !== prev_labels[i]) { converged = false; break; }
        if (converged) break;
        const new_centroids = Array(k).fill(null).map(() => new Array(n_features).fill(0)), counts = new Array(k).fill(0);
        for (let i = 0; i < n_samples; i++) { counts[labels[i]]++; for (let f = 0; f < n_features; f++) new_centroids[labels[i]][f] += X[i][f]; }
        for (let c = 0; c < k; c++) if (counts[c] > 0) for (let f = 0; f < n_features; f++) new_centroids[c][f] /= counts[c];
        centroids = new_centroids;
      }
      let inertia = 0; for (let i = 0; i < n_samples; i++) for (let f = 0; f < n_features; f++) inertia += Math.pow(X[i][f] - centroids[labels[i]][f], 2);
      if (inertia < best_inertia) { best_inertia = inertia; best_centers = centroids; }
    }
    this.cluster_centers_ = best_centers;
  }
  predict(X: number[][]) {
    const labels: number[] = [], n_features = X[0].length;
    for (const point of X) {
      let best_cluster = 0, best_dist = Infinity;
      for (let c = 0; c < this.cluster_centers_.length; c++) { let dist = 0; for (let f = 0; f < n_features; f++) dist += Math.pow(point[f] - this.cluster_centers_[c][f], 2); if (dist < best_dist) { best_dist = dist; best_cluster = c; } }
      labels.push(best_cluster);
    }
    return labels;
  }
}

function build_kmeans_per_genre(top_songs_clean: any[], data: any[], normalized_columns: string[], n_clusters = 15, min_songs = 100) {
  const user_genres = [...new Set(top_songs_clean.map(r => r.track_genre).filter(Boolean))];
  console.log(`Genres in seed tracks: ${user_genres.join(', ')}`);
  const genre_kmeans = new Map<string, KMeans>();
  for (const genre of user_genres) {
    const idx = data.map((r, i) => r.track_genre === genre ? i : -1).filter(i => i >= 0);
    if (idx.length < min_songs) { console.log(`  ✗ ${genre}: ${idx.length} songs (<${min_songs})`); continue; }
    const X = idx.map(i => normalized_columns.map(col => data[i][col] || 0));
    const k = Math.min(n_clusters, Math.max(2, Math.floor(idx.length / 5)));
    const kmeans = new KMeans(k, 42, 10); kmeans.fit(X);
    genre_kmeans.set(genre, kmeans);
    console.log(`  ✓ ${genre}: ${idx.length} songs -> ${k} clusters`);
  }
  return genre_kmeans;
}

function get_recommendations(top_tracks: any[], data: any[], genre_kmeans: Map<string, KMeans>, normalized_columns: string[], recs_per_song = 10) {
  const all_recs: any[] = [];
  for (const track of top_tracks) {
    const input_idx = data.findIndex(r => r.track_id === track.track_id);
    if (input_idx === -1 || !genre_kmeans.has(data[input_idx].track_genre)) continue;
    const input_song = data[input_idx], kmeans = genre_kmeans.get(input_song.track_genre)!;
    const input_features = normalized_columns.map(col => input_song[col] || 0);
    const input_cluster = kmeans.predict([input_features])[0];
    const genre_data = data.filter(r => r.track_genre === input_song.track_genre);
    const genre_X = genre_data.map(r => normalized_columns.map(col => r[col] || 0));
    const cluster_labels = kmeans.predict(genre_X);
    let cluster_data = genre_data.filter((_, i) => cluster_labels[i] === input_cluster);
    if (cluster_data.length < recs_per_song + 1) cluster_data = genre_data;
    cluster_data = cluster_data.filter(r => r.track_id !== track.track_id).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    all_recs.push(...cluster_data.slice(0, recs_per_song));
  }
  const seen = new Set<string>(), unique: any[] = [];
  for (const r of all_recs) if (!seen.has(r.track_id)) { seen.add(r.track_id); unique.push(r); }
  const top_ids = new Set(top_tracks.map(t => t.track_id));
  return unique.filter(r => !top_ids.has(r.track_id)).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  console.log(`CSV has ${lines.length} lines`);
  
  // Parse headers - skip empty first column (pandas index)
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log(`Raw headers sample: ${rawHeaders.slice(0, 5).join(', ')}`);
  
  const tracks: any[] = [];
  const numericCols = ['popularity','duration_ms','danceability','energy','key','loudness','mode','speechiness','acousticness','instrumentalness','liveness','valence','tempo','time_signature'];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values: string[] = []; 
    let current = '', inQuotes = false;
    for (const char of lines[i]) { 
      if (char === '"') inQuotes = !inQuotes; 
      else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/"/g, '')); current = ''; } 
      else current += char; 
    }
    values.push(current.trim().replace(/"/g, ''));
    
    const track: any = {};
    rawHeaders.forEach((h, idx) => { 
      if (!h) return; // Skip empty header (index column)
      const v = values[idx] || ''; 
      track[h] = numericCols.includes(h) ? parseFloat(v) || 0 : v; 
    });
    
    if (track.track_id && track.track_id.length > 0) {
      tracks.push(track);
    }
  }
  
  if (tracks.length > 0) {
    console.log(`Sample track_id: "${tracks[0].track_id}" (len: ${tracks[0].track_id?.length})`);
  }
  
  return tracks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { access_token, playlist_name, num_tracks = 30 } = await req.json();
    if (!access_token) return new Response(JSON.stringify({ error: 'Access token required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log('=== Starting playlist creation ===');
    console.log(`Fetching dataset from: ${DATASET_URL}`);
    const datasetResponse = await fetch(DATASET_URL);
    console.log(`Dataset response status: ${datasetResponse.status}`);
    if (!datasetResponse.ok) throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
    const csvText = await datasetResponse.text();
    console.log(`CSV text length: ${csvText.length} chars`);
    const raw_kaggle = parseCSV(csvText);
    console.log(`Loaded ${raw_kaggle.length} tracks from CSV`);

    const { data, normalized_columns } = prepare_kaggle_data(raw_kaggle);
    console.log(`Prepared ${data.length} tracks with features`);

    const seedTrackIds = new Set(SEED_TRACKS.map(t => t.track_id));
    console.log(`Looking for ${seedTrackIds.size} seed track IDs`);
    console.log(`Sample seed ID: "${SEED_TRACKS[0].track_id}"`);
    
    const top_songs_clean = data.filter(row => seedTrackIds.has(row.track_id));
    console.log(`Matched ${top_songs_clean.length} of ${SEED_TRACKS.length} seed tracks`);
    
    if (top_songs_clean.length === 0) {
      // Debug: try to find any matching track
      const testId = "6dGnYIeXmHdcikdzNNDMm2";
      const found = data.find(t => t.track_id === testId);
      console.log(`Manual test for "${testId}": ${found ? 'FOUND' : 'NOT FOUND'}`);
      if (data.length > 0) {
        console.log(`First 3 dataset track_ids: ${data.slice(0,3).map(t => `"${t.track_id}"`).join(', ')}`);
      }
      throw new Error('No seed tracks found in dataset');
    }

    const genre_kmeans = build_kmeans_per_genre(top_songs_clean, data, normalized_columns, 15, 100);
    if (genre_kmeans.size === 0) throw new Error('Could not build any genre models');

    const recommendations = get_recommendations(top_songs_clean, data, genre_kmeans, normalized_columns, 10);
    const finalRecs = recommendations.slice(0, num_tracks);
    console.log(`Final recommendations: ${finalRecs.length}`);
    if (finalRecs.length === 0) throw new Error('Could not generate recommendations');

    const userResponse = await fetch('https://api.spotify.com/v1/me', { headers: { 'Authorization': `Bearer ${access_token}` } });
    if (!userResponse.ok) throw new Error('Failed to get user info');
    const user_id = (await userResponse.json()).id;
    const finalPlaylistName = playlist_name || `TrendTracks For You - ${new Date().toLocaleDateString('en-GB')}`;

    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: finalPlaylistName, description: 'Playlist with songs you may like - Created by TrendTracks', public: false })
    });
    if (!createPlaylistResponse.ok) throw new Error(`Failed to create playlist: ${await createPlaylistResponse.text()}`);
    const playlist = await createPlaylistResponse.json();

    const uris = finalRecs.map(t => `spotify:track:${t.track_id}`);
    for (let i = 0; i < uris.length; i += 100) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: uris.slice(i, i + 100) })
      });
    }
    console.log(`${finalRecs.length} songs added to playlist`);

    return new Response(JSON.stringify({
      success: true, playlist_id: playlist.id, playlist_url: playlist.external_urls?.spotify, tracks_added: finalRecs.length,
      genres_used: [...genre_kmeans.keys()], matched_seed_tracks: top_songs_clean.length,
      recommendations: finalRecs.slice(0, 10).map(t => ({ id: t.track_id, name: t.track_name, artist: t.artists, genre: t.track_genre, popularity: t.popularity }))
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create playlist' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
