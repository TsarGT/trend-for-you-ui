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

// Strategy 1: Spotify Recommendations API
async function getRecommendations(seedTrackIds: string[], accessToken: string, excludeIds: Set<string>): Promise<any[]> {
  const tracks: any[] = [];
  const url = `https://api.spotify.com/v1/recommendations?limit=100&seed_tracks=${seedTrackIds.slice(0, 5).join(',')}`;
  console.log('Strategy 1: Trying recommendations API...');
  
  const response = await fetchWithAuth(url, accessToken);
  if (response.ok) {
    const data = await response.json();
    for (const track of data.tracks || []) {
      if (!excludeIds.has(track.id)) {
        tracks.push(track);
        excludeIds.add(track.id);
      }
    }
    console.log(`Strategy 1: Got ${tracks.length} tracks`);
  } else {
    console.log(`Strategy 1: Failed with status ${response.status}`);
  }
  return tracks;
}

// Strategy 2: Get top tracks from artists of user's top tracks
async function getArtistTopTracks(artistIds: string[], accessToken: string, excludeIds: Set<string>, market: string = 'US'): Promise<any[]> {
  const tracks: any[] = [];
  console.log(`Strategy 2: Getting top tracks from ${artistIds.length} artists...`);
  
  for (const artistId of artistIds.slice(0, 10)) {
    const response = await fetchWithAuth(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      accessToken
    );
    if (response.ok) {
      const data = await response.json();
      for (const track of data.tracks || []) {
        if (!excludeIds.has(track.id)) {
          tracks.push(track);
          excludeIds.add(track.id);
        }
      }
    }
    if (tracks.length >= 50) break;
  }
  console.log(`Strategy 2: Got ${tracks.length} tracks`);
  return tracks;
}

// Strategy 3: Get related artists' top tracks
async function getRelatedArtistsTracks(artistIds: string[], accessToken: string, excludeIds: Set<string>, market: string = 'US'): Promise<any[]> {
  const tracks: any[] = [];
  const processedArtists = new Set<string>(artistIds);
  console.log('Strategy 3: Getting related artists\' top tracks...');
  
  for (const artistId of artistIds.slice(0, 5)) {
    // Get related artists
    const relatedResponse = await fetchWithAuth(
      `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
      accessToken
    );
    
    if (relatedResponse.ok) {
      const relatedData = await relatedResponse.json();
      const relatedArtists = relatedData.artists || [];
      
      // Get top tracks from first 3 related artists
      for (const relatedArtist of relatedArtists.slice(0, 3)) {
        if (processedArtists.has(relatedArtist.id)) continue;
        processedArtists.add(relatedArtist.id);
        
        const topTracksResponse = await fetchWithAuth(
          `https://api.spotify.com/v1/artists/${relatedArtist.id}/top-tracks?market=${market}`,
          accessToken
        );
        
        if (topTracksResponse.ok) {
          const topTracksData = await topTracksResponse.json();
          for (const track of topTracksData.tracks || []) {
            if (!excludeIds.has(track.id)) {
              tracks.push(track);
              excludeIds.add(track.id);
            }
          }
        }
        if (tracks.length >= 50) break;
      }
    }
    if (tracks.length >= 50) break;
  }
  console.log(`Strategy 3: Got ${tracks.length} tracks`);
  return tracks;
}

