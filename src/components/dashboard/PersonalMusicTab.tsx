/**
 * @fileoverview Personal music tab component
 * Displays user's Spotify data including top artists, tracks, genres, and recently played
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Loader2, ListMusic, Clock, Sparkles } from "lucide-react";
import { SpotifyData, GENRE_COLORS } from "./types";

interface PersonalMusicTabProps {
  /** Whether user is connected to Spotify */
  isConnected: boolean;
  /** Whether Spotify data is loading */
  spotifyLoading: boolean;
  /** User's Spotify data */
  spotifyData?: SpotifyData | null;
  /** Whether playlist is being created */
  isCreatingPlaylist: boolean;
  /** Callback to connect to Spotify */
  onConnect: () => void;
  /** Callback to create a recommended playlist */
  onCreatePlaylist: () => void;
}

/**
 * Personal music tab showing Spotify listening data
 */
export function PersonalMusicTab({
  isConnected,
  spotifyLoading,
  spotifyData,
  isCreatingPlaylist,
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

  // No data state
  if (!spotifyData) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No Spotify data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Playlist CTA */}
      <Card className="bg-gradient-to-r from-[#1DB954]/30 via-purple-500/20 to-pink-500/20 border-[#1DB954]/40">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#1DB954]/20">
              <Sparkles className="w-8 h-8 text-[#1DB954]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Get Personalized Recommendations</h3>
              <p className="text-sm text-muted-foreground">Create a playlist based on your listening habits</p>
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
            {isCreatingPlaylist ? "Creating..." : "Create Playlist"}
          </Button>
        </CardContent>
      </Card>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#1DB954]">Total Top Artists</CardDescription>
            <CardTitle className="text-2xl text-[#1DB954]">{spotifyData.topArtists.medium.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-400">Unique Genres</CardDescription>
            <CardTitle className="text-2xl text-purple-400">{spotifyData.topGenres.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-400">Avg Energy</CardDescription>
            <CardTitle className="text-2xl text-orange-400">
              {(spotifyData.audioFeatures.energy * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-pink-400">Mood Score</CardDescription>
            <CardTitle className="text-2xl text-pink-400">
              {(spotifyData.audioFeatures.valence * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Artists */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
          <CardHeader>
            <CardDescription className="text-purple-400">Your Top Artists</CardDescription>
            <CardTitle>Most Played Artists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spotifyData.topArtists.medium.slice(0, 5).map((artist, i) => (
                <div key={artist.id} className="flex items-center gap-3">
                  <span className="text-xl font-bold text-purple-400 w-6">{i + 1}</span>
                  {artist.images[0] ? (
                    <img src={artist.images[0].url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{artist.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {artist.genres.slice(0, 2).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tracks */}
        <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
          <CardHeader>
            <CardDescription className="text-[#1DB954]">Your Top Tracks</CardDescription>
            <CardTitle>Most Played Songs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spotifyData.topTracks.medium.slice(0, 5).map((track, i) => (
                <div key={track.id} className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[#1DB954] w-6">{i + 1}</span>
                  {track.album.images[0] ? (
                    <img src={track.album.images[0].url} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-[#1DB954]/20 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Genres */}
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <CardHeader>
            <CardDescription className="text-orange-400">Your Top Genre</CardDescription>
            <CardTitle>Genre Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {spotifyData.topGenres.slice(0, 8).map((genre, i) => (
                <div key={genre.name} className="flex items-center gap-2">
                  <div
                    className="h-3 rounded-sm transition-all"
                    style={{
                      width: `${Math.max((genre.count / spotifyData.topGenres[0].count) * 100, 10)}%`,
                      backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length],
                    }}
                  />
                  <span className="text-sm text-foreground truncate flex-1 min-w-0">{genre.name}</span>
                  <span className="text-sm font-medium text-muted-foreground">{genre.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Played */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recently Played
          </CardTitle>
          <CardDescription>Your latest listening activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {spotifyData.recentlyPlayed.slice(0, 10).map((item, i) => (
              <div key={`${item.track.id}-${i}`} className="group">
                {item.track.album.images[0] ? (
                  <img
                    src={item.track.album.images[0].url}
                    alt=""
                    className="w-full aspect-square rounded-lg object-cover mb-2 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted rounded-lg mb-2" />
                )}
                <p className="font-medium text-sm text-foreground truncate">{item.track.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.track.artists.map((a) => a.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
