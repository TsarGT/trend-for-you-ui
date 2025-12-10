import { Music2, BarChart3, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSpotify } from "@/hooks/useSpotify";

export const Navbar = () => {
  const location = useLocation();
  const { isConnected, isLoading, spotifyData, connect, disconnect } = useSpotify();
  
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Music2 className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">TrendTracks</h1>
            </Link>
            
            <div className="flex items-center gap-1">
              <Link to="/">
                <Button 
                  variant={location.pathname === "/" ? "secondary" : "ghost"} 
                  size="sm"
                  className="text-sm"
                >
                  Home
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button 
                  variant={location.pathname === "/dashboard" ? "secondary" : "ghost"} 
                  size="sm"
                  className="text-sm gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
          
          {isConnected ? (
            <div className="flex items-center gap-3">
              {spotifyData?.profile && (
                <div className="flex items-center gap-2">
                  {spotifyData.profile.image ? (
                    <img src={spotifyData.profile.image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-[#1DB954]/20 rounded-full flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-[#1DB954]" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground hidden sm:inline">{spotifyData.profile.name}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={disconnect}>
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Disconnect</span>
              </Button>
            </div>
          ) : (
            <Button 
              onClick={connect} 
              disabled={isLoading}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Music2 className="w-4 h-4 mr-2" />
              )}
              Log in with Spotify
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
