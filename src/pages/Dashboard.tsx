import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useDataset } from "@/hooks/useDataset";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { loading, error, stats } = useDataset();

  if (loading) {
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

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center text-destructive">
            <h1 className="text-2xl font-bold">Error loading data</h1>
            <p>{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real data from 114k track Spotify dataset</p>
        </div>

        <Tabs defaultValue="graphs" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graphs">Graphs</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Total Tracks</CardDescription>
                  <CardTitle className="text-3xl text-primary">{stats.totalTracks.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Genres</CardDescription>
                  <CardTitle className="text-3xl text-primary">{stats.uniqueGenres}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Avg Popularity</CardDescription>
                  <CardTitle className="text-3xl text-primary">{stats.avgPopularity}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Avg Duration</CardDescription>
                  <CardTitle className="text-3xl text-primary">{stats.avgDuration}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="graphs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Genre Distribution Pie Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Genre Distribution</CardTitle>
                  <CardDescription>Top 10 genres in the dataset</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.genreDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.genreDistribution.map((entry, index) => (
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

              {/* Audio Features Radar Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Audio Features Profile</CardTitle>
                  <CardDescription>Average audio characteristics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.audioFeatures}>
                      <PolarGrid stroke="hsl(0 0% 20%)" />
                      <PolarAngleAxis dataKey="feature" tick={{ fill: 'hsl(0 0% 65%)', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <Radar
                        name="Average"
                        dataKey="average"
                        stroke="hsl(141 76% 48%)"
                        fill="hsl(141 76% 48%)"
                        fillOpacity={0.5}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Popularity Distribution Bar Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Popularity Distribution</CardTitle>
                  <CardDescription>Track count by popularity range</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.popularityDistribution}>
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
                      />
                      <Bar dataKey="count" fill="hsl(141 76% 48%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tempo Distribution */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Tempo Distribution</CardTitle>
                  <CardDescription>BPM ranges across tracks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.tempoDistribution}>
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
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(200 76% 48%)"
                        fill="hsl(200 76% 48%)"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Energy vs Danceability Scatter */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Energy vs Danceability</CardTitle>
                  <CardDescription>Average by genre</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                      <XAxis type="number" dataKey="energy" name="Energy" tick={{ fill: 'hsl(0 0% 65%)' }} domain={[0, 1]} />
                      <YAxis type="number" dataKey="danceability" name="Danceability" tick={{ fill: 'hsl(0 0% 65%)' }} domain={[0, 1]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }}
                        formatter={(value: number, name: string) => [value.toFixed(2), name]}
                        labelFormatter={(label) => `Genre: ${stats.energyVsDanceability.find(d => d.energy === label)?.genre || ''}`}
                      />
                      <Scatter name="Genres" data={stats.energyVsDanceability} fill="hsl(141 76% 48%)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Genres Bar Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Top Genres by Track Count</CardTitle>
                  <CardDescription>Most represented genres</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.genreDistribution.slice(0, 8)} layout="vertical">
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
                      />
                      <Bar dataKey="value" fill="hsl(280 76% 48%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Most Streamed Genre */}
              <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardHeader>
                  <CardDescription className="text-primary font-medium">Top Genre</CardDescription>
                  <CardTitle className="text-2xl">Most Common Genre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-5xl font-bold text-primary capitalize">{stats.topGenre}</div>
                  <p className="text-muted-foreground">
                    {stats.genreDistribution[0]?.value.toLocaleString()} tracks in dataset
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {stats.genreDistribution.slice(1, 3).map((genre) => (
                      <span key={genre.name} className="px-3 py-1 bg-primary/20 rounded-full text-xs text-primary capitalize">
                        {genre.name} - {genre.value.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Artists */}
              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardHeader>
                  <CardDescription className="text-purple-400 font-medium">Top Artists</CardDescription>
                  <CardTitle className="text-2xl">Most Featured Artists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topArtists.map((artist) => (
                      <div key={artist.rank} className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-purple-400 w-6">{artist.rank}</span>
                        <span className="text-2xl">{artist.image}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{artist.name}</p>
                          <p className="text-xs text-muted-foreground">{artist.streams}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Tracks */}
              <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardHeader>
                  <CardDescription className="text-orange-400 font-medium">Top Tracks</CardDescription>
                  <CardTitle className="text-2xl">Most Popular Songs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topTracks.map((song) => (
                      <div key={song.rank} className="flex items-center gap-3">
                        <span className={`text-2xl font-bold w-6 ${song.rank === 1 ? "text-orange-400" : "text-muted-foreground"}`}>
                          {song.rank}
                        </span>
                        <div className="w-10 h-10 bg-orange-500/20 rounded flex items-center justify-center text-orange-400">
                          ♪
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                          <p className="text-xs text-orange-400">{song.plays}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{stats.totalTracks.toLocaleString()}</div>
                  <p className="text-muted-foreground text-sm">Total Tracks</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-purple-400">{stats.uniqueGenres}</div>
                  <p className="text-muted-foreground text-sm">Unique Genres</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-orange-400">{stats.topArtists.length > 0 ? stats.topArtists.length : 0}+</div>
                  <p className="text-muted-foreground text-sm">Top Artists</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-400">{stats.avgPopularity}</div>
                  <p className="text-muted-foreground text-sm">Avg Popularity</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
