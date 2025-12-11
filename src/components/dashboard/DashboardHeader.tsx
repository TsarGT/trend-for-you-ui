/**
 * @fileoverview Dashboard header component
 * Displays the page title, user profile (when connected), and Spotify connection controls
 */

import { Button } from "@/components/ui/button";
import { Music, Loader2, User, LogOut, RefreshCw } from "lucide-react";
import { SpotifyProfile } from "./types";

interface DashboardHeaderProps {
  /** Whether the user is connected to Spotify */
  isConnected: boolean;
  /** Whether Spotify operations are loading */
  spotifyLoading: boolean;
  /** User's Spotify profile data */
  profile?: SpotifyProfile;
  /** Callback to initiate Spotify connection */
  onConnect: () => void;
  /** Callback to disconnect from Spotify */
  onDisconnect: () => void;
  /** Callback to refresh Spotify data */
  onRefresh: () => void;
}

/**
 * Dashboard header with user profile and Spotify connection controls
 */
export function DashboardHeader({
  isConnected,
  spotifyLoading,
  profile,
  onConnect,
  onDisconnect,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          {isConnected
            ? "Personal stats combined with 114k track dataset"
            : "Connect Spotify to see your personal analytics"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* User profile badge */}
        {isConnected && profile && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
            {profile.image ? (
              <img src={profile.image} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
            <span className="text-sm font-medium text-foreground">{profile.name}</span>
          </div>
        )}

        {/* Connection controls */}
        {isConnected ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={spotifyLoading}>
              {spotifyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              <LogOut className="w-4 h-4 mr-1" /> Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={onConnect} disabled={spotifyLoading} className="bg-[#1DB954] hover:bg-[#1ed760]">
            {spotifyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Music className="w-4 h-4 mr-2" />
            )}
            Connect Spotify
          </Button>
        )}
      </div>
    </div>
  );
}
