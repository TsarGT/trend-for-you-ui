export interface Track {
  track_id: string;
  artists: string;
  album_name: string;
  track_name: string;
  popularity: number;
  duration_ms: number;
  explicit: boolean;
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

export function parseCSV(csvText: string): Track[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      track_id: values[1],
      artists: values[2],
      album_name: values[3],
      track_name: values[4],
      popularity: parseFloat(values[5]) || 0,
      duration_ms: parseFloat(values[6]) || 0,
      explicit: values[7] === 'True',
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
      time_signature: parseFloat(values[19]) || 0,
      track_genre: values[20],
    };
  });
}

export function computeStats(tracks: Track[]) {
  const totalTracks = tracks.length;
  
  // Genre distribution
  const genreCounts: Record<string, number> = {};
  tracks.forEach(track => {
    genreCounts[track.track_genre] = (genreCounts[track.track_genre] || 0) + 1;
  });
  
  const genreColors = [
    "hsl(141, 76%, 48%)", "hsl(200, 76%, 48%)", "hsl(340, 76%, 48%)",
    "hsl(280, 76%, 48%)", "hsl(50, 76%, 48%)", "hsl(180, 76%, 48%)",
    "hsl(20, 76%, 48%)", "hsl(100, 76%, 48%)", "hsl(260, 76%, 48%)",
    "hsl(320, 76%, 48%)"
  ];
  
  const genreDistribution = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((entry, i) => ({
      name: entry[0],
      value: entry[1],
      color: genreColors[i % genreColors.length]
    }));
  
  const uniqueGenres = Object.keys(genreCounts).length;
  
  // Average audio features
  const avgDanceability = tracks.reduce((sum, t) => sum + t.danceability, 0) / totalTracks;
  const avgEnergy = tracks.reduce((sum, t) => sum + t.energy, 0) / totalTracks;
  const avgSpeechiness = tracks.reduce((sum, t) => sum + t.speechiness, 0) / totalTracks;
  const avgAcousticness = tracks.reduce((sum, t) => sum + t.acousticness, 0) / totalTracks;
  const avgInstrumentalness = tracks.reduce((sum, t) => sum + t.instrumentalness, 0) / totalTracks;
  const avgLiveness = tracks.reduce((sum, t) => sum + t.liveness, 0) / totalTracks;
  const avgValence = tracks.reduce((sum, t) => sum + t.valence, 0) / totalTracks;
  
  const audioFeatures = [
    { feature: "Danceability", average: avgDanceability, fullMark: 1 },
    { feature: "Energy", average: avgEnergy, fullMark: 1 },
    { feature: "Speechiness", average: avgSpeechiness, fullMark: 1 },
    { feature: "Acousticness", average: avgAcousticness, fullMark: 1 },
    { feature: "Instrumentalness", average: avgInstrumentalness, fullMark: 1 },
    { feature: "Liveness", average: avgLiveness, fullMark: 1 },
    { feature: "Valence", average: avgValence, fullMark: 1 },
  ];
  
  // Popularity distribution
  const popularityBuckets = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  tracks.forEach(track => {
    if (track.popularity <= 20) popularityBuckets["0-20"]++;
    else if (track.popularity <= 40) popularityBuckets["21-40"]++;
    else if (track.popularity <= 60) popularityBuckets["41-60"]++;
    else if (track.popularity <= 80) popularityBuckets["61-80"]++;
    else popularityBuckets["81-100"]++;
  });
  
  const popularityDistribution = Object.entries(popularityBuckets).map(([range, count]) => ({
    range,
    count
  }));
  
  // Tempo distribution
  const tempoBuckets = { "60-80": 0, "80-100": 0, "100-120": 0, "120-140": 0, "140-160": 0, "160+": 0 };
  tracks.forEach(track => {
    if (track.tempo < 80) tempoBuckets["60-80"]++;
    else if (track.tempo < 100) tempoBuckets["80-100"]++;
    else if (track.tempo < 120) tempoBuckets["100-120"]++;
    else if (track.tempo < 140) tempoBuckets["120-140"]++;
    else if (track.tempo < 160) tempoBuckets["140-160"]++;
    else tempoBuckets["160+"]++;
  });
  
  const tempoDistribution = Object.entries(tempoBuckets).map(([tempo, count]) => ({
    tempo,
    count
  }));
  
  // Energy vs Danceability by genre (sample points)
  const genreAvgs: Record<string, { energy: number; danceability: number; count: number }> = {};
  tracks.forEach(track => {
    if (!genreAvgs[track.track_genre]) {
      genreAvgs[track.track_genre] = { energy: 0, danceability: 0, count: 0 };
    }
    genreAvgs[track.track_genre].energy += track.energy;
    genreAvgs[track.track_genre].danceability += track.danceability;
    genreAvgs[track.track_genre].count++;
  });
  
  const energyVsDanceability = Object.entries(genreAvgs)
    .slice(0, 15)
    .map(([genre, data]) => ({
      genre,
      energy: data.energy / data.count,
      danceability: data.danceability / data.count
    }));
  
  // Average stats
  const avgPopularity = tracks.reduce((sum, t) => sum + t.popularity, 0) / totalTracks;
  const avgDurationMs = tracks.reduce((sum, t) => sum + t.duration_ms, 0) / totalTracks;
  const avgDurationFormatted = `${Math.floor(avgDurationMs / 60000)}:${Math.floor((avgDurationMs % 60000) / 1000).toString().padStart(2, '0')}`;
  
  // Top artists
  const artistCounts: Record<string, number> = {};
  tracks.forEach(track => {
    const artists = track.artists.split(';');
    artists.forEach(artist => {
      artistCounts[artist.trim()] = (artistCounts[artist.trim()] || 0) + 1;
    });
  });
  
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], i) => ({
      rank: i + 1,
      name,
      streams: `${count} tracks`,
      image: ["🎤", "🎵", "🎧", "🎶", "🎸"][i]
    }));
  
  // Top tracks by popularity
  const topTracks = [...tracks]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5)
    .map((track, i) => ({
      rank: i + 1,
      title: track.track_name,
      artist: track.artists,
      plays: `Popularity: ${track.popularity}`
    }));
  
  // Top genre
  const topGenre = genreDistribution[0];
  
  return {
    totalTracks,
    uniqueGenres,
    avgPopularity: avgPopularity.toFixed(1),
    avgDuration: avgDurationFormatted,
    genreDistribution,
    audioFeatures,
    popularityDistribution,
    tempoDistribution,
    energyVsDanceability,
    topArtists,
    topTracks,
    topGenre: topGenre?.name || "Unknown"
  };
}
