/**
 * @fileoverview Personal music tab component
 * Displays generated playlist data or prompts to create a playlist
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Loader2, ListMusic, Sparkles } from "lucide-react";
import { SpotifyData, GENRE_COLORS } from "./types";
import { RecommendedTrack } from "@/lib/recommendations";

interface PersonalMusicTabProps {
  /** Whether user is connected to Spotify */
  isConnected: boolean;
  /** Whether Spotify data is loading */
  spotifyLoading: boolean;
  /** User's Spotify data */
  spotifyData?: SpotifyData | null;
  /** Whether playlist is being created */
  isCreatingPlaylist: boolean;
  /** Generated playlist tracks */
  generatedPlaylist: RecommendedTrack[];
  /** Callback to connect to Spotify */
  onConnect: () => void;
  /** Callback to create a recommended playlist */
  onCreatePlaylist: () => void;
}

/**
 * Personal music tab showing generated playlist data
 */
export function PersonalMusicTab({
  isConnected,
  spotifyLoading,
  spotifyData,
  isCreatingPlaylist,
  generatedPlaylist,
  onConnect,
  onCreatePlaylist,
}: PersonalMusicTabProps) {
  // Not connected state
  if (!isConnected) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Connect Your Spotify</h3>
          <p className="text-muted-foreground mb-4">See your personal listening analytics</p>
          <Button onClick={onConnect} className="bg-[#1DB954] hover:bg-[#1ed760]">
            <Music className="w-4 h-4 mr-2" /> Connect Spotify
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (spotifyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No playlist generated yet
  if (generatedPlaylist.length === 0) {
    return (
      <div className="space-y-6">
        {/* Create Playlist CTA */}
        <Card className="bg-gradient-to-r from-[#1DB954]/30 via-purple-500/20 to-pink-500/20 border-[#1DB954]/40">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="p-4 rounded-full bg-[#1DB954]/20">
              <Sparkles className="w-12 h-12 text-[#1DB954]" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">Create Your Personalized Playlist</h3>
              <p className="text-muted-foreground max-w-md">
                Click the button below to generate a custom playlist based on curated recommendations
              </p>
            </div>
            <Button
              onClick={onCreatePlaylist}
              disabled={isCreatingPlaylist}
              size="lg"
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold mt-4"
            >
              {isCreatingPlaylist ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ListMusic className="w-4 h-4 mr-2" />
              )}
              {isCreatingPlaylist ? "Creating..." : "Create Playlist"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats from generated playlist
  const uniqueGenres = [...new Set(generatedPlaylist.map(t => t.track_genre))];
  const uniqueArtists = [...new Set(generatedPlaylist.map(t => t.artists))];
  const avgEnergy = generatedPlaylist.reduce((sum, t) => sum + t.energy, 0) / generatedPlaylist.length;
  const avgValence = generatedPlaylist.reduce((sum, t) => sum + t.valence, 0) / generatedPlaylist.length;

  // Get genre counts
  const genreCounts = new Map<string, number>();
  generatedPlaylist.forEach(track => {
    genreCounts.set(track.track_genre, (genreCounts.get(track.track_genre) || 0) + 1);
  });
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Create Another Playlist CTA */}
      <Card className="bg-gradient-to-r from-[#1DB954]/30 via-purple-500/20 to-pink-500/20 border-[#1DB954]/40">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#1DB954]/20">
              <Sparkles className="w-8 h-8 text-[#1DB954]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Your Generated Playlist</h3>
              <p className="text-sm text-muted-foreground">{generatedPlaylist.length} tracks curated for you</p>
            </div>
          </div>
          <Button
            onClick={onCreatePlaylist}
            disabled={isCreatingPlaylist}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold"
          >
            {isCreatingPlaylist ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ListMusic className="w-4 h-4 mr-2" />
            )}
            {isCreatingPlaylist ? "Creating..." : "Create New Playlist"}
          </Button>
        </CardContent>
      </Card>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#1DB954]">Total Tracks</CardDescription>
            <CardTitle className="text-2xl text-[#1DB954]">{generatedPlaylist.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-400">Unique Genres</CardDescription>
            <CardTitle className="text-2xl text-purple-400">{uniqueGenres.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-400">Avg Energy</CardDescription>
            <CardTitle className="text-2xl text-orange-400">
              {(avgEnergy * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-pink-400">Mood Score</CardDescription>
            <CardTitle className="text-2xl text-pink-400">
              {(avgValence * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist Artists */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
          <CardHeader>
            <CardDescription className="text-purple-400">Featured Artists</CardDescription>
            <CardTitle>Artists in Playlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uniqueArtists.slice(0, 5).map((artist, i) => (
                <div key={artist} className="flex items-center gap-3">
                  <span className="text-xl font-bold text-purple-400 w-6">{i + 1}</span>
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Playlist Tracks */}
        <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
          <CardHeader>
            <CardDescription className="text-[#1DB954]">Playlist Tracks</CardDescription>
            <CardTitle>Top Songs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedPlaylist.slice(0, 5).map((track, i) => (
                <div key={track.track_id} className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[#1DB954] w-6">{i + 1}</span>
                  <div className="w-10 h-10 bg-[#1DB954]/20 rounded flex items-center justify-center">
                    <Music className="w-5 h-5 text-[#1DB954]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{track.track_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artists}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Genre Distribution */}
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <CardHeader>
            <CardDescription className="text-orange-400">Playlist Genres</CardDescription>
            <CardTitle>Genre Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topGenres.map(([genre, count], i) => (
                <div key={genre} className="flex items-center gap-2">
                  <div
                    className="h-3 rounded-sm transition-all"
                    style={{
                      width: `${Math.max((count / topGenres[0][1]) * 100, 10)}%`,
                      backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length],
                    }}
                  />
                  <span className="text-sm text-foreground truncate flex-1 min-w-0">{genre}</span>
                  <span className="text-sm font-medium text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Playlist */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            Full Playlist
          </CardTitle>
          <CardDescription>All {generatedPlaylist.length} tracks in your generated playlist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {generatedPlaylist.map((track, i) => (
              <div key={`${track.track_id}-${i}`} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{track.track_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artists}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{track.track_genre}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
