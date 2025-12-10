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
      const errorText = await topTracksResponse.text();
      console.error('Failed to fetch top tracks:', errorText);
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

    // 2. Collect track IDs to exclude
    const excludeTrackIds = new Set<string>(userTopTracks.map((t: any) => t.id));

    // 3. Get recommendations using simple direct calls
    const allRecommendations: any[] = [];
    
    // Use first 5 top tracks as seeds (Spotify allows max 5 seeds total)
    const seedTrackIds = userTopTracks.slice(0, 5).map((t: any) => t.id);
    console.log('Seed track IDs:', seedTrackIds.join(','));

    // Make recommendation request
    const recsUrl = `https://api.spotify.com/v1/recommendations?limit=100&seed_tracks=${seedTrackIds.join(',')}`;
    console.log('Fetching recommendations from:', recsUrl);
    
    const recsResponse = await fetch(recsUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    console.log('Recommendations response status:', recsResponse.status);

    if (recsResponse.ok) {
      const recsData = await recsResponse.json();
      console.log(`Got ${recsData.tracks?.length || 0} tracks from recommendations API`);
      
      for (const track of recsData.tracks || []) {
        if (!excludeTrackIds.has(track.id)) {
          allRecommendations.push(track);
          excludeTrackIds.add(track.id);
        }
      }
    } else {
      const errorText = await recsResponse.text();
      console.error('Recommendations API error:', recsResponse.status, errorText);
      
      // Try with fewer seeds
      if (seedTrackIds.length > 1) {
        console.log('Retrying with single seed...');
        const fallbackUrl = `https://api.spotify.com/v1/recommendations?limit=100&seed_tracks=${seedTrackIds[0]}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log(`Fallback got ${fallbackData.tracks?.length || 0} tracks`);
          for (const track of fallbackData.tracks || []) {
            if (!excludeTrackIds.has(track.id)) {
              allRecommendations.push(track);
              excludeTrackIds.add(track.id);
            }
          }
        } else {
          console.error('Fallback also failed:', await fallbackResponse.text());
        }
      }
    }

    // If we still don't have enough, try with different seeds
    if (allRecommendations.length < num_tracks && userTopTracks.length > 5) {
      const moreSeedIds = userTopTracks.slice(5, 10).map((t: any) => t.id);
      if (moreSeedIds.length > 0) {
        console.log('Fetching more recommendations with different seeds...');
        const moreUrl = `https://api.spotify.com/v1/recommendations?limit=100&seed_tracks=${moreSeedIds.join(',')}`;
        const moreResponse = await fetch(moreUrl, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        
        if (moreResponse.ok) {
          const moreData = await moreResponse.json();
          for (const track of moreData.tracks || []) {
            if (!excludeTrackIds.has(track.id)) {
              allRecommendations.push(track);
              excludeTrackIds.add(track.id);
            }
          }
          console.log(`Now have ${allRecommendations.length} total recommendations`);
        }
      }
    }

    console.log(`Total unique recommendations: ${allRecommendations.length}`);

    // 4. Select final tracks
    const finalTracks = allRecommendations.slice(0, num_tracks);

    if (finalTracks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate recommendations',
          message: 'Spotify returned no recommendations. This can happen with very niche music tastes.',
          debug: { seedTracks: seedTrackIds }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create playlist
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

    // 6. Add tracks to playlist
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
