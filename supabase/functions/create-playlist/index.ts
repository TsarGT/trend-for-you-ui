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
    const { access_token, playlist_name, track_ids } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!track_ids || !Array.isArray(track_ids) || track_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Track IDs required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating playlist with ${track_ids.length} tracks`);

    // Get user info
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error('Failed to get user info:', errText);
      throw new Error('Failed to get user info from Spotify');
    }
    
    const userData = await userResponse.json();
    const user_id = userData.id;
    console.log(`Creating playlist for user: ${user_id}`);

    // Create playlist
    const finalPlaylistName = playlist_name || `TrendTracks For You - ${new Date().toLocaleDateString('en-GB')}`;
    
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${user_id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalPlaylistName,
          description: 'Playlist with songs you may like - Created by TrendTracks',
          public: false
        })
      }
    );

    if (!createPlaylistResponse.ok) {
      const errText = await createPlaylistResponse.text();
      console.error('Failed to create playlist:', errText);
      throw new Error(`Failed to create playlist: ${errText}`);
    }

    const playlist = await createPlaylistResponse.json();
    console.log(`Playlist created: ${playlist.id}`);

    // Add tracks in batches of 100
    const uris = track_ids.map((id: string) => `spotify:track:${id}`);
    
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      const addTracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: batch })
        }
      );

      if (!addTracksResponse.ok) {
        console.error('Failed to add tracks batch:', await addTracksResponse.text());
      }
    }

    console.log(`Added ${track_ids.length} tracks to playlist`);

    return new Response(
      JSON.stringify({
        success: true,
        playlist_id: playlist.id,
        playlist_url: playlist.external_urls?.spotify,
        tracks_added: track_ids.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create playlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
