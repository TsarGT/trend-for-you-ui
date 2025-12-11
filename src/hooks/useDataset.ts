import { useState, useEffect } from 'react';
import { parseCSV, computeStats, Track } from '@/lib/csvParser';

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
