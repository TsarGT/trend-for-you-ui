import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpotifyProfile {
  name: string;
  email: string;
  image?: string;
  followers: number;
  country: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  popularity: number;
  duration_ms: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
  followers: { total: number };
}

interface SpotifyData {
  profile: SpotifyProfile;
  topTracks: {
    short: SpotifyTrack[];
    medium: SpotifyTrack[];
    long: SpotifyTrack[];
  };
  topArtists: {
    short: SpotifyArtist[];
    medium: SpotifyArtist[];
  };
  recentlyPlayed: { track: SpotifyTrack; played_at: string }[];
  topGenres: { name: string; count: number }[];
  audioFeatures: {
    danceability: number;
    energy: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
    tempo: number;
  };
  allAudioFeatures: any[];
}

export function useSpotify() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check localStorage for existing token
  const checkToken = useCallback(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');
    
    if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      setAccessToken(storedToken);
      setIsConnected(true);
      return true;
    } else {
      setAccessToken(null);
      setIsConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkToken();

    // Listen for auth completion from popup window
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data);
      if (event.data?.type === 'spotify-auth-complete' && event.data.success) {
        console.log('Auth complete with token data:', !!event.data.tokenData);
        
        // Use token data passed directly from popup (localStorage may not be shared in iframe)
        if (event.data.tokenData?.access_token && event.data.tokenData?.expiry) {
          localStorage.setItem('spotify_access_token', event.data.tokenData.access_token);
          localStorage.setItem('spotify_token_expiry', event.data.tokenData.expiry);
          setAccessToken(event.data.tokenData.access_token);
          setIsConnected(true);
        } else {
          // Fallback to checking localStorage
          setTimeout(() => checkToken(), 100);
        }
      }
    };

    // Also check on window focus (in case popup closed without message)
    const handleFocus = () => {
      console.log('Window focused, checking token...');
      checkToken();
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkToken]);

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      const redirectUri = `${window.location.origin}/spotify-callback`;
      
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'get_auth_url', redirect_uri: redirectUri },
      });

      if (error) throw error;
      
      // Open in new window/tab to avoid iframe blocking
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'spotify-auth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );
      
      if (!popup) {
        // If popup blocked, try regular navigation
        window.open(data.authUrl, '_blank');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Spotify connect error:', error);
      toast.error('Failed to connect to Spotify');
      setIsLoading(false);
    }
  }, []);

  const handleCallback = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      const redirectUri = `${window.location.origin}/spotify-callback`;
      
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'exchange_token', code, redirect_uri: redirectUri },
      });

      if (error) throw error;

      const expiryTime = Date.now() + (data.expires_in * 1000);
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_token_expiry', expiryTime.toString());
      
      setAccessToken(data.access_token);
      setIsConnected(true);
      toast.success('Connected to Spotify!');
      
      return true;
    } catch (error) {
      console.error('Spotify callback error:', error);
      toast.error('Failed to authenticate with Spotify');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('spotify-data', {
        body: { access_token: accessToken },
      });

      if (error) throw error;
      
      setSpotifyData(data);
    } catch (error) {
      console.error('Fetch Spotify data error:', error);
      toast.error('Failed to fetch Spotify data');
      
      // Token might be expired
      if ((error as any)?.message?.includes('401')) {
        disconnect();
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const disconnect = useCallback(() => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
    setAccessToken(null);
    setIsConnected(false);
    setSpotifyData(null);
    toast.info('Disconnected from Spotify');
  }, []);

  useEffect(() => {
    if (isConnected && accessToken && !spotifyData) {
      fetchData();
    }
  }, [isConnected, accessToken, spotifyData, fetchData]);

  return {
    isConnected,
    isLoading,
    spotifyData,
    accessToken,
    connect,
    handleCallback,
    fetchData,
    disconnect,
  };
}
