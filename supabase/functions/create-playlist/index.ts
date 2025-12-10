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
    const { access_token, playlist_name = 'TrendTracks Recommendations', num_tracks = 30 } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating playlist:', playlist_name);

    // 1. Get user's top tracks
    const topTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );

    if (!topTracksResponse.ok) {
      console.error('Failed to fetch top tracks:', await topTracksResponse.text());
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

    // 2. Get user's top artists for better recommendations
    const topArtistsResponse = await fetch(
      'https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term',
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );
    
    const topArtistsData = topArtistsResponse.ok ? await topArtistsResponse.json() : { items: [] };
    const topArtists = topArtistsData.items || [];
    console.log(`Found ${topArtists.length} top artists`);

    // 3. Collect track IDs to exclude (user's existing playlists)
    const excludeTrackIds = new Set<string>(userTopTracks.map((t: any) => t.id));
    
    try {
      const playlistsResponse = await fetch(
        'https://api.spotify.com/v1/me/playlists?limit=50',
        { headers: { 'Authorization': `Bearer ${access_token}` } }
      );
      
      if (playlistsResponse.ok) {
        const playlistsData = await playlistsResponse.json();
        const userProfile = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${access_token}` }
        }).then(r => r.json());
        
        for (const playlist of (playlistsData.items || []).slice(0, 10)) {
          if (playlist.owner?.id === userProfile.id) {
            try {
              const tracksResponse = await fetch(
                `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100&fields=items(track(id))`,
                { headers: { 'Authorization': `Bearer ${access_token}` } }
              );
              if (tracksResponse.ok) {
                const tracksData = await tracksResponse.json();
                for (const item of tracksData.items || []) {
                  if (item.track?.id) excludeTrackIds.add(item.track.id);
                }
              }
            } catch (e) { /* skip */ }
          }
        }
      }
    } catch (e) {
      console.log('Could not fetch user playlists, continuing');
    }
    
    console.log(`Excluding ${excludeTrackIds.size} known tracks`);

    // 4. Use Spotify Recommendations API with user's top tracks and artists as seeds
    const seedTracks = userTopTracks.slice(0, 3).map((t: any) => t.id);
    const seedArtists = topArtists.slice(0, 2).map((a: any) => a.id);
    
    console.log(`Using ${seedTracks.length} seed tracks and ${seedArtists.length} seed artists`);

    const allRecommendations: any[] = [];
    
    // Make multiple recommendation requests with different seeds for variety
    const seedCombinations = [
      { seed_tracks: seedTracks.slice(0, 2).join(','), seed_artists: seedArtists.slice(0, 1).join(',') },
      { seed_tracks: userTopTracks.slice(3, 5).map((t: any) => t.id).join(','), seed_artists: '' },
      { seed_tracks: '', seed_artists: topArtists.slice(2, 5).map((a: any) => a.id).join(',') },
      { seed_tracks: userTopTracks.slice(10, 13).map((t: any) => t.id).join(','), seed_artists: '' },
    ];

    for (const seeds of seedCombinations) {
      if (!seeds.seed_tracks && !seeds.seed_artists) continue;
      
      const params = new URLSearchParams({
        limit: '30',
        ...(seeds.seed_tracks && { seed_tracks: seeds.seed_tracks }),
        ...(seeds.seed_artists && { seed_artists: seeds.seed_artists }),
      });

      try {
        const recsResponse = await fetch(
          `https://api.spotify.com/v1/recommendations?${params}`,
          { headers: { 'Authorization': `Bearer ${access_token}` } }
        );

        if (recsResponse.ok) {
          const recsData = await recsResponse.json();
          for (const track of recsData.tracks || []) {
            if (!excludeTrackIds.has(track.id)) {
              allRecommendations.push(track);
              excludeTrackIds.add(track.id); // Prevent duplicates
            }
          }
          console.log(`Got ${recsData.tracks?.length || 0} recommendations from batch`);
        } else {
          console.log('Recommendations request failed:', await recsResponse.text());
        }
      } catch (e) {
        console.log('Error fetching recommendations:', e);
      }
    }

    console.log(`Total unique recommendations: ${allRecommendations.length}`);

    // 5. Select final tracks
    const finalTracks = allRecommendations.slice(0, num_tracks);

    if (finalTracks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate recommendations',
          message: 'Spotify could not find enough recommendations. Try listening to more varied music!'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Create playlist
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const userData = await userResponse.json();

    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlist_name,
          description: 'Personalized recommendations based on your listening history - Created by TrendTracks',
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

    // 7. Add tracks to playlist
    const trackUris = finalTracks.map((t: any) => `spotify:track:${t.id}`);
    
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
        recommendations: finalTracks.map((t: any) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name || 'Unknown',
          album: t.album?.name || '',
          popularity: t.popularity
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
