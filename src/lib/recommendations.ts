import { Track } from './csvParser';

const FEATURE_COLUMNS = [
  "danceability", "energy", "key", "loudness", "mode",
  "speechiness", "acousticness", "instrumentalness",
  "liveness", "valence", "tempo"
] as const;

// HARDCODED SEED TRACKS (45 tracks covering psych-rock, punk-rock, indie-pop)
export const SEED_TRACKS = [
  { track_id: "6dGnYIeXmHdcikdzNNDMm2", track_name: "Here Comes The Sun - Remastered 2009", artists: "The Beatles", track_genre: "psych-rock" },
  { track_id: "6GG73Jik4jUlQCkKg9JuGO", track_name: "The Middle", artists: "Jimmy Eat World", track_genre: "punk-rock" },
  { track_id: "7B3z0ySL9Rr0XvZEAjWZzM", track_name: "Sofia", artists: "Clairo", track_genre: "indie-pop" },
  { track_id: "4EchqUKQ3qAQuRNKmeIpnf", track_name: "The Kids Aren't Alright", artists: "The Offspring", track_genre: "punk-rock" },
  { track_id: "2IVsRhKrx8hlQBOWy4qebo", track_name: "Mr Loverman", artists: "Ricky Montgomery", track_genre: "indie-pop" },
  { track_id: "4qbEaaJ29p32GI8EWQmm6R", track_name: "dumb dumb", artists: "mazie", track_genre: "indie-pop" },
  { track_id: "7DcJ6fEBb7BaKuYKTwiDxK", track_name: "Homage", artists: "Mild High Club", track_genre: "psych-rock" },
  { track_id: "1i6N76fftMZhijOzFQ5ZtL", track_name: "Psycho Killer - 2005 Remaster", artists: "Talking Heads", track_genre: "punk-rock" },
  { track_id: "5ln5yQdUywVbf8HhFsOcd6", track_name: "Walls Could Talk", artists: "Halsey", track_genre: "indie-pop" },
  { track_id: "6mFkJmJqdDVQ1REhVfGgd1", track_name: "Wish You Were Here", artists: "Pink Floyd", track_genre: "psych-rock" },
  { track_id: "1fJFuvU2ldmeAm5nFIHcPP", track_name: "First Date", artists: "blink-182", track_genre: "punk-rock" },
  { track_id: "3BQHpFgAp4l80e1XslIjNI", track_name: "Yesterday - Remastered 2009", artists: "The Beatles", track_genre: "psych-rock" },
  { track_id: "6UFivO2zqqPFPoQYsEMuCc", track_name: "Bags", artists: "Clairo", track_genre: "indie-pop" },
  { track_id: "3Pzh926pXggbMe2ZpXyMV7", track_name: "Ain't No Rest for the Wicked", artists: "Cage The Elephant", track_genre: "punk-rock" },
  { track_id: "5jgFfDIR6FR0gvlA56Nakr", track_name: "Blackbird - Remastered 2009", artists: "The Beatles", track_genre: "psych-rock" },
  { track_id: "2i0AUcEnsDm3dsqLrFWUCq", track_name: "Tonight Tonight", artists: "Hot Chelle Rae", track_genre: "punk-rock" },
  { track_id: "7CFfqRW50ffULvBv7lfIIg", track_name: "Violent", artists: "carolesdaughter", track_genre: "indie-pop" },
  { track_id: "3JiaA3hvuKu4Fjf6AWwVMX", track_name: "Difficult", artists: "Gracie Abrams", track_genre: "indie-pop" },
  { track_id: "7aGyRfJWtLqgJaZoG9lJhE", track_name: "Mad at Disney", artists: "salem ilese", track_genre: "indie-pop" },
  { track_id: "27hhIs2fp6w06N5zx4Eaa5", track_name: "Dream A Little Dream Of Me", artists: "The Mamas & The Papas", track_genre: "psych-rock" },
];

interface NormalizedTrack extends Track {
  [key: string]: number | string | boolean;
}

// Normalize features using min/max scaling
function normalizeFeatures(tracks: Track[]): { data: NormalizedTrack[]; mins: Record<string, number>; maxs: Record<string, number> } {
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};

  for (const col of FEATURE_COLUMNS) {
    mins[col] = Infinity;
    maxs[col] = -Infinity;
    for (const track of tracks) {
      const val = track[col as keyof Track] as number;
      if (val < mins[col]) mins[col] = val;
      if (val > maxs[col]) maxs[col] = val;
    }
  }

  const data: NormalizedTrack[] = tracks.map(track => {
    const normalized: NormalizedTrack = { ...track } as NormalizedTrack;
    for (const col of FEATURE_COLUMNS) {
      const val = track[col as keyof Track] as number;
      const range = maxs[col] - mins[col];
      normalized[`${col}_norm`] = range > 0 ? (val - mins[col]) / range : 0;
    }
    return normalized;
  });

  return { data, mins, maxs };
}

// Simple KMeans implementation
class KMeans {
  n_clusters: number;
  cluster_centers_: number[][] = [];

  constructor(n_clusters: number) {
    this.n_clusters = n_clusters;
  }

