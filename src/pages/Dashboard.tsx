/**
 * @fileoverview Dashboard page component
 * Main analytics dashboard displaying dataset statistics and personal Spotify data
 * 
 * Features:
 * - Overview tab with key metrics
 * - Analytics tab with interactive charts
 * - Personal music tab with Spotify integration
 * - Playlist creation functionality
 */

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataset } from "@/hooks/useDataset";
import { useSpotify } from "@/hooks/useSpotify";
import { useUserPlaylists } from "@/hooks/useUserPlaylists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecommendedTrack } from "@/lib/recommendations";
import {
  DashboardHeader,
  DashboardLoadingState,
  DashboardErrorState,
  StatsCards,
  AnalyticsCharts,
  PersonalMusicTab,
  GENRE_COLORS,
} from "@/components/dashboard";

/**
 * Parses the pre-defined playlist CSV and returns track data
 */
const loadPlaylistFromCSV = async (): Promise<RecommendedTrack[]> => {
  const response = await fetch('/data/playlist_juan.csv');
  const text = await response.text();
  const lines = text.trim().split('\n');
  
  // Skip header row
  const tracks: RecommendedTrack[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Parse CSV line (handling quoted fields)
    const match = line.match(/^(\d+),([^,]+),([^,]+),([^,]+),"?([^"]+)"?,([^,]+),(\d+)$/);
    if (match) {
      const [, , track_id, track_name, artists, album_name, track_genre, popularity] = match;
      tracks.push({
        track_id,
        track_name,
        artists,
        album_name,
        track_genre,
        popularity: parseInt(popularity, 10),
        danceability: 0.6,
        energy: 0.7,
        speechiness: 0.05,
        acousticness: 0.3,
        instrumentalness: 0.1,
        liveness: 0.15,
        valence: 0.5,
      } as RecommendedTrack);
    } else {
      // Fallback: simple split for non-quoted fields
      const parts = line.split(',');
      if (parts.length >= 7) {
        tracks.push({
          track_id: parts[1],
          track_name: parts[2],
          artists: parts[3],
          album_name: parts[4],
          track_genre: parts[5],
          popularity: parseInt(parts[6], 10),
          danceability: 0.6,
          energy: 0.7,
          speechiness: 0.05,
          acousticness: 0.3,
          instrumentalness: 0.1,
          liveness: 0.15,
          valence: 0.5,
        } as RecommendedTrack);
      }
    }
  }
  return tracks;
};

/**
 * Main Dashboard page component
 * Combines dataset analytics with personal Spotify data
 */
