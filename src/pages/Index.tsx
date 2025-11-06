import { Navbar } from "@/components/Navbar";
import { TrackCard } from "@/components/TrackCard";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

const Index = () => {
  const [selectedGenre, setSelectedGenre] = useState("pop");
  const [selectedCountry, setSelectedCountry] = useState("global");

  // Mock data for Global Now
  const globalTracks = [
    { rank: 1, title: "Midnight Dreams", artist: "Luna Eclipse", rankChange: 3 },
    { rank: 2, title: "Electric Pulse", artist: "Neon Waves", rankChange: -1 },
    { rank: 3, title: "Sunset Boulevard", artist: "The Wanderers", rankChange: "NEW" as const },
    { rank: 4, title: "Crystal Rain", artist: "Aurora Sky", rankChange: 2 },
    { rank: 5, title: "Urban Legends", artist: "Metro Kings", rankChange: -2 },
    { rank: 6, title: "Velvet Nights", artist: "Smooth Operators", rankChange: 1 },
    { rank: 7, title: "Digital Love", artist: "Cyber Hearts", rankChange: "NEW" as const },
    { rank: 8, title: "Ocean Drive", artist: "Coastal Vibes", rankChange: -3 },
    { rank: 9, title: "Neon Tokyo", artist: "Future Sound", rankChange: 4 },
    { rank: 10, title: "Starlight Serenade", artist: "Night Owls", rankChange: 1 },
  ];

  // Mock data for Genre tracks
  const genreTracks = {
    pop: [
      { title: "Pop Sensation", artist: "Chart Toppers" },
      { title: "Summer Vibes", artist: "Beach Boys Revival" },
      { title: "Dance Floor", artist: "Party People" },
      { title: "Sweet Melody", artist: "Pop Princess" },
      { title: "Radio Hit", artist: "Mainstream Masters" },
    ],
    hiphop: [
      { title: "Street Chronicles", artist: "Urban Poets" },
      { title: "Boom Bap Classic", artist: "Old School Crew" },
      { title: "Trap King", artist: "Metro Boomin'" },
      { title: "Lyrical Flow", artist: "Wordsmith" },
      { title: "City Nights", artist: "Downtown Legends" },
    ],
    rock: [
      { title: "Thunder Road", artist: "Rock Legends" },
      { title: "Electric Guitar", artist: "Shred Masters" },
      { title: "Rebel Anthem", artist: "Wild Hearts" },
      { title: "Power Ballad", artist: "Arena Kings" },
      { title: "Heavy Riffs", artist: "Metal Gods" },
    ],
    rap: [
      { title: "Bars on Bars", artist: "Lyric Master" },
      { title: "Street Philosophy", artist: "Conscious Crew" },
      { title: "Flex Mode", artist: "Trap Lords" },
      { title: "Real Talk", artist: "Truth Tellers" },
      { title: "Underground Classic", artist: "Indie Rappers" },
    ],
    rnb: [
      { title: "Smooth Groove", artist: "Soul Singers" },
      { title: "Late Night Vibes", artist: "R&B Collective" },
      { title: "Love Notes", artist: "Velvet Voices" },
      { title: "Rhythm & Blues", artist: "Classic Soul" },
      { title: "Modern Romance", artist: "New Wave R&B" },
    ],
  };

  // Mock data for Pre-made Playlists
  const premadePlaylists = [
    {
      title: "Playlist 1",
      artist: "",
      type: "Playlist" as const,
    },
    {
      title: "Playlist 2",
      artist: "",
      type: "Playlist" as const,
    },
    {
      title: "Playlist 3",
      artist: "",
      type: "Playlist" as const,
    },
  ];

  // Mock data for Popular Albums/Songs of the Day
  const popularToday = [
    {
      title: "Midnight Dreams",
      artist: "Luna Eclipse",
      reason: "Top tracks of your favourite artist of the day",
      type: "Song" as const,
    },
    {
      title: "Electric Pulse",
      artist: "Neon Waves",
      reason: "Listeners of Metro Kings are listening to this album today",
      type: "Album" as const,
    },
    {
      title: "Urban Jazz",
      artist: "City Sounds",
      reason: "Top tracks of your favourite artist of the day",
      type: "Song" as const,
    },
  ];

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
              <h2 className="text-2xl font-bold text-foreground mb-1">Global Now</h2>
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
          
          <div className="grid gap-2">
            {globalTracks.slice(0, 5).map((track) => (
              <TrackCard
                key={track.rank}
                rank={track.rank}
                title={track.title}
                artist={track.artist}
                rankChange={track.rankChange}
                showRank={true}
              />
            ))}
          </div>
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

            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-4">
                {genreTracks[selectedGenre as keyof typeof genreTracks].slice(0, 4).map((track, index) => (
                  <div key={index} className="w-[160px] flex-shrink-0">
                    <TrackCard
                      title={track.title}
                      artist={track.artist}
                      layout="vertical"
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Tabs>
        </section>

        {/* Section 3: Made for You */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-1">Made for You</h2>
            <p className="text-sm text-muted-foreground">Personalized recommendations</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pre-made Playlists */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Pre-made Playlists</h3>
              <div className="grid gap-2">
                {premadePlaylists.map((track, index) => (
                  <TrackCard
                    key={index}
                    title={track.title}
                    artist={track.artist}
                    type={track.type}
                  />
                ))}
              </div>
            </div>

            {/* Popular Albums/Songs of the Day */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Top Choices for You</h3>
              <div className="grid gap-2">
                {popularToday.map((track, index) => (
                  <TrackCard
                    key={index}
                    title={track.title}
                    artist={track.artist}
                    reason={track.reason}
                    type={track.type}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
