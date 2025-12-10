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

    // If we have a user token, try multiple approaches to get charts
    if (userAccessToken) {
      console.log(`Trying to get Top 50 for country: ${country} with user token...`);
      
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
          
          // Try searching for Top 50 playlists
          const countryNames: Record<string, string> = {
            'global': 'Global',
            'us': 'USA',
            'uk': 'UK',
            'germany': 'Germany',
            'france': 'France',
            'spain': 'Spain',
            'italy': 'Italy',
            'brazil': 'Brazil',
            'japan': 'Japan',
            'russia': 'Russia',
          };
          const countryName = countryNames[country.toLowerCase()] || 'Global';
          
          const searchQuery = encodeURIComponent(`Top 50 ${countryName}`);
          const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${searchQuery}&type=playlist&limit=10&market=${market}`,
            {
              headers: { 'Authorization': `Bearer ${userAccessToken}` },
            }
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log(`Search found ${searchData.playlists?.items?.length || 0} playlists`);
            
            // Find a playlist that looks like an official chart
            const chartPlaylist = searchData.playlists?.items?.find((p: any) => 
              p.owner?.id === 'spotify' && 
              (p.name?.toLowerCase().includes('top 50') || p.name?.toLowerCase().includes('viral'))
            );
            
            if (chartPlaylist) {
              console.log(`Found chart playlist: ${chartPlaylist.name} by ${chartPlaylist.owner?.id}`);
              
              const tracksResponse = await fetch(
                `https://api.spotify.com/v1/playlists/${chartPlaylist.id}/tracks?market=${market}&limit=50`,
                {
                  headers: { 'Authorization': `Bearer ${userAccessToken}` },
                }
              );
              
              if (tracksResponse.ok) {
                const tracksData = await tracksResponse.json();
                console.log(`SUCCESS! Got ${tracksData.items?.length || 0} tracks from ${chartPlaylist.name}`);
                
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
                  playlist: chartPlaylist.name 
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            } else {
              console.log('No official Spotify chart playlist found in search results');
            }
          }
        }
      } catch (fetchError: any) {
        console.error(`Fetch error: ${fetchError.message}`);
      }
    }
    
    // Fallback: Get client credentials token and fetch new releases
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

    // Get new releases as fallback
    console.log('Fetching new releases as fallback...');
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