  private seededRandom(seed: number) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  fit(X: number[][]): void {
    const n_samples = X.length;
    const n_features = X[0].length;
    const k = Math.min(this.n_clusters, n_samples);
    const random = this.seededRandom(42);

    // Initialize centroids randomly
    const indices: number[] = [];
    while (indices.length < k) {
      const idx = Math.floor(random() * n_samples);
      if (!indices.includes(idx)) indices.push(idx);
    }
    let centroids = indices.map(i => [...X[i]]);

    // Iterate until convergence
    for (let iter = 0; iter < 50; iter++) {
      const labels = this.predict(X);
      
      // Update centroids
      const newCentroids: number[][] = Array(k).fill(null).map(() => new Array(n_features).fill(0));
      const counts = new Array(k).fill(0);

      for (let i = 0; i < n_samples; i++) {
        const c = labels[i];
        counts[c]++;
        for (let f = 0; f < n_features; f++) {
          newCentroids[c][f] += X[i][f];
        }
      }

      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          for (let f = 0; f < n_features; f++) {
            newCentroids[c][f] /= counts[c];
          }
        }
      }
      centroids = newCentroids;
    }

    this.cluster_centers_ = centroids;
  }

  predict(X: number[][]): number[] {
    return X.map(point => {
      let bestCluster = 0;
      let bestDist = Infinity;

      for (let c = 0; c < this.cluster_centers_.length; c++) {
        let dist = 0;
        for (let f = 0; f < point.length; f++) {
          dist += Math.pow(point[f] - this.cluster_centers_[c][f], 2);
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }
      return bestCluster;
    });
  }
}

// Generate recommendations based on seed tracks
export function generateRecommendations(
  allTracks: Track[],
  numRecommendations: number = 30
): { track_id: string; track_name: string; artists: string; track_genre: string; popularity: number }[] {
  console.log(`Generating recommendations from ${allTracks.length} tracks`);

  // Filter and normalize data
  const validTracks = allTracks.filter(t => t.track_genre && t.track_id);
  const { data } = normalizeFeatures(validTracks);
  console.log(`Normalized ${data.length} tracks`);

  // Find seed tracks in dataset
  const seedIds = new Set(SEED_TRACKS.map(s => s.track_id));
  const matchedSeeds = data.filter(t => seedIds.has(t.track_id));
  console.log(`Matched ${matchedSeeds.length} of ${SEED_TRACKS.length} seed tracks`);

  if (matchedSeeds.length === 0) {
    console.warn('No seed tracks found, using genre-based fallback');
    // Fallback: use tracks from seed genres
    const seedGenres = new Set(SEED_TRACKS.map(s => s.track_genre));
    return data
      .filter(t => seedGenres.has(t.track_genre))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, numRecommendations)
      .map(t => ({
        track_id: t.track_id,
        track_name: t.track_name,
        artists: t.artists,
        track_genre: t.track_genre,
        popularity: t.popularity
      }));
  }

  // Get genres from matched seeds
  const userGenres = [...new Set(matchedSeeds.map(t => t.track_genre))];
  console.log(`User genres: ${userGenres.join(', ')}`);

  // Build KMeans per genre
  const genreModels = new Map<string, { kmeans: KMeans; tracks: NormalizedTrack[] }>();
  const normalizedColumns = FEATURE_COLUMNS.map(c => `${c}_norm`);

  for (const genre of userGenres) {
    const genreTracks = data.filter(t => t.track_genre === genre);
    if (genreTracks.length < 50) continue;

    const X = genreTracks.map(t => normalizedColumns.map(col => t[col] as number));
    const k = Math.min(10, Math.max(2, Math.floor(genreTracks.length / 20)));
    
    const kmeans = new KMeans(k);
    kmeans.fit(X);
    genreModels.set(genre, { kmeans, tracks: genreTracks });
    console.log(`Built KMeans for ${genre}: ${genreTracks.length} tracks, ${k} clusters`);
  }

  // Generate recommendations
  const allRecs: NormalizedTrack[] = [];

  for (const seedTrack of matchedSeeds) {
    const genre = seedTrack.track_genre;
    const model = genreModels.get(genre);
    if (!model) continue;

    const { kmeans, tracks: genreTracks } = model;
    const seedFeatures = normalizedColumns.map(col => seedTrack[col] as number);
    const seedCluster = kmeans.predict([seedFeatures])[0];

    // Get cluster labels for all genre tracks
    const X = genreTracks.map(t => normalizedColumns.map(col => t[col] as number));
    const labels = kmeans.predict(X);

    // Get tracks in same cluster
    const clusterTracks = genreTracks.filter((_, i) => labels[i] === seedCluster);
    
    // Add top tracks from cluster
    const sorted = clusterTracks
      .filter(t => t.track_id !== seedTrack.track_id)
      .sort((a, b) => b.popularity - a.popularity);
    
    allRecs.push(...sorted.slice(0, 5));
  }

  // Deduplicate and filter
  const seen = new Set<string>();
  const unique: NormalizedTrack[] = [];
  for (const rec of allRecs) {
    if (!seen.has(rec.track_id) && !seedIds.has(rec.track_id)) {
      seen.add(rec.track_id);
      unique.push(rec);
    }
  }

  // Sort by popularity and return
  return unique
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, numRecommendations)
    .map(t => ({
      track_id: t.track_id,
      track_name: t.track_name,
      artists: t.artists,
      track_genre: t.track_genre,
      popularity: t.popularity
    }));
}