const Dashboard = () => {
  // Data hooks
  const { loading: datasetLoading, error: datasetError, stats: datasetStats, tracks } = useDataset();
  const { isConnected, isLoading: spotifyLoading, spotifyData, accessToken, connect, disconnect, fetchData } = useSpotify();
  const { addPlaylist } = useUserPlaylists();
  
  // Local state
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [generatedPlaylist, setGeneratedPlaylist] = useState<RecommendedTrack[]>([]);

  /**
   * Creates a personalized playlist from the pre-defined CSV data
   */
  const createRecommendedPlaylist = async () => {
    if (!accessToken) {
      toast.error("Please connect to Spotify first");
      return;
    }

    try {
      setIsCreatingPlaylist(true);
      toast.info("Loading playlist data...");

      // Load tracks from the pre-defined CSV
      const playlistTracks = await loadPlaylistFromCSV();
      console.log("Loaded playlist tracks:", playlistTracks.length);
      
      // Store tracks for analytics display
      setGeneratedPlaylist(playlistTracks);

      if (playlistTracks.length === 0) {
        throw new Error("Could not load playlist data");
      }

      toast.info("Creating playlist on Spotify...");

      // Send track IDs to edge function to create playlist
      const playlistName = `TrendTracks For You - ${new Date().toLocaleDateString()}`;
      const { data, error } = await supabase.functions.invoke("create-playlist", {
        body: {
          access_token: accessToken,
          playlist_name: playlistName,
          track_ids: playlistTracks.map((t) => t.track_id),
        },
      });

      if (error) throw error;

      if (data.success) {
        // Save playlist to user's collection for display on home page
        addPlaylist({
          id: data.playlist_id,
          name: playlistName,
          url: data.playlist_url,
          tracksCount: data.tracks_added,
          createdAt: new Date().toISOString(),
        });

        toast.success(`Playlist created with ${data.tracks_added} tracks!`, {
          action: data.playlist_url
            ? {
                label: "Open in Spotify",
                onClick: () => window.open(data.playlist_url, "_blank"),
              }
            : undefined,
        });
      } else {
        throw new Error(data.error || "Failed to create playlist");
      }
    } catch (error) {
      console.error("Create playlist error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create playlist");
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  /**
   * Combines dataset and generated playlist audio features for the radar chart
   */
  const getCombinedAudioFeatures = () => {
    if (!datasetStats) return [];

    const features = ["Danceability", "Energy", "Speechiness", "Acousticness", "Instrumentalness", "Liveness", "Valence"];

    return features.map((feature) => {
      const datasetFeature = datasetStats.audioFeatures.find((f) => f.feature === feature);
      
      // Calculate average from generated playlist if available
      let playlistValue = 0;
      if (generatedPlaylist.length > 0) {
        const featureKey = feature.toLowerCase() as keyof RecommendedTrack;
        const sum = generatedPlaylist.reduce((acc, track) => acc + (Number(track[featureKey]) || 0), 0);
        playlistValue = sum / generatedPlaylist.length;
      }

      return {
        feature,
        dataset: datasetFeature?.average || 0,
        personal: generatedPlaylist.length > 0 ? playlistValue : undefined,
        fullMark: 1,
      };
    });
  };

  /**
   * Gets genre distribution data for the pie chart
   * Uses generated playlist data when available, otherwise dataset data
   */
  const getCombinedGenres = () => {
    if (!datasetStats) return [];

    // If we have generated playlist, show those genres
    if (generatedPlaylist.length > 0) {
      const genreCounts = new Map<string, number>();
      for (const track of generatedPlaylist) {
        genreCounts.set(track.track_genre, (genreCounts.get(track.track_genre) || 0) + 1);
      }
      return Array.from(genreCounts.entries())
        .map(([name, value], i) => ({
          name,
          value,
          color: GENRE_COLORS[i % GENRE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    return datasetStats.genreDistribution;
  };

  /**
   * Gets individual tracks from generated playlist for scatter chart
   */
  const getPlaylistTracks = () => {
    return generatedPlaylist.map(t => ({
      energy: t.energy,
      danceability: t.danceability,
      track_name: t.track_name,
      track_genre: t.track_genre,
    }));
  };

  // Loading state
  if (datasetLoading) {
    return <DashboardLoadingState />;
  }

  // Error state
  if (datasetError || !datasetStats) {
    return <DashboardErrorState error={datasetError || "Unknown error"} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header with user profile and connection controls */}
        <DashboardHeader
          isConnected={isConnected}
          spotifyLoading={spotifyLoading}
          profile={spotifyData?.profile}
          onConnect={connect}
          onDisconnect={disconnect}
          onRefresh={fetchData}
        />

        {/* Tab navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graphs">Analytics</TabsTrigger>
            <TabsTrigger value="personal" disabled={!isConnected}>
              Your Music
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <StatsCards
              datasetStats={datasetStats}
              isConnected={isConnected}
              spotifyData={spotifyData}
            />
          </TabsContent>
          {/* Analytics Tab */}
          <TabsContent value="graphs" className="space-y-6">
            <AnalyticsCharts
              hasPlaylistData={generatedPlaylist.length > 0}
              playlistTracks={getPlaylistTracks()}
              combinedAudioFeatures={getCombinedAudioFeatures()}
              combinedGenres={getCombinedGenres()}
            />
          </TabsContent>

          {/* Personal Music Tab */}
          <TabsContent value="personal" className="space-y-6">
            <PersonalMusicTab
              isConnected={isConnected}
              spotifyLoading={spotifyLoading}
              spotifyData={spotifyData}
              isCreatingPlaylist={isCreatingPlaylist}
              onConnect={connect}
              onCreatePlaylist={createRecommendedPlaylist}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
