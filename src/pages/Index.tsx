import { Navbar } from "@/components/Navbar";
import { TrackCard } from "@/components/TrackCard";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSpotify } from "@/hooks/useSpotify";
import { useUserPlaylists } from "@/hooks/useUserPlaylists";

interface Top50Track {
  rank: number;
  id: string;
  title: string;
  artist: string;
  album: string;
  albumImage: string;
  popularity: number;
  previewUrl?: string;
  externalUrl?: string;
}

const Index = () => {
  const [selectedGenre, setSelectedGenre] = useState("pop");
  const [selectedCountry, setSelectedCountry] = useState("global");
  const [globalTracks, setGlobalTracks] = useState<Top50Track[]>([]);
  const [genreTracks, setGenreTracks] = useState<Top50Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenreLoading, setIsGenreLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("");
  const { isConnected, connect, isLoading: spotifyLoading, accessToken } = useSpotify();
  const { playlists: userPlaylists } = useUserPlaylists();

  useEffect(() => {
    const fetchTop50 = async () => {
      try {
        setIsLoading(true);
        
        console.log('Fetching Top 50 - isConnected:', isConnected, 'hasToken:', !!accessToken);
        
        const { data, error } = await supabase.functions.invoke('spotify-top50', {
          body: { 
            country: selectedCountry,
            access_token: accessToken || null
          }
        });
        
        if (error) {
          console.error('Error fetching Top 50:', error);
          return;
        }
        
        console.log('Got data from source:', data?.source);
        
        if (data?.tracks) {
          setGlobalTracks(data.tracks);
          setDataSource(data.source || 'unknown');
        }
      } catch (err) {
        console.error('Failed to fetch Top 50:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTop50();
  }, [selectedCountry, isConnected, accessToken]);

  // Fetch genre tracks when genre changes
  useEffect(() => {
    const fetchGenreTracks = async () => {
      try {
        setIsGenreLoading(true);
        
        const { data, error } = await supabase.functions.invoke('spotify-genre', {
          body: { 
            genre: selectedGenre,
            access_token: accessToken || null
          }
        });
        
        if (error) {
          console.error('Error fetching genre tracks:', error);
          return;
        }
        
        if (data?.tracks) {
          setGenreTracks(data.tracks);
        }
      } catch (err) {
        console.error('Failed to fetch genre tracks:', err);
      } finally {
        setIsGenreLoading(false);
      }
    };

    fetchGenreTracks();
  }, [selectedGenre, accessToken]);

  // Curated Spotify playlists with actual links
  const premadePlaylists = [
    {
      title: "Today's Top Hits",
      artist: "",
      type: "Playlist" as const,
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
    },
    {
      title: "RapCaviar",
      artist: "",
      type: "Playlist" as const,
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd"
    },
    {
      title: "All Out 2010s",
      artist: "",
      type: "Playlist" as const,
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX5Ejj0EkURtP"
    },
  ];

  // Use top tracks for "Made for You" section
  const popularToday = globalTracks.slice(0, 3).map((track, idx) => ({
    title: track.title,
    artist: track.artist,
    albumImage: track.albumImage,
    reason: idx === 0 
      ? "Top track worldwide today" 
      : idx === 1 
        ? "Trending across all genres" 
        : "Rising fast this week",
    type: "Song" as const,
  }));

  const genres = [
    { id: "pop", label: "Pop" },
    { id: "hiphop", label: "Hip-Hop" },
    { id: "rock", label: "Rock" },
    { id: "rap", label: "Rap" },
    { id: "rnb", label: "R&B" },
  ];

  const countries = [
    { id: "global", label: "Global" },
    { id: "uk", label: "United Kingdom" },
    { id: "us", label: "United States" },
    { id: "spain", label: "Spain" },
    { id: "russia", label: "Russia" },
    { id: "germany", label: "Germany" },
    { id: "france", label: "France" },
    { id: "italy", label: "Italy" },
    { id: "japan", label: "Japan" },
    { id: "brazil", label: "Brazil" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Section 1: Global Now */}
        <section>
          <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Global Top 50</h2>
              <p className="text-sm text-muted-foreground">Top Trending Tracks Worldwide</p>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[160px] h-9 bg-secondary border-border text-sm">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-2">
              {globalTracks.slice(0, 10).map((track) => (
                <TrackCard
                  key={track.id}
                  rank={track.rank}
                  title={track.title}
                  artist={track.artist}
                  albumImage={track.albumImage}
                  showRank={true}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: By Genre */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-1">Top Tracks by Genre</h2>
            <p className="text-sm text-muted-foreground">Explore what's hot in your favorite genres</p>
          </div>

          <Tabs value={selectedGenre} onValueChange={setSelectedGenre} className="w-full">
            <TabsList className="bg-secondary mb-4 h-9">
              {genres.map((genre) => (
                <TabsTrigger
                  key={genre.id}
                  value={genre.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm px-3"
                >
                  {genre.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {isGenreLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-4">
                  {genreTracks.slice(0, 6).map((track, index) => (
                    <div key={track.id || index} className="w-[160px] flex-shrink-0">
                      <TrackCard
                        title={track.title}
                        artist={track.artist}
                        albumImage={track.albumImage}
                        layout="vertical"
                      />
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </Tabs>
        </section>

        {/* Section 3: Made for You */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-1">Made for You</h2>
            <p className="text-sm text-muted-foreground">Personalized recommendations</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Your Playlists / Pre-made Playlists */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {userPlaylists.length > 0 ? 'Your Playlists' : 'Pre-made Playlists'}
              </h3>
              <div className="grid gap-2">
                {userPlaylists.length > 0 ? (
                  userPlaylists.slice(0, 3).map((playlist) => (
                    <TrackCard
                      key={playlist.id}
                      title={playlist.name}
                      artist={`${playlist.tracksCount} tracks`}
                      type="Playlist"
                      spotifyUrl={playlist.url}
                    />
                  ))
                ) : (
                  premadePlaylists.map((playlist, index) => (
                    <TrackCard
                      key={index}
                      title={playlist.title}
                      artist={playlist.artist}
                      type={playlist.type}
                      spotifyUrl={playlist.spotifyUrl}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Popular Albums/Songs of the Day */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Top Choices for You</h3>
              <div className="grid gap-2">
                {popularToday.length > 0 ? (
                  popularToday.map((track, index) => (
                    <TrackCard
                      key={index}
                      title={track.title}
                      artist={track.artist}
                      albumImage={track.albumImage}
                      reason={track.reason}
                      type={track.type}
                    />
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">Loading recommendations...</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
