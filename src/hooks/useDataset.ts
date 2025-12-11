/**
 * @fileoverview Hook for loading and parsing the music dataset
 * 
 * Fetches the 114k track dataset from the public folder,
 * parses the CSV, and computes aggregate statistics for visualization.
 */

import { useState, useEffect } from 'react';
import { parseCSV, computeStats, Track } from '@/lib/csvParser';

/**
 * Hook to load and process the music dataset
 * 
 * @returns Object containing:
 * - loading: Whether the dataset is being loaded
 * - error: Error message if loading failed
 * - stats: Computed statistics from the dataset
 * - tracks: Raw track data array
 * 
 * @example
 * ```tsx
 * const { loading, error, stats, tracks } = useDataset();
 * if (loading) return <Loading />;
 * if (error) return <Error message={error} />;
 * return <Dashboard stats={stats} />;
 * ```
 */
export function useDataset() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/dataset.csv');
        if (!response.ok) throw new Error('Failed to load dataset');
        
        const csvText = await response.text();
        const parsedTracks = parseCSV(csvText);
        const computedStats = computeStats(parsedTracks);
        setTracks(parsedTracks);
        setStats(computedStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  return { loading, error, stats, tracks };
}
