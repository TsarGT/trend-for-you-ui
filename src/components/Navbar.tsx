import { Music2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

export const Navbar = () => {
  const location = useLocation();
  
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
          
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            Log in with Spotify
          </Button>
        </div>
      </div>
    </nav>
  );
};
