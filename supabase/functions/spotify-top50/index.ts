import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spotify Top 50 playlist IDs by country (official editorial playlists - may be blocked)
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

// Country codes for market parameter
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

// Country display names
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

// Helper function to extract tracks from playlist response
function extractTracks(items: any[]): any[] {
  return items?.map((item: any, index: number) => ({
    rank: index + 1,
    id: item.track?.id,
    title: item.track?.name,
    artist: item.track?.artists?.map((a: any) => a.name).join(', '),
    album: item.track?.album?.name,
    albumImage: item.track?.album?.images?.[0]?.url,
    popularity: item.track?.popularity,
  })).filter((t: any) => t.id) || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { country = 'global', access_token: userAccessToken } = body;
    
    const countryKey = country.toLowerCase();
    const playlistId = TOP_50_PLAYLISTS[countryKey] || TOP_50_PLAYLISTS.global;
    const countryName = COUNTRY_NAMES[countryKey] || 'Global';
    const marketCode = COUNTRY_CODES[countryKey] || 'US';
    
    console.log(`Request - country: ${country}, playlist: ${playlistId}, market: ${marketCode}`);
    
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    // Helper to get client credentials token
    async function getClientToken(): Promise<string> {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
        },
        body: 'grant_type=client_credentials',
      });
      if (!tokenResponse.ok) throw new Error('Failed to get client token');
      const data = await tokenResponse.json();
      return data.access_token;
    }

    // Helper to fetch playlist tracks
    async function fetchPlaylist(token: string, pid: string, market: string): Promise<any[] | null> {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${pid}/tracks?market=${market}&limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        return data.items;
      }
      console.log(`Playlist ${pid} fetch failed: ${response.status}`);
      return null;
    }

    // ATTEMPT 1: Try with user token if available
    if (userAccessToken) {
      console.log('Attempting with user token...');
      const items = await fetchPlaylist(userAccessToken, playlistId, marketCode);
      if (items && items.length > 0) {
        console.log(`SUCCESS with user token! Got ${items.length} tracks`);
        return new Response(JSON.stringify({ 
          tracks: extractTracks(items), 
          country, 
          source: 'top50', 
          playlist: `Top 50 - ${countryName}` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get client credentials for fallbacks
    const clientToken = await getClientToken();
    console.log('Got client credentials token');

    // ATTEMPT 2: Try with client credentials
    console.log('Attempting with client credentials...');
    const items = await fetchPlaylist(clientToken, playlistId, marketCode);
    if (items && items.length > 0) {
      console.log(`SUCCESS with client token! Got ${items.length} tracks`);
      return new Response(JSON.stringify({ 
        tracks: extractTracks(items), 
        country, 
        source: 'top50', 
        playlist: `Top 50 - ${countryName}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ATTEMPT 3: Use Spotify's "toplists" category which contains official chart playlists
    console.log('Fetching from toplists category...');
    const toplistsResponse = await fetch(
      `https://api.spotify.com/v1/browse/categories/toplists/playlists?country=${marketCode}&limit=20`,
      { headers: { 'Authorization': `Bearer ${clientToken}` } }
    );

    if (toplistsResponse.ok) {
      const toplistsData = await toplistsResponse.json();
      const playlists = toplistsData.playlists?.items || [];
      
      // Look for the Top 50 playlist in the toplists
      for (const playlist of playlists) {
        if (playlist?.name?.toLowerCase().includes('top 50') || 
            playlist?.name?.toLowerCase().includes('top songs') ||
            playlist?.name?.toLowerCase().includes('viral')) {
          console.log(`Trying toplists playlist: "${playlist.name}"`);
          const playlistItems = await fetchPlaylist(clientToken, playlist.id, marketCode);
          if (playlistItems && playlistItems.length >= 10) {
            console.log(`SUCCESS with toplists! Got ${playlistItems.length} tracks from "${playlist.name}"`);
            return new Response(JSON.stringify({ 
              tracks: extractTracks(playlistItems), 
              country, 
              source: 'toplists', 
              playlist: playlist.name 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
      
      // If no Top 50, just use the first available playlist from toplists
      for (const playlist of playlists) {
        if (playlist?.id) {
          console.log(`Trying any toplists playlist: "${playlist.name}"`);
          const playlistItems = await fetchPlaylist(clientToken, playlist.id, marketCode);
          if (playlistItems && playlistItems.length >= 10) {
            console.log(`SUCCESS with toplists fallback! Got ${playlistItems.length} tracks`);
            return new Response(JSON.stringify({ 
              tracks: extractTracks(playlistItems), 
              country, 
              source: 'toplists', 
              playlist: playlist.name 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // ATTEMPT 4: Featured playlists
    console.log('Fetching featured playlists...');
    const featuredResponse = await fetch(
      `https://api.spotify.com/v1/browse/featured-playlists?country=${marketCode}&limit=20`,
      { headers: { 'Authorization': `Bearer ${clientToken}` } }
    );

    if (featuredResponse.ok) {
      const featuredData = await featuredResponse.json();
      const featuredPlaylists = featuredData.playlists?.items || [];
      
      for (const playlist of featuredPlaylists) {
        if (playlist?.tracks?.total >= 20) {
          console.log(`Trying featured playlist: "${playlist.name}"`);
          const playlistItems = await fetchPlaylist(clientToken, playlist.id, marketCode);
          if (playlistItems && playlistItems.length >= 10) {
            console.log(`SUCCESS with featured playlist! Got ${playlistItems.length} tracks`);
            return new Response(JSON.stringify({ 
              tracks: extractTracks(playlistItems), 
              country, 
              source: 'featured', 
              playlist: playlist.name 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // ATTEMPT 5: Search for chart playlists (last resort)
    console.log('Searching for chart playlists as last resort...');
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const searchQuery = encodeURIComponent(`Top 50 ${countryName} ${currentMonth} ${currentYear}`);
    
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=playlist&limit=20&market=${marketCode}`,
      { headers: { 'Authorization': `Bearer ${clientToken}` } }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const playlists = searchData.playlists?.items || [];
      
      // Sort by follower count (approximated by total tracks for now)
      for (const playlist of playlists) {
        if (playlist?.tracks?.total >= 20 && 
            (playlist.name?.toLowerCase().includes('top') || 
             playlist.name?.toLowerCase().includes('chart') ||
             playlist.name?.toLowerCase().includes('hits'))) {
          console.log(`Trying search result: "${playlist.name}" by ${playlist.owner?.display_name}`);
          const playlistItems = await fetchPlaylist(clientToken, playlist.id, marketCode);
          if (playlistItems && playlistItems.length >= 10) {
            console.log(`SUCCESS with search! Got ${playlistItems.length} tracks`);
            return new Response(JSON.stringify({ 
              tracks: extractTracks(playlistItems), 
              country, 
              source: 'search', 
              playlist: playlist.name 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // If all else fails, return empty with error info
    console.error('All fetch attempts failed');
    return new Response(JSON.stringify({ 
      tracks: [], 
      country, 
      source: 'none',
      error: 'Unable to fetch chart data - Spotify editorial playlists are not accessible via API' 
    }), {
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
