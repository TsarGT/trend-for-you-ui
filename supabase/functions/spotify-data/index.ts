import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchSpotify(endpoint: string, accessToken: string) {
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Spotify API error for ${endpoint}:`, error);
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token } = await req.json();

    if (!access_token) {
      throw new Error('Access token required');
    }

    console.log('Fetching Spotify data...');

    // Fetch user profile
    const profile = await fetchSpotify('/me', access_token);
    console.log('Got profile:', profile.display_name);

    // Fetch top tracks (short, medium, long term)
    const [topTracksShort, topTracksMedium, topTracksLong] = await Promise.all([
      fetchSpotify('/me/top/tracks?time_range=short_term&limit=50', access_token),
      fetchSpotify('/me/top/tracks?time_range=medium_term&limit=50', access_token),
      fetchSpotify('/me/top/tracks?time_range=long_term&limit=50', access_token),
    ]);

    // Fetch top artists
    const [topArtistsShort, topArtistsMedium] = await Promise.all([
      fetchSpotify('/me/top/artists?time_range=short_term&limit=20', access_token),
      fetchSpotify('/me/top/artists?time_range=medium_term&limit=20', access_token),
    ]);

    // Fetch recently played
    const recentlyPlayed = await fetchSpotify('/me/player/recently-played?limit=50', access_token);

    // Note: Audio features API was deprecated by Spotify in late 2024
    // Skipping audio features fetch - will use empty array
    const audioFeatures = { audio_features: [] };

    // Process genres from top artists
    const genreCounts: Record<string, number> = {};
    [...topArtistsShort.items, ...topArtistsMedium.items].forEach((artist: any) => {
      artist.genres?.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Calculate average audio features
    const validFeatures = audioFeatures.audio_features.filter((f: any) => f);
    const avgFeatures = {
      danceability: 0,
      energy: 0,
      speechiness: 0,
      acousticness: 0,
      instrumentalness: 0,
      liveness: 0,
      valence: 0,
      tempo: 0,
    };

    if (validFeatures.length > 0) {
      validFeatures.forEach((f: any) => {
        avgFeatures.danceability += f.danceability;
        avgFeatures.energy += f.energy;
        avgFeatures.speechiness += f.speechiness;
        avgFeatures.acousticness += f.acousticness;
        avgFeatures.instrumentalness += f.instrumentalness;
        avgFeatures.liveness += f.liveness;
        avgFeatures.valence += f.valence;
        avgFeatures.tempo += f.tempo;
      });

      Object.keys(avgFeatures).forEach((key) => {
        avgFeatures[key as keyof typeof avgFeatures] /= validFeatures.length;
      });
    }

    const result = {
      profile: {
        name: profile.display_name,
        email: profile.email,
        image: profile.images?.[0]?.url,
        followers: profile.followers?.total,
        country: profile.country,
      },
      topTracks: {
        short: topTracksShort.items.slice(0, 10),
        medium: topTracksMedium.items.slice(0, 10),
        long: topTracksLong.items.slice(0, 10),
      },
      topArtists: {
        short: topArtistsShort.items.slice(0, 10),
        medium: topArtistsMedium.items.slice(0, 10),
      },
      recentlyPlayed: recentlyPlayed.items.slice(0, 20),
      topGenres,
      audioFeatures: avgFeatures,
      allAudioFeatures: validFeatures,
    };

    console.log('Successfully compiled Spotify data');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Spotify data error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
