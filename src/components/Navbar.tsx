import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Trending for You</h1>
          </div>
          
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            Log in with Spotify
          </Button>
        </div>
      </div>
    </nav>
  );
};
