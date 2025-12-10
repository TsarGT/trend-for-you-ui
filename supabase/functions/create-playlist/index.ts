import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithAuth(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, playlist_name, num_tracks = 30 } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toLocaleDateString('en-GB');
    const finalPlaylistName = playlist_name || `TrendTracks For You - ${today}`;
    console.log('Creating playlist:', finalPlaylistName);

    // Step 1: Get user info
    const userResponse = await fetchWithAuth('https://api.spotify.com/v1/me', access_token);
    const userData = await userResponse.json();
    console.log('User:', userData.id);

    // Step 2: Get user's top 50 tracks
    const topTracksResponse = await fetchWithAuth(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
      access_token
    );

    if (!topTracksResponse.ok) {
      console.error('Failed to fetch top tracks');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch your top tracks from Spotify' }),
        { status: topTracksResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topTracksData = await topTracksResponse.json();
    const userTopTracks = topTracksData.items || [];
    console.log(`Found ${userTopTracks.length} top tracks`);

    if (userTopTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No top tracks found. Listen to more music on Spotify!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get all unique artist IDs from top tracks
    const artistIds = [...new Set(
      userTopTracks.flatMap((track: any) => track.artists.map((a: any) => a.id))
    )] as string[];
    console.log(`Found ${artistIds.length} unique artists`);

    // Step 4: Get genres from those artists (batch requests of 50)
    const genreCounts = new Map<string, number>();
    
    for (let i = 0; i < artistIds.length; i += 50) {
      const batch = artistIds.slice(i, i + 50);
      const artistsResponse = await fetchWithAuth(
        `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`,
        access_token
      );
      
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        for (const artist of artistsData.artists || []) {
          for (const genre of artist.genres || []) {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
          }
        }
      }
    }

    // Sort genres by frequency
    const sortedGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);
    
    console.log('Top genres:', sortedGenres.slice(0, 10).join(', '));

    if (sortedGenres.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not determine your music genres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Search for tracks by top genres
    const excludeTrackIds = new Set(userTopTracks.map((t: any) => t.id));
    const excludeArtistIds = new Set(artistIds);
    const recommendedTracks: any[] = [];
    const addedTrackIds = new Set<string>();

    // Search each top genre for tracks
    for (const genre of sortedGenres.slice(0, 8)) {
      if (recommendedTracks.length >= num_tracks) break;
      
      const searchQuery = encodeURIComponent(`genre:"${genre}"`);
      const searchResponse = await fetchWithAuth(
        `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=50`,
        access_token
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const tracks = searchData.tracks?.items || [];
        
        for (const track of tracks) {
          // Skip if already in user's top tracks, already added, or from same artists
          if (excludeTrackIds.has(track.id)) continue;
          if (addedTrackIds.has(track.id)) continue;
          
          // Allow some tracks from user's artists for familiarity, but prioritize new artists
          const isFromUserArtist = track.artists.some((a: any) => excludeArtistIds.has(a.id));
          if (isFromUserArtist && recommendedTracks.filter((t: any) => 
            t.artists.some((a: any) => excludeArtistIds.has(a.id))
          ).length > num_tracks * 0.3) {
            continue;
          }

          recommendedTracks.push(track);
          addedTrackIds.add(track.id);

          if (recommendedTracks.length >= num_tracks) break;
        }
      }
    }

    console.log(`Found ${recommendedTracks.length} recommendations from genre search`);

    // Fallback: If not enough tracks, get related artists' top tracks
    if (recommendedTracks.length < num_tracks) {
      console.log('Getting more tracks from related artists...');
      
      for (const artistId of artistIds.slice(0, 5)) {
        if (recommendedTracks.length >= num_tracks) break;
        
        const relatedResponse = await fetchWithAuth(
          `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
          access_token
        );

        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          
          for (const relatedArtist of (relatedData.artists || []).slice(0, 3)) {
            if (recommendedTracks.length >= num_tracks) break;
            
            const topTracksResponse = await fetchWithAuth(
              `https://api.spotify.com/v1/artists/${relatedArtist.id}/top-tracks?market=US`,
              access_token
            );

            if (topTracksResponse.ok) {
              const topTracksData = await topTracksResponse.json();
              
              for (const track of (topTracksData.tracks || []).slice(0, 3)) {
                if (excludeTrackIds.has(track.id)) continue;
                if (addedTrackIds.has(track.id)) continue;
                
                recommendedTracks.push(track);
                addedTrackIds.add(track.id);
                
                if (recommendedTracks.length >= num_tracks) break;
              }
            }
          }
        }
      }
    }

    console.log(`Final recommendation count: ${recommendedTracks.length}`);

    if (recommendedTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not find matching tracks for your genres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Create playlist
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalPlaylistName,
          description: `Personalized tracks based on your top genres: ${sortedGenres.slice(0, 5).join(', ')} - Created by TrendTracks`,
          public: false
        })
      }
    );

    if (!createPlaylistResponse.ok) {
      const errorText = await createPlaylistResponse.text();
      console.error('Failed to create playlist:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create playlist on Spotify' }),
        { status: createPlaylistResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newPlaylist = await createPlaylistResponse.json();
    console.log(`Created playlist: ${newPlaylist.id}`);

    // Step 7: Add tracks to playlist
    const trackUris = recommendedTracks.map((t: any) => `spotify:track:${t.id}`);

    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await fetch(
        `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: batch })
        }
      );
    }

    console.log(`Added ${trackUris.length} tracks to playlist`);

    return new Response(
      JSON.stringify({
        success: true,
        playlist_id: newPlaylist.id,
        playlist_url: newPlaylist.external_urls?.spotify,
        tracks_added: trackUris.length,
        genres_used: sortedGenres.slice(0, 5),
        recommendations: recommendedTracks.slice(0, 10).map((t: any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists.map((a: any) => a.name).join(', '),
          album: t.album?.name
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating playlist:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create playlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
