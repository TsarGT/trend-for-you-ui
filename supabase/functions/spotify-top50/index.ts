import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Get client credentials token
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

    console.log('Token obtained, fetching new releases...');

    // Get new releases - this is more reliable
    const newReleasesResponse = await fetch(
      'https://api.spotify.com/v1/browse/new-releases?limit=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!newReleasesResponse.ok) {
      const errorText = await newReleasesResponse.text();
      console.error('New releases error:', errorText);
      throw new Error('Failed to fetch new releases');
    }

    const newReleasesData = await newReleasesResponse.json();
    console.log(`Got ${newReleasesData.albums?.items?.length || 0} new releases`);

    // Get track details for each album (get first track from each)
    const tracks = [];
    
    for (let i = 0; i < Math.min(newReleasesData.albums?.items?.length || 0, 20); i++) {
      const album = newReleasesData.albums.items[i];
      if (!album) continue;
      
      // Get tracks from this album
      const albumTracksResponse = await fetch(
        `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (albumTracksResponse.ok) {
        const albumTracksData = await albumTracksResponse.json();
        const track = albumTracksData.items?.[0];
        
        if (track) {
          tracks.push({
            rank: tracks.length + 1,
            id: track.id,
            title: track.name,
            artist: track.artists?.map((a: any) => a.name).join(', ') || album.artists?.map((a: any) => a.name).join(', '),
            album: album.name,
            albumImage: album.images?.[0]?.url,
            popularity: album.popularity || 0,
            previewUrl: track.preview_url,
            externalUrl: track.external_urls?.spotify,
          });
        }
      }
    }

    console.log(`Compiled ${tracks.length} tracks`);

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
