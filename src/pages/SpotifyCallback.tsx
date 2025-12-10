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

    if (error) {
      setStatus('error');
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    if (code) {
      handleCallback(code).then((success) => {
        setStatus(success ? 'success' : 'error');
        setTimeout(() => navigate('/dashboard'), 1500);
      });
    } else {
      setStatus('error');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
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
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-foreground">Connected! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✗</span>
            </div>
            <p className="text-foreground">Connection failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;
