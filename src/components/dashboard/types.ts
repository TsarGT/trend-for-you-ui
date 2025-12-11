/**
 * @fileoverview Type definitions for the Dashboard components
 * Contains shared interfaces used across dashboard modules
 */

import { computeStats } from "@/lib/csvParser";

/** Spotify profile information */
export interface SpotifyProfile {
  name: string;
  image?: string;
}

/** Spotify artist data */
export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}

/** Spotify track data */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
}

/** Recently played item from Spotify */
export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

/** Genre count data */
export interface GenreCount {
  name: string;
  count: number;
}

/** Audio features from Spotify */
export interface AudioFeatures {
  danceability: number;
  energy: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
}

/** Complete Spotify data object */
export interface SpotifyData {
  profile: SpotifyProfile;
  topArtists: {
    short: SpotifyArtist[];
    medium: SpotifyArtist[];
    long?: SpotifyArtist[];
  };
  topTracks: {
    short: SpotifyTrack[];
    medium: SpotifyTrack[];
    long?: SpotifyTrack[];
  };
  recentlyPlayed: RecentlyPlayedItem[];
  topGenres: GenreCount[];
  audioFeatures: AudioFeatures;
}

/** Dataset statistics type */
export type DatasetStats = ReturnType<typeof computeStats>;

/** Genre colors for charts */
export const GENRE_COLORS = [
  "#1DB954", "#1E90FF", "#FF6B9D", "#FFD700", "#FF8C00",
  "#9B59B6", "#00CED1", "#FF6347", "#32CD32", "#FF69B4"
] as const;

/** Tooltip style configuration for charts */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(0 0% 11%)',
  border: '1px solid hsl(0 0% 20%)',
  borderRadius: '8px',
  color: 'hsl(0 0% 95%)'
} as const;
