/**
 * @fileoverview Analytics charts for the dashboard
 * Contains all Recharts visualizations for audio features, genres, tempo, etc.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Heart, TrendingUp, Activity, Zap, Users } from "lucide-react";
import { DatasetStats, CHART_TOOLTIP_STYLE } from "./types";

interface AnalyticsChartsProps {
  /** Dataset statistics */
  datasetStats: DatasetStats;
  /** Whether there's generated playlist data */
  hasPlaylistData: boolean;
  /** Average audio features from generated playlist */
  playlistAudioFeatures?: { energy: number; danceability: number };
  /** Combined audio features data for radar chart */
  combinedAudioFeatures: Array<{
    feature: string;
    dataset: number;
    personal?: number;
    fullMark: number;
  }>;
  /** Combined genre data for pie chart */
  combinedGenres: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

/**
 * Grid of analytics charts showing various data visualizations
 */
export function AnalyticsCharts({
  datasetStats,
  hasPlaylistData,
  playlistAudioFeatures,
  combinedAudioFeatures,
  combinedGenres,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Genre Distribution Pie Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {hasPlaylistData ? "Generated Playlist Genres" : "Genre Distribution"}
          </CardTitle>
          <CardDescription>
            {hasPlaylistData
              ? "Based on your generated playlist"
              : "Distribution across the 114k track dataset"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={combinedGenres}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {combinedGenres.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [
                  value.toLocaleString() + " tracks",
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Audio Features Radar Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Audio Features Profile
          </CardTitle>
          <CardDescription>
            {hasPlaylistData
              ? "Generated playlist vs dataset average"
              : "Average audio characteristics across all tracks"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={combinedAudioFeatures}>
              <PolarGrid stroke="hsl(0 0% 25%)" />
              <PolarAngleAxis dataKey="feature" tick={{ fill: "hsl(0 0% 65%)", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: "hsl(0 0% 65%)" }} />
              <Radar
                name="Dataset Average"
                dataKey="dataset"
                stroke="#1DB954"
                fill="#1DB954"
                fillOpacity={0.3}
              />
              {hasPlaylistData && (
                <Radar
                  name="Generated Playlist"
                  dataKey="personal"
                  stroke="#FF6B9D"
                  fill="#FF6B9D"
                  fillOpacity={0.3}
                />
              )}
              <Legend />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Popularity Distribution Bar Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Popularity Distribution
          </CardTitle>
          <CardDescription>Track count by popularity score range (0-100)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datasetStats.popularityDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis dataKey="range" tick={{ fill: "hsl(0 0% 65%)" }} />
              <YAxis tick={{ fill: "hsl(0 0% 65%)" }} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [value.toLocaleString() + " tracks", "Count"]}
              />
              <Bar dataKey="count" fill="#1DB954" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tempo Distribution Area Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Tempo Distribution
          </CardTitle>
          <CardDescription>Track count by BPM range (beats per minute)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={datasetStats.tempoDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis dataKey="tempo" tick={{ fill: "hsl(0 0% 65%)" }} />
              <YAxis tick={{ fill: "hsl(0 0% 65%)" }} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [value.toLocaleString() + " tracks", "Count"]}
              />
              <Area type="monotone" dataKey="count" stroke="#1E90FF" fill="#1E90FF" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Energy vs Danceability Scatter Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Energy vs Danceability
          </CardTitle>
          <CardDescription>Correlation between high-energy and danceable tracks by genre</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis
                type="number"
                dataKey="energy"
                name="Energy"
                tick={{ fill: "hsl(0 0% 65%)" }}
                domain={[0, 1]}
                label={{ value: "Energy", position: "bottom", fill: "hsl(0 0% 65%)" }}
              />
              <YAxis
                type="number"
                dataKey="danceability"
                name="Danceability"
                tick={{ fill: "hsl(0 0% 65%)" }}
                domain={[0, 1]}
                label={{ value: "Danceability", angle: -90, position: "insideLeft", fill: "hsl(0 0% 65%)" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Scatter name="Dataset Genres" data={datasetStats.energyVsDanceability} fill="#1DB954" />
              {hasPlaylistData && playlistAudioFeatures && (
                <Scatter
                  name="Generated Playlist"
                  data={[playlistAudioFeatures]}
                  fill="#FF6B9D"
                  shape="star"
                />
              )}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Genres Bar Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Top Genres by Track Count
          </CardTitle>
          <CardDescription>Most represented genres in the 114k track dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datasetStats.genreDistribution.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis type="number" tick={{ fill: "hsl(0 0% 65%)" }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "hsl(0 0% 65%)" }} width={80} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [value.toLocaleString() + " tracks", "Count"]}
              />
              <Bar dataKey="value" fill="#9B59B6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