// Strategy 4: Search by genres
async function searchByGenres(genres: string[], accessToken: string, excludeIds: Set<string>): Promise<any[]> {
  const tracks: any[] = [];
  console.log(`Strategy 4: Searching by genres: ${genres.slice(0, 3).join(', ')}...`);
  
  for (const genre of genres.slice(0, 5)) {
    const query = encodeURIComponent(`genre:"${genre}"`);
    const response = await fetchWithAuth(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=20`,
      accessToken
    );
    
    if (response.ok) {
      const data = await response.json();
      for (const track of data.tracks?.items || []) {
        if (!excludeIds.has(track.id)) {
          tracks.push(track);
          excludeIds.add(track.id);
        }
      }
    }
    if (tracks.length >= 50) break;
  }
  console.log(`Strategy 4: Got ${tracks.length} tracks`);
  return tracks;
}

// Strategy 5: Get recently played and expand from there
async function getFromRecentlyPlayed(accessToken: string, excludeIds: Set<string>, market: string = 'US'): Promise<any[]> {
  const tracks: any[] = [];
  console.log('Strategy 5: Expanding from recently played...');
  
  const response = await fetchWithAuth(
    'https://api.spotify.com/v1/me/player/recently-played?limit=50',
    accessToken
  );
  
  if (response.ok) {
    const data = await response.json();
    const recentItems = data.items || [];
    const artistIds = new Set<string>();
    
    for (const item of recentItems) {
      const artistId = item.track?.artists?.[0]?.id;
      if (artistId && !artistIds.has(artistId)) {
        artistIds.add(artistId);
      }
    }
    
    // Get top tracks from these artists
    for (const artistId of Array.from(artistIds).slice(0, 8)) {
      const topResponse = await fetchWithAuth(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
        accessToken
      );
      
      if (topResponse.ok) {
        const topData = await topResponse.json();
        for (const track of topData.tracks || []) {
          if (!excludeIds.has(track.id)) {
            tracks.push(track);
            excludeIds.add(track.id);
          }
        }
      }
      if (tracks.length >= 50) break;
    }
  }
  console.log(`Strategy 5: Got ${tracks.length} tracks`);
  return tracks;
}

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

    // Get user info for market
    const userResponse = await fetchWithAuth('https://api.spotify.com/v1/me', access_token);
    const userData = await userResponse.json();
    const market = userData.country || 'US';
    console.log('User market:', market);

    // Get user's top tracks
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

    // Collect IDs to exclude (user's top tracks)
    const excludeIds = new Set<string>(userTopTracks.map((t: any) => t.id));
    const seedTrackIds: string[] = userTopTracks.slice(0, 5).map((t: any) => t.id);
    const artistIds: string[] = [...new Set(userTopTracks.map((t: any) => t.artists?.[0]?.id).filter(Boolean))] as string[];

    // Get artist info to extract genres
    let genres: string[] = [];
    if (artistIds.length > 0) {
      const artistsResponse = await fetchWithAuth(
        `https://api.spotify.com/v1/artists?ids=${artistIds.slice(0, 50).join(',')}`,
        access_token
      );
      if (artistsResponse.ok) {
        const artistsData = await artistsResponse.json();
        const allGenres = artistsData.artists?.flatMap((a: any) => a.genres || []) || [];
        genres = [...new Set(allGenres as string[])].slice(0, 10);
        console.log('Extracted genres:', genres.slice(0, 5).join(', '));
      }
    }

    // Try multiple strategies
    let allRecommendations: any[] = [];

    // Strategy 1: Spotify Recommendations API
    const recsResult = await getRecommendations(seedTrackIds, access_token, excludeIds);
    allRecommendations.push(...recsResult);

    // Strategy 2: Artist top tracks (if needed)
    if (allRecommendations.length < num_tracks) {
      const artistTracks = await getArtistTopTracks(artistIds, access_token, excludeIds, market);
      allRecommendations.push(...artistTracks);
    }

    // Strategy 3: Related artists (if needed)
    if (allRecommendations.length < num_tracks) {
      const relatedTracks = await getRelatedArtistsTracks(artistIds, access_token, excludeIds, market);
      allRecommendations.push(...relatedTracks);
    }

    // Strategy 4: Genre search (if needed)
    if (allRecommendations.length < num_tracks && genres.length > 0) {
      const genreTracks = await searchByGenres(genres, access_token, excludeIds);
      allRecommendations.push(...genreTracks);
    }

    // Strategy 5: Recently played expansion (if needed)
    if (allRecommendations.length < num_tracks) {
      const recentTracks = await getFromRecentlyPlayed(access_token, excludeIds, market);
      allRecommendations.push(...recentTracks);
    }

    console.log(`Total recommendations collected: ${allRecommendations.length}`);

    // Select final tracks
    const finalTracks = allRecommendations.slice(0, num_tracks);

    if (finalTracks.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate recommendations',
          message: 'Unable to find recommendations. Try listening to more varied music on Spotify!'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create playlist
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
      console.error('Failed to create playlist');
      return new Response(
        JSON.stringify({ error: 'Failed to create playlist on Spotify' }),
        { status: createPlaylistResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newPlaylist = await createPlaylistResponse.json();
    console.log(`Created playlist: ${newPlaylist.id}`);

    // Add tracks to playlist
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
