/**
 * @fileoverview Hook for managing user-created playlists
 * 
 * Stores playlist data in localStorage to persist across sessions.
 * Used to display created playlists on the home page.
 */

import { useState, useEffect } from 'react';

/** User playlist data structure */
export interface UserPlaylist {
  /** Spotify playlist ID */
  id: string;
  /** Playlist name */
  name: string;
  /** Spotify URL to the playlist */
  url: string;
  /** Number of tracks in the playlist */
  tracksCount: number;
  /** ISO timestamp when the playlist was created */
  createdAt: string;
}

/** LocalStorage key for persisting playlists */
const STORAGE_KEY = 'trendtracks_user_playlists';

/**
 * Hook to manage user-created playlists
 * 
 * @returns Object containing:
 * - playlists: Array of user playlists
 * - addPlaylist: Function to add a new playlist
 * - removePlaylist: Function to remove a playlist by ID
 * - clearPlaylists: Function to clear all playlists
 * 
 * @example
 * ```tsx
 * const { playlists, addPlaylist } = useUserPlaylists();
 * 
 * // Add a new playlist
 * addPlaylist({ id: '123', name: 'My Playlist', url: '...', tracksCount: 30, createdAt: '...' });
 * 
 * // Display playlists
 * playlists.map(p => <PlaylistCard key={p.id} playlist={p} />)
 * ```
 */
export function useUserPlaylists() {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

  // Load playlists from localStorage on mount
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

  /**
   * Add a playlist to the collection
   * Keeps most recent at top, max 10 playlists
   */
  const addPlaylist = (playlist: UserPlaylist) => {
    setPlaylists(prev => {
      const updated = [playlist, ...prev.filter(p => p.id !== playlist.id)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Remove a playlist by ID
   */
  const removePlaylist = (id: string) => {
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Clear all playlists
   */
  const clearPlaylists = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPlaylists([]);
  };

  return { playlists, addPlaylist, removePlaylist, clearPlaylists };
}
