/**
 * @fileoverview Statistics cards for the dashboard overview
 * Displays key metrics from both dataset and personal Spotify data
 */

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disc, Users, TrendingUp, Zap, Clock } from "lucide-react";
import { DatasetStats, SpotifyData } from "./types";

interface StatsCardsProps {
  /** Dataset statistics */
  datasetStats: DatasetStats;
  /** Whether user is connected to Spotify */
  isConnected: boolean;
  /** User's Spotify data */
  spotifyData?: SpotifyData | null;
}

/**
 * Grid of statistic cards showing key metrics
 */
export function StatsCards({ datasetStats, isConnected, spotifyData }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Tracks */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-muted-foreground" />
            <CardDescription>Total Tracks Analyzed</CardDescription>
          </div>
          <CardTitle className="text-3xl text-primary">
            {datasetStats.totalTracks.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Unique Genres */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <CardDescription>Unique Genres</CardDescription>
          </div>
          <CardTitle className="text-3xl text-primary">{datasetStats.uniqueGenres}</CardTitle>
        </CardHeader>
      </Card>

      {/* Conditional cards based on connection status */}
      {isConnected && spotifyData ? (
        <>
          {/* Top Genre (personal) */}
          <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1DB954]" />
                <CardDescription className="text-[#1DB954]">Your Top Genre</CardDescription>
              </div>
              <CardTitle className="text-2xl text-[#1DB954] capitalize">
                {spotifyData.topGenres[0]?.name || "N/A"}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Energy Score (personal) */}
          <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1DB954]" />
                <CardDescription className="text-[#1DB954]">Your Energy Score</CardDescription>
              </div>
              <CardTitle className="text-3xl text-[#1DB954]">
                {(spotifyData.audioFeatures.energy * 100).toFixed(0)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </>
      ) : (
        <>
          {/* Avg Popularity (dataset) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <CardDescription>Avg Popularity Score</CardDescription>
              </div>
              <CardTitle className="text-3xl text-primary">{datasetStats.avgPopularity}/100</CardTitle>
            </CardHeader>
          </Card>

          {/* Avg Duration (dataset) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardDescription>Avg Track Duration</CardDescription>
              </div>
              <CardTitle className="text-3xl text-primary">{datasetStats.avgDuration}</CardTitle>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  );
}
