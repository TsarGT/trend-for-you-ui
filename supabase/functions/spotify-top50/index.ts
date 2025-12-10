import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spotify Top 50 playlist IDs by country
const TOP_50_PLAYLISTS: Record<string, string> = {
  global: '37i9dQZEVXbMDoHDwVN2tF',
  us: '37i9dQZEVXbLRQDuF5jeBp',
  uk: '37i9dQZEVXbLnolsZ8PSNw',
  germany: '37i9dQZEVXbJiZcmkrIHGU',
  france: '37i9dQZEVXbIPWwFssbupI',
  spain: '37i9dQZEVXbNFJfN1Vw8d9',
  italy: '37i9dQZEVXbIQnj7RRhdSX',
  brazil: '37i9dQZEVXbMXbN3EUUhlg',
  japan: '37i9dQZEVXbKXQ4mDTEBXq',
  russia: '37i9dQZEVXbL8l7ra5vVdB',
};

// Country display names for logging
const COUNTRY_NAMES: Record<string, string> = {
  global: 'Global',
  us: 'USA',
  uk: 'UK',
  germany: 'Germany',
  france: 'France',
  spain: 'Spain',
  italy: 'Italy',
  brazil: 'Brazil',
  japan: 'Japan',
  russia: 'Russia',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { country = 'global', access_token: userAccessToken } = body;
    
    console.log(`Request received - country: ${country}, has user token: ${!!userAccessToken}`);
    
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    // Get the playlist ID for the selected country
    const playlistId = TOP_50_PLAYLISTS[country.toLowerCase()] || TOP_50_PLAYLISTS.global;
    const countryName = COUNTRY_NAMES[country.toLowerCase()] || 'Global';

    // If we have a user token, fetch the playlist directly
    if (userAccessToken) {
      console.log(`Fetching Top 50 ${countryName} (playlist: ${playlistId}) with user token...`);
      
      try {
        // First verify the token works by getting user profile
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${userAccessToken}` },
        });
        
        if (!profileResponse.ok) {
          console.error('Token invalid, status:', profileResponse.status);
        } else {
          const profile = await profileResponse.json();
          const market = profile.country || 'US';
          console.log(`User market: ${market}`);
          
          // Fetch tracks directly from the correct playlist ID
          const tracksResponse = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=${market}&limit=50`,
            {
              headers: { 'Authorization': `Bearer ${userAccessToken}` },
            }
          );
          
          if (tracksResponse.ok) {
            const tracksData = await tracksResponse.json();
            console.log(`SUCCESS! Got ${tracksData.items?.length || 0} tracks from Top 50 ${countryName}`);
            
            const tracks = tracksData.items?.map((item: any, index: number) => ({
              rank: index + 1,
              id: item.track?.id,
              title: item.track?.name,
              artist: item.track?.artists?.map((a: any) => a.name).join(', '),
              album: item.track?.album?.name,
              albumImage: item.track?.album?.images?.[0]?.url,
              popularity: item.track?.popularity,
            })).filter((t: any) => t.id) || [];

            return new Response(JSON.stringify({ 
              tracks, 
              country, 
              source: 'top50', 
              playlist: `Top 50 - ${countryName}` 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            console.error('Failed to fetch playlist tracks:', tracksResponse.status);
          }
        }
      } catch (fetchError: any) {
        console.error(`Fetch error: ${fetchError.message}`);
      }
    }
    
    // Fallback: Get client credentials token and fetch the playlist
    console.log('Getting client credentials token for fallback...');
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    const clientToken = tokenData.access_token;

    // Try to fetch the Top 50 playlist with client credentials
    console.log(`Fetching Top 50 ${countryName} with client credentials...`);
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
      {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      }
    );

    if (playlistResponse.ok) {
      const playlistData = await playlistResponse.json();
      console.log(`SUCCESS! Got ${playlistData.items?.length || 0} tracks from Top 50 ${countryName} (client credentials)`);
      
      const tracks = playlistData.items?.map((item: any, index: number) => ({
        rank: index + 1,
        id: item.track?.id,
        title: item.track?.name,
        artist: item.track?.artists?.map((a: any) => a.name).join(', '),
        album: item.track?.album?.name,
        albumImage: item.track?.album?.images?.[0]?.url,
        popularity: item.track?.popularity,
      })).filter((t: any) => t.id) || [];

      return new Response(JSON.stringify({ 
        tracks, 
        country, 
        source: 'top50',
        playlist: `Top 50 - ${countryName}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Final fallback: Get new releases
    console.log('Playlist fetch failed, fetching new releases as final fallback...');
    const newReleasesResponse = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?limit=20`,
      {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      }
    );

    if (!newReleasesResponse.ok) {
      throw new Error('Failed to fetch music data');
    }

    const newReleasesData = await newReleasesResponse.json();
    
    const tracks = [];
    for (let i = 0; i < Math.min(newReleasesData.albums?.items?.length || 0, 10); i++) {
      const album = newReleasesData.albums.items[i];
      if (!album) continue;
      
      const albumTracksResponse = await fetch(
        `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=1`,
        {
          headers: { 'Authorization': `Bearer ${clientToken}` },
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
            artist: track.artists?.map((a: any) => a.name).join(', '),
            album: album.name,
            albumImage: album.images?.[0]?.url,
            popularity: album.popularity || 0,
          });
        }
      }
    }

    return new Response(JSON.stringify({ tracks, country, source: 'new_releases' }), {
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
