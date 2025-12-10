import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useDataset } from "@/hooks/useDataset";
import { useSpotify } from "@/hooks/useSpotify";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Loader2, User, LogOut, RefreshCw, TrendingUp, Disc, Clock, Users, Zap, Activity, Heart } from "lucide-react";

const genreColors = [
  "#1DB954", "#1E90FF", "#FF6B9D", "#FFD700", "#FF8C00",
  "#9B59B6", "#00CED1", "#FF6347", "#32CD32", "#FF69B4"
];

const Dashboard = () => {
  const { loading: datasetLoading, error: datasetError, stats: datasetStats } = useDataset();
  const { isConnected, isLoading: spotifyLoading, spotifyData, connect, disconnect, fetchData } = useSpotify();

  const getCombinedAudioFeatures = () => {
    if (!datasetStats) return [];
    
    const features = ['Danceability', 'Energy', 'Speechiness', 'Acousticness', 'Instrumentalness', 'Liveness', 'Valence'];
    
    return features.map((feature) => {
      const datasetFeature = datasetStats.audioFeatures.find(f => f.feature === feature);
      const spotifyValue = spotifyData?.audioFeatures?.[feature.toLowerCase() as keyof typeof spotifyData.audioFeatures] || 0;
      
      return {
        feature,
        dataset: datasetFeature?.average || 0,
        personal: isConnected && spotifyData ? spotifyValue : undefined,
        fullMark: 1,
      };
    });
  };

  const getCombinedGenres = () => {
    if (!datasetStats) return [];
    
    if (!isConnected || !spotifyData?.topGenres) {
      return datasetStats.genreDistribution;
    }
    
    return spotifyData.topGenres.slice(0, 10).map((genre, i) => ({
      name: genre.name,
      value: genre.count,
      color: genreColors[i % genreColors.length],
    }));
  };

  if (datasetLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Loading dataset...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (datasetError || !datasetStats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center text-destructive">
            <h1 className="text-2xl font-bold">Error loading data</h1>
            <p>{datasetError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              {isConnected 
                ? `Personal stats combined with 114k track dataset` 
                : `Connect Spotify to see your personal analytics`}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isConnected && spotifyData?.profile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                {spotifyData.profile.image ? (
                  <img src={spotifyData.profile.image} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
                <span className="text-sm font-medium text-foreground">{spotifyData.profile.name}</span>
              </div>
            )}
            
            {isConnected ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={spotifyLoading}>
                  {spotifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={disconnect}>
                  <LogOut className="w-4 h-4 mr-1" /> Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connect} disabled={spotifyLoading} className="bg-[#1DB954] hover:bg-[#1ed760]">
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

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graphs">Analytics</TabsTrigger>
            <TabsTrigger value="personal" disabled={!isConnected}>Your Music</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Disc className="w-4 h-4 text-muted-foreground" />
                    <CardDescription>Total Tracks Analyzed</CardDescription>
                  </div>
                  <CardTitle className="text-3xl text-primary">{datasetStats.totalTracks.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <CardDescription>Unique Genres</CardDescription>
                  </div>
                  <CardTitle className="text-3xl text-primary">{datasetStats.uniqueGenres.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              {isConnected && spotifyData ? (
                <>
                  <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#1DB954]" />
                        <CardDescription className="text-[#1DB954]">Your Top Genres</CardDescription>
                      </div>
                      <CardTitle className="text-3xl text-[#1DB954]">{spotifyData.topGenres.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border-[#1DB954]/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#1DB954]" />
                        <CardDescription className="text-[#1DB954]">Your Energy Score</CardDescription>
                      </div>
                      <CardTitle className="text-3xl text-[#1DB954]">{(spotifyData.audioFeatures.energy * 100).toFixed(0)}%</CardTitle>
                    </CardHeader>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <CardDescription>Avg Popularity Score</CardDescription>
                      </div>
                      <CardTitle className="text-3xl text-primary">{datasetStats.avgPopularity}/100</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <CardDescription>Avg Track Length</CardDescription>
                      </div>
                      <CardTitle className="text-3xl text-primary">{datasetStats.avgDuration}</CardTitle>
                    </CardHeader>
                  </Card>
                </>
              )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Genre Distribution
                  </CardTitle>
                  <CardDescription>
                    {isConnected ? 'Your most listened genres based on top artists' : 'Most common genres across 114k tracks'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getCombinedGenres()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getCombinedGenres().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Audio Features Profile
                  </CardTitle>
                  <CardDescription>
                    {isConnected ? 'Your listening profile vs dataset average' : 'Average audio characteristics across all tracks'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getCombinedAudioFeatures()}>
                      <PolarGrid stroke="hsl(0 0% 20%)" />
                      <PolarAngleAxis dataKey="feature" tick={{ fill: 'hsl(0 0% 65%)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <Radar
                        name="Dataset Avg"
                        dataKey="dataset"
                        stroke="#1E90FF"
                        fill="#1E90FF"
                        fillOpacity={0.3}
                      />
                      {isConnected && spotifyData && (
                        <Radar
                          name="Your Profile"
                          dataKey="personal"
                          stroke="#1DB954"
                          fill="#1DB954"
                          fillOpacity={0.5}
                        />
                      )}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="graphs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Popularity Distribution
                  </CardTitle>
                  <CardDescription>How tracks are distributed across popularity scores (0-100)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datasetStats.popularityDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                      <XAxis dataKey="range" tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <YAxis tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }} 
                        formatter={(value: number) => [value.toLocaleString() + ' tracks', 'Count']}
                      />
                      <Bar dataKey="count" fill="#1DB954" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
                      <XAxis dataKey="tempo" tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <YAxis tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }}
                        formatter={(value: number) => [value.toLocaleString() + ' tracks', 'Count']}
                      />
                      <Area type="monotone" dataKey="count" stroke="#1E90FF" fill="#1E90FF" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
                      <XAxis type="number" dataKey="energy" name="Energy" tick={{ fill: 'hsl(0 0% 65%)' }} domain={[0, 1]} label={{ value: 'Energy', position: 'bottom', fill: 'hsl(0 0% 65%)' }} />
                      <YAxis type="number" dataKey="danceability" name="Danceability" tick={{ fill: 'hsl(0 0% 65%)' }} domain={[0, 1]} label={{ value: 'Danceability', angle: -90, position: 'insideLeft', fill: 'hsl(0 0% 65%)' }} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }}
                        formatter={(value: number) => value.toFixed(2)}
                      />
                      <Scatter name="Dataset Genres" data={datasetStats.energyVsDanceability} fill="#1DB954" />
                      {isConnected && spotifyData && (
                        <Scatter 
                          name="Your Profile" 
                          data={[{ energy: spotifyData.audioFeatures.energy, danceability: spotifyData.audioFeatures.danceability }]} 
                          fill="#FF6B9D"
                          shape="star"
                        />
                      )}
                      <Legend />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
                      <XAxis type="number" tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(0 0% 65%)' }} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }}
                        formatter={(value: number) => [value.toLocaleString() + ' tracks', 'Count']}
                      />
                      <Bar dataKey="value" fill="#9B59B6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="personal" className="space-y-6">
            {!isConnected ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Music className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect Your Spotify</h3>
                  <p className="text-muted-foreground mb-4">See your personal listening analytics</p>
                  <Button onClick={connect} className="bg-[#1DB954] hover:bg-[#1ed760]">
                    <Music className="w-4 h-4 mr-2" /> Connect Spotify
                  </Button>
                </CardContent>
              </Card>
            ) : spotifyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : spotifyData && (
              <div className="space-y-6">
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
                      <CardTitle className="text-2xl text-orange-400">{(spotifyData.audioFeatures.energy * 100).toFixed(0)}%</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/30">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-pink-400">Mood Score</CardDescription>
                      <CardTitle className="text-2xl text-pink-400">{(spotifyData.audioFeatures.valence * 100).toFixed(0)}%</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

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
                              <p className="text-xs text-muted-foreground truncate">{artist.genres.slice(0, 2).join(', ')}</p>
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
                              <p className="text-xs text-muted-foreground truncate">{track.artists.map(a => a.name).join(', ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Genres - Horizontal Bar Style like reference image */}
                  <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
                    <CardHeader>
                      <CardDescription className="text-orange-400">Your Top Genres</CardDescription>
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
                                backgroundColor: genreColors[i % genreColors.length],
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
                          <p className="text-xs text-muted-foreground truncate">{item.track.artists.map(a => a.name).join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
