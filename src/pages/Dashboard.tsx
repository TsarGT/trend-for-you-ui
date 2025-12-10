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

// Sample data extracted from the dataset for visualization
const genreDistribution = [
  { name: "acoustic", value: 1000, color: "hsl(141, 76%, 48%)" },
  { name: "pop", value: 950, color: "hsl(200, 76%, 48%)" },
  { name: "rock", value: 880, color: "hsl(340, 76%, 48%)" },
  { name: "hip-hop", value: 750, color: "hsl(280, 76%, 48%)" },
  { name: "electronic", value: 680, color: "hsl(50, 76%, 48%)" },
  { name: "jazz", value: 520, color: "hsl(180, 76%, 48%)" },
  { name: "r&b", value: 480, color: "hsl(20, 76%, 48%)" },
  { name: "country", value: 420, color: "hsl(100, 76%, 48%)" },
];

const audioFeatures = [
  { feature: "Danceability", average: 0.58, fullMark: 1 },
  { feature: "Energy", average: 0.52, fullMark: 1 },
  { feature: "Speechiness", average: 0.08, fullMark: 1 },
  { feature: "Acousticness", average: 0.35, fullMark: 1 },
  { feature: "Instrumentalness", average: 0.12, fullMark: 1 },
  { feature: "Liveness", average: 0.18, fullMark: 1 },
  { feature: "Valence", average: 0.45, fullMark: 1 },
];

const popularityDistribution = [
  { range: "0-20", count: 15000 },
  { range: "21-40", count: 28000 },
  { range: "41-60", count: 42000 },
  { range: "61-80", count: 22000 },
  { range: "81-100", count: 7000 },
];

const energyVsDanceability = [
  { energy: 0.2, danceability: 0.3, genre: "acoustic" },
  { energy: 0.4, danceability: 0.5, genre: "pop" },
  { energy: 0.6, danceability: 0.7, genre: "electronic" },
  { energy: 0.8, danceability: 0.6, genre: "rock" },
  { energy: 0.3, danceability: 0.8, genre: "hip-hop" },
  { energy: 0.5, danceability: 0.4, genre: "jazz" },
  { energy: 0.7, danceability: 0.5, genre: "r&b" },
  { energy: 0.4, danceability: 0.6, genre: "country" },
];

const tempoDistribution = [
  { tempo: "60-80", count: 12000 },
  { tempo: "80-100", count: 24000 },
  { tempo: "100-120", count: 35000 },
  { tempo: "120-140", count: 28000 },
  { tempo: "140-160", count: 11000 },
  { tempo: "160+", count: 4000 },
];

const monthlyListening = [
  { month: "Jan", hours: 45 },
  { month: "Feb", hours: 52 },
  { month: "Mar", hours: 48 },
  { month: "Apr", hours: 61 },
  { month: "May", hours: 55 },
  { month: "Jun", hours: 72 },
  { month: "Jul", hours: 68 },
  { month: "Aug", hours: 59 },
  { month: "Sep", hours: 63 },
  { month: "Oct", hours: 70 },
  { month: "Nov", hours: 75 },
  { month: "Dec", hours: 82 },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Explore your music data with interactive visualizations</p>
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
                  <CardTitle className="text-3xl text-primary">114,000</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Genres</CardDescription>
                  <CardTitle className="text-3xl text-primary">114</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Avg Popularity</CardDescription>
                  <CardTitle className="text-3xl text-primary">33.2</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardDescription>Avg Duration</CardDescription>
                  <CardTitle className="text-3xl text-primary">3:48</CardTitle>
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
                  <CardDescription>Top genres in the dataset</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genreDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genreDistribution.map((entry, index) => (
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
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={audioFeatures}>
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
                    <BarChart data={popularityDistribution}>
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
                    <AreaChart data={tempoDistribution}>
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
                  <CardDescription>Correlation by genre</CardDescription>
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
                      />
                      <Scatter name="Genres" data={energyVsDanceability} fill="hsl(141 76% 48%)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Listening Trend */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Monthly Listening Hours</CardTitle>
                  <CardDescription>Your listening activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyListening}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <YAxis tick={{ fill: 'hsl(0 0% 65%)' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(0 0% 11%)', 
                          border: '1px solid hsl(0 0% 20%)',
                          borderRadius: '8px',
                          color: 'hsl(0 0% 95%)'
                        }} 
                      />
                      <Bar dataKey="hours" fill="hsl(280 76% 48%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Most Common Key</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">C Major</p>
                  <p className="text-muted-foreground text-sm mt-2">Found in 18% of tracks</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Average Tempo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">120 BPM</p>
                  <p className="text-muted-foreground text-sm mt-2">Perfect for dancing!</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Explicit Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">12%</p>
                  <p className="text-muted-foreground text-sm mt-2">Of tracks are explicit</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Top Feature</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">Danceability</p>
                  <p className="text-muted-foreground text-sm mt-2">Avg: 0.58 out of 1.0</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Energy Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">Medium</p>
                  <p className="text-muted-foreground text-sm mt-2">Avg energy: 0.52</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Mood Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">Balanced</p>
                  <p className="text-muted-foreground text-sm mt-2">Valence: 0.45 (neutral)</p>
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
