import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotify } from '@/hooks/useSpotify';
import { Loader2 } from 'lucide-react';

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useSpotify();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const handleAuth = async () => {
      if (error) {
        setStatus('error');
        closeOrRedirect();
        return;
      }

      if (code) {
        const success = await handleCallback(code);
        setStatus(success ? 'success' : 'error');
        
        // Get the token data to pass to opener
        const tokenData = success ? {
          access_token: localStorage.getItem('spotify_access_token'),
          expiry: localStorage.getItem('spotify_token_expiry')
        } : null;
        
        // Notify opener window if exists - pass token directly since localStorage may not be shared
        if (window.opener) {
          try {
            window.opener.postMessage({ 
              type: 'spotify-auth-complete', 
              success,
              tokenData 
            }, '*'); // Use * to allow cross-origin in iframe scenario
          } catch (e) {
            console.log('Could not communicate with opener');
          }
        }
        
        setTimeout(closeOrRedirect, 1500);
      } else {
        setStatus('error');
        closeOrRedirect();
      }
    };

    const closeOrRedirect = () => {
      // If opened as popup, close the window
      if (window.opener) {
        window.close();
      } else {
        // Otherwise redirect to dashboard
        navigate('/dashboard');
      }
    };

    handleAuth();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-foreground">Connecting to Spotify...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-[#1DB954]/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl text-[#1DB954]">✓</span>
            </div>
            <p className="text-foreground">Connected! You can close this window.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl text-destructive">✗</span>
            </div>
            <p className="text-foreground">Connection failed. Please try again.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;
