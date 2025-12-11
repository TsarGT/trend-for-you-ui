/**
 * @fileoverview Analytics charts for the dashboard
 * Displays visualizations ONLY for generated playlist (model output) data
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
} from "recharts";
import { Heart, Activity, Zap, Music } from "lucide-react";
import { CHART_TOOLTIP_STYLE } from "./types";

interface PlaylistTrack {
  energy: number;
  danceability: number;
  track_name: string;
  track_genre: string;
}

interface AnalyticsChartsProps {
  /** Whether there's generated playlist data */
  hasPlaylistData: boolean;
  /** Individual tracks from generated playlist for scatter */
  playlistTracks: PlaylistTrack[];
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
 * Grid of analytics charts showing generated playlist data only
 */
export function AnalyticsCharts({
  hasPlaylistData,
  playlistTracks,
  combinedAudioFeatures,
  combinedGenres,
}: AnalyticsChartsProps) {
  // Show empty state if no playlist generated yet
  if (!hasPlaylistData) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Playlist Generated Yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Go to the "Your Music" tab and generate a personalized playlist to see analytics about your recommended tracks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Genre Distribution Pie Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Playlist Genre Distribution
          </CardTitle>
          <CardDescription>
            Genre breakdown of your generated playlist
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
            Playlist Audio Features
          </CardTitle>
          <CardDescription>
            Audio characteristics of your generated playlist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={combinedAudioFeatures}>
              <PolarGrid stroke="hsl(0 0% 25%)" />
              <PolarAngleAxis dataKey="feature" tick={{ fill: "hsl(0 0% 65%)", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: "hsl(0 0% 65%)" }} />
              <Radar
                name="Generated Playlist"
                dataKey="personal"
                stroke="#FF6B9D"
                fill="#FF6B9D"
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            </RadarChart>
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
          <CardDescription>
            Each track in your playlist plotted by audio features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis
                type="number"
                dataKey="energy"
                name="Energy"
                tick={{ fill: "hsl(0 0% 65%)" }}
                domain={[0, 1]}
                tickCount={6}
                label={{ value: "Energy", position: "bottom", fill: "hsl(0 0% 65%)", offset: 0 }}
              />
              <YAxis
                type="number"
                dataKey="danceability"
                name="Danceability"
                tick={{ fill: "hsl(0 0% 65%)" }}
                domain={[0, 1]}
                tickCount={6}
                label={{ value: "Danceability", angle: -90, position: "insideLeft", fill: "hsl(0 0% 65%)" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [value.toFixed(2), name]}
                labelFormatter={() => ""}
              />
              <Scatter 
                name="Playlist Tracks" 
                data={playlistTracks} 
                fill="#FF6B9D"
              />
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Genres Bar Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Top Genres in Playlist
          </CardTitle>
          <CardDescription>Most common genres in your generated playlist</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={combinedGenres.slice(0, 8)} layout="vertical">
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