import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Well-maintained community playlists for each genre (high follower counts, regularly updated)
const GENRE_PLAYLISTS: Record<string, { id: string; name: string; fallbackSearch: string[] }> = {
  pop: { 
    id: '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits (Spotify editorial)
    name: "Today's Top Hits",
    fallbackSearch: ['top pop hits 2025', 'pop hits 2025', 'best pop songs 2025']
  },
  hiphop: { 
    id: '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar (Spotify editorial)
    name: 'RapCaviar',
    fallbackSearch: ['top hip hop hits 2025', 'hip hop hits', 'rap hits 2025']
  },
  rock: { 
    id: '37i9dQZF1DXcF6B6QPhFDv', // Rock This (Spotify editorial)
    name: 'Rock This',
    fallbackSearch: ['top rock hits 2025', 'rock hits', 'best rock songs 2025']
  },
  rap: { 
    id: '7EnIitpBIDp8hbqoaOWfQO', // RAP MUSIC 2025 (user shared)
    name: 'RAP MUSIC 2025',
    fallbackSearch: ['top rap hits 2025', 'rap hits', 'best rap songs 2025']
  },
  rnb: { 
    id: '37i9dQZF1DX4SBhb3fqCJd', // Are & Be (Spotify editorial)
    name: 'Are & Be',
    fallbackSearch: ['top rnb hits 2025', 'r&b hits', 'best rnb songs 2025']
  },
  electronic: { 
    id: '37i9dQZF1DX4dyzvuaRJ0n', // mint (Spotify editorial)
    name: 'mint',
    fallbackSearch: ['top edm hits 2025', 'electronic hits', 'best edm songs 2025']
  },
  latin: { 
    id: '37i9dQZF1DX10zKzsJ2jva', // Viva Latino (Spotify editorial)
    name: 'Viva Latino',
    fallbackSearch: ['top latin hits 2025', 'latin hits', 'reggaeton hits 2025']
  },
  country: { 
    id: '37i9dQZF1DX1lVhptIYRda', // Hot Country (Spotify editorial)
    name: 'Hot Country',
    fallbackSearch: ['top country hits 2025', 'country hits', 'best country songs 2025']
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
    const genreConfig = GENRE_PLAYLISTS[genreKey] || GENRE_PLAYLISTS.pop;
    
    console.log(`Fetching tracks for genre: ${genre}, playlist: ${genreConfig.name}`);
    
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    // Get access token (prefer user token, fallback to client credentials)
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

    // Helper to fetch playlist tracks
    async function fetchPlaylistTracks(playlistId: string): Promise<any[] | null> {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=10&market=US`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        return data.items;
      }
      console.log(`Playlist ${playlistId} fetch failed: ${response.status}`);
      return null;
    }

    // Helper to format tracks
    function formatTracks(items: any[]): any[] {
      return items
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
    }

    // ATTEMPT 1: Try the predefined genre playlist directly
    console.log(`Trying predefined playlist: ${genreConfig.name} (${genreConfig.id})`);
    const playlistTracks = await fetchPlaylistTracks(genreConfig.id);
    if (playlistTracks && playlistTracks.length >= 5) {
      console.log(`SUCCESS! Got ${playlistTracks.length} tracks from ${genreConfig.name}`);
      return new Response(JSON.stringify({ 
        tracks: formatTracks(playlistTracks), 
        genre, 
        source: 'playlist',
        playlist: genreConfig.name 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ATTEMPT 2: Search for genre playlists as fallback
    console.log('Predefined playlist failed, searching for alternatives...');
    for (const searchTerm of genreConfig.fallbackSearch) {
      const searchQuery = encodeURIComponent(searchTerm);
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${searchQuery}&type=playlist&limit=10&market=US`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const playlists = searchData.playlists?.items || [];
        
        for (const playlist of playlists) {
          if (playlist?.tracks?.total >= 10) {
            console.log(`Trying search result: "${playlist.name}" (${playlist.owner?.display_name})`);
            const tracks = await fetchPlaylistTracks(playlist.id);
            if (tracks && tracks.length >= 5) {
              console.log(`SUCCESS with fallback! Got ${tracks.length} tracks from "${playlist.name}"`);
              return new Response(JSON.stringify({ 
                tracks: formatTracks(tracks), 
                genre, 
                source: 'search',
                playlist: playlist.name 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        }
      }
    }

    // ATTEMPT 3: Use Spotify recommendations API
    console.log('Falling back to recommendations...');
    const genreSeeds: Record<string, string> = {
      pop: 'pop',
      hiphop: 'hip-hop',
      rock: 'rock',
      rap: 'hip-hop',
      rnb: 'r-n-b',
      electronic: 'electronic',
      latin: 'latin',
      country: 'country',
    };
    
    const seedGenre = genreSeeds[genreKey] || 'pop';
    const recsResponse = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_genres=${seedGenre}&limit=10&market=US`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (recsResponse.ok) {
      const recsData = await recsResponse.json();
      if (recsData.tracks && recsData.tracks.length >= 5) {
        const tracks = recsData.tracks.map((track: any, index: number) => ({
          rank: index + 1,
          id: track.id,
          title: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', '),
          album: track.album?.name,
          albumImage: track.album?.images?.[0]?.url,
          popularity: track.popularity,
        }));
        console.log(`SUCCESS with recommendations! Got ${tracks.length} tracks`);
        return new Response(JSON.stringify({ tracks, genre, source: 'recommendations' }), {
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
