import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Genre seed IDs and search terms for Spotify
const GENRE_CONFIG: Record<string, { seeds: string[], searchTerms: string[] }> = {
  pop: { 
    seeds: ['pop'], 
    searchTerms: ['top pop hits 2024', 'pop hits', 'best pop songs'] 
  },
  hiphop: { 
    seeds: ['hip-hop'], 
    searchTerms: ['top hip hop hits 2024', 'hip hop hits', 'best rap songs'] 
  },
  rock: { 
    seeds: ['rock'], 
    searchTerms: ['top rock hits 2024', 'rock hits', 'best rock songs'] 
  },
  rap: { 
    seeds: ['hip-hop', 'rap'], 
    searchTerms: ['top rap hits 2024', 'rap hits', 'best rap songs'] 
  },
  rnb: { 
    seeds: ['r-n-b'], 
    searchTerms: ['top rnb hits 2024', 'r&b hits', 'best rnb songs'] 
  },
  electronic: { 
    seeds: ['electronic', 'edm'], 
    searchTerms: ['top edm hits 2024', 'electronic hits', 'best edm songs'] 
  },
  latin: { 
    seeds: ['latin'], 
    searchTerms: ['top latin hits 2024', 'latin hits', 'reggaeton hits'] 
  },
  country: { 
    seeds: ['country'], 
    searchTerms: ['top country hits 2024', 'country hits', 'best country songs'] 
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { genre = 'pop', access_token: userAccessToken } = body;
    
    const genreKey = genre.toLowerCase();
    const genreConfig = GENRE_CONFIG[genreKey] || GENRE_CONFIG.pop;
    
    console.log(`Fetching tracks for genre: ${genre}`);
    
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    // Get access token
    let token = userAccessToken;
    if (!token) {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
        },
        body: 'grant_type=client_credentials',
      });
      if (!tokenResponse.ok) throw new Error('Failed to get client token');
      const tokenData = await tokenResponse.json();
      token = tokenData.access_token;
    }

    // ATTEMPT 1: Get recommendations based on genre seeds
    console.log('Trying genre recommendations...');
    const seedGenres = genreConfig.seeds.join(',');
    const recsResponse = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres}&limit=10&market=US`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (recsResponse.ok) {
      const recsData = await recsResponse.json();
      if (recsData.tracks && recsData.tracks.length >= 5) {
        console.log(`Got ${recsData.tracks.length} tracks from recommendations`);
        const tracks = recsData.tracks.map((track: any, index: number) => ({
          rank: index + 1,
          id: track.id,
          title: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', '),
          album: track.album?.name,
          albumImage: track.album?.images?.[0]?.url,
          popularity: track.popularity,
        }));
        return new Response(JSON.stringify({ tracks, genre, source: 'recommendations' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ATTEMPT 2: Search for genre playlists
    console.log('Searching for genre playlists...');
    for (const searchTerm of genreConfig.searchTerms) {
      const searchQuery = encodeURIComponent(searchTerm);
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${searchQuery}&type=playlist&limit=5&market=US`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const playlists = searchData.playlists?.items || [];
        
        for (const playlist of playlists) {
          if (playlist?.tracks?.total >= 10) {
            console.log(`Trying playlist: "${playlist.name}"`);
            const tracksResponse = await fetch(
              `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=10&market=US`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (tracksResponse.ok) {
              const tracksData = await tracksResponse.json();
              if (tracksData.items && tracksData.items.length >= 5) {
                const tracks = tracksData.items
                  .filter((item: any) => item.track?.id)
                  .map((item: any, index: number) => ({
                    rank: index + 1,
                    id: item.track.id,
                    title: item.track.name,
                    artist: item.track.artists?.map((a: any) => a.name).join(', '),
                    album: item.track.album?.name,
                    albumImage: item.track.album?.images?.[0]?.url,
                    popularity: item.track.popularity,
                  }));
                
                console.log(`Got ${tracks.length} tracks from playlist "${playlist.name}"`);
                return new Response(JSON.stringify({ tracks, genre, source: 'playlist', playlist: playlist.name }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
        }
      }
    }

    // ATTEMPT 3: Search for tracks directly
    console.log('Searching for tracks directly...');
    const trackSearchQuery = encodeURIComponent(`genre:${genreConfig.seeds[0]}`);
    const trackSearchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${trackSearchQuery}&type=track&limit=10&market=US`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (trackSearchResponse.ok) {
      const trackSearchData = await trackSearchResponse.json();
      if (trackSearchData.tracks?.items?.length >= 5) {
        const tracks = trackSearchData.tracks.items.map((track: any, index: number) => ({
          rank: index + 1,
          id: track.id,
          title: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', '),
          album: track.album?.name,
          albumImage: track.album?.images?.[0]?.url,
          popularity: track.popularity,
        }));
        console.log(`Got ${tracks.length} tracks from track search`);
        return new Response(JSON.stringify({ tracks, genre, source: 'search' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: return empty
    console.error('All attempts failed for genre:', genre);
    return new Response(JSON.stringify({ tracks: [], genre, source: 'none' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in spotify-genre:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
