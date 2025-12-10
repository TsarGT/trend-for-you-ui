import { useState, useEffect } from 'react';
import { parseCSV, computeStats, Track } from '@/lib/csvParser';

export function useDataset() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/dataset.csv');
        if (!response.ok) throw new Error('Failed to load dataset');
        
        const csvText = await response.text();
        const tracks = parseCSV(csvText);
        const computedStats = computeStats(tracks);
        setStats(computedStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  return { loading, error, stats };
}
