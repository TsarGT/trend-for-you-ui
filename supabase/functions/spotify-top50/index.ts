import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spotify Top 50 Global Playlist ID
const TOP_50_GLOBAL_PLAYLIST_ID = '37i9dQZEVXbMDoHDwVN2tF';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    console.log('Fetching client credentials token...');
    
    // Get client credentials token (no user auth needed for public playlists)
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token error:', errorText);
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Fetching Top 50 Global playlist...');

    // Fetch the Top 50 Global playlist tracks
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${TOP_50_GLOBAL_PLAYLIST_ID}/tracks?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      console.error('Playlist error:', errorText);
      throw new Error('Failed to fetch playlist');
    }

    const playlistData = await playlistResponse.json();

    console.log(`Got ${playlistData.items?.length || 0} tracks from Top 50 Global`);

    // Transform the data
    const tracks = playlistData.items.map((item: any, index: number) => ({
      rank: index + 1,
      id: item.track?.id,
      title: item.track?.name,
      artist: item.track?.artists?.map((a: any) => a.name).join(', '),
      album: item.track?.album?.name,
      albumImage: item.track?.album?.images?.[0]?.url,
      popularity: item.track?.popularity,
      previewUrl: item.track?.preview_url,
      externalUrl: item.track?.external_urls?.spotify,
    }));

    return new Response(JSON.stringify({ tracks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in spotify-top50:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
