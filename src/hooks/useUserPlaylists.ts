import { useState, useEffect } from 'react';

export interface UserPlaylist {
  id: string;
  name: string;
  url: string;
  tracksCount: number;
  createdAt: string;
}

const STORAGE_KEY = 'trendtracks_user_playlists';

export function useUserPlaylists() {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPlaylists(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored playlists:', e);
      }
    }
  }, []);

  const addPlaylist = (playlist: UserPlaylist) => {
    setPlaylists(prev => {
      // Keep most recent at top, max 10 playlists
      const updated = [playlist, ...prev.filter(p => p.id !== playlist.id)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removePlaylist = (id: string) => {
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearPlaylists = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPlaylists([]);
  };

  return { playlists, addPlaylist, removePlaylist, clearPlaylists };
}
