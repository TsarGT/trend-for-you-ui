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

// Country codes for Spotify market
const COUNTRY_CODES: Record<string, string> = {
  global: 'US',
  us: 'US',
  uk: 'GB',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  brazil: 'BR',
  japan: 'JP',
  russia: 'RU',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { country = 'global', access_token: userAccessToken } = body;
    
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    console.log(`Fetching Top 50 for country: ${country}`);
    
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
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = userAccessToken || tokenData.access_token;
    const market = COUNTRY_CODES[country.toLowerCase()] || 'US';

    // First try: Get playlists from "toplists" category
    console.log(`Trying toplists category for market: ${market}`);
    const categoryResponse = await fetch(
      `https://api.spotify.com/v1/browse/categories/toplists/playlists?country=${market}&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json();
      
      // Find Top 50 playlist for the country
      const top50Playlist = categoryData.playlists?.items?.find((p: any) => 
        p?.name?.toLowerCase().includes('top 50') || 
        p?.name?.toLowerCase().includes('top songs')
      );

      if (top50Playlist) {
        console.log(`Found playlist: ${top50Playlist.name} (${top50Playlist.id})`);
        
        const tracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${top50Playlist.id}/tracks?limit=50`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const tracks = tracksData.items?.map((item: any, index: number) => ({
            rank: index + 1,
            id: item.track?.id,
            title: item.track?.name,
            artist: item.track?.artists?.map((a: any) => a.name).join(', '),
            album: item.track?.album?.name,
            albumImage: item.track?.album?.images?.[0]?.url,
            popularity: item.track?.popularity,
          })).filter((t: any) => t.id) || [];

          return new Response(JSON.stringify({ tracks, country, source: 'category' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Second try: Direct playlist access with user token
    if (userAccessToken) {
      const playlistId = TOP_50_PLAYLISTS[country.toLowerCase()] || TOP_50_PLAYLISTS.global;
      console.log(`Trying direct playlist: ${playlistId}`);
      
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
        {
          headers: { 'Authorization': `Bearer ${userAccessToken}` },
        }
      );

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        const tracks = playlistData.items?.map((item: any, index: number) => ({
          rank: index + 1,
          id: item.track?.id,
          title: item.track?.name,
          artist: item.track?.artists?.map((a: any) => a.name).join(', '),
          album: item.track?.album?.name,
          albumImage: item.track?.album?.images?.[0]?.url,
          popularity: item.track?.popularity,
        })).filter((t: any) => t.id) || [];

        return new Response(JSON.stringify({ tracks, country, source: 'direct' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Third try: Search for Top 50 playlists
    console.log('Searching for Top 50 playlists...');
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=top%2050%20${market}&type=playlist&limit=20`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const spotifyPlaylist = searchData.playlists?.items?.find((p: any) => 
        p?.owner?.id === 'spotify' && 
        (p?.name?.toLowerCase().includes('top 50') || p?.name?.toLowerCase().includes('viral'))
      );

      if (spotifyPlaylist) {
        console.log(`Found via search: ${spotifyPlaylist.name}`);
        const tracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${spotifyPlaylist.id}/tracks?limit=50`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const tracks = tracksData.items?.map((item: any, index: number) => ({
            rank: index + 1,
            id: item.track?.id,
            title: item.track?.name,
            artist: item.track?.artists?.map((a: any) => a.name).join(', '),
            album: item.track?.album?.name,
            albumImage: item.track?.album?.images?.[0]?.url,
            popularity: item.track?.popularity,
          })).filter((t: any) => t.id) || [];

          return new Response(JSON.stringify({ tracks, country, source: 'search' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Final fallback: New releases
    console.log('Using new releases fallback...');
    const newReleasesResponse = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?country=${market}&limit=20`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
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
          headers: { 'Authorization': `Bearer ${accessToken}` },
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
