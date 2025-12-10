import { Music, TrendingUp, TrendingDown, Sparkles, Disc3, Music2, ListMusic, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TrackCardProps {
  rank?: number;
  title: string;
  artist: string;
  rankChange?: number | "NEW";
  reason?: string;
  layout?: "horizontal" | "vertical";
  showRank?: boolean;
  type?: "Song" | "Album" | "Playlist";
  albumImage?: string;
  spotifyUrl?: string;
}

export const TrackCard = ({
  rank,
  title,
  artist,
  rankChange,
  reason,
  layout = "horizontal",
  showRank = false,
  type,
  albumImage,
  spotifyUrl,
}: TrackCardProps) => {
  const getRankChangeColor = () => {
    if (rankChange === "NEW") return "hsl(var(--rank-new))";
    if (typeof rankChange === "number") {
      return rankChange > 0 ? "hsl(var(--rank-up))" : "hsl(var(--rank-down))";
    }
    return "";
  };

  const getRankChangeIcon = () => {
    if (rankChange === "NEW") return <Sparkles className="w-3 h-3" />;
    if (typeof rankChange === "number") {
      return rankChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
    }
    return null;
  };

  const handleClick = () => {
    if (spotifyUrl) {
      window.open(spotifyUrl, '_blank');
    }
  };

  const renderAlbumArt = (size: "small" | "large" = "small") => {
    const sizeClasses = size === "large" ? "w-10 h-10" : "w-6 h-6";
    
    if (albumImage) {
      return (
        <img 
          src={albumImage} 
          alt={`${title} album art`}
          className="w-full h-full object-cover"
        />
      );
    }
    
    if (type === "Playlist") {
      return <ListMusic className={`${sizeClasses} text-muted-foreground`} />;
    }
    return <Music className={`${sizeClasses} text-muted-foreground`} />;
  };

  if (layout === "vertical") {
    return (
      <Card 
        className="bg-card border-border hover:bg-secondary/50 transition-colors p-3 group cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex flex-col gap-2">
          <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
            {renderAlbumArt("large")}
          </div>
          <div className="space-y-0.5">
            <h4 className={`font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors ${type === "Playlist" ? "text-base" : "text-sm"}`}>
              {title}
            </h4>
            {artist && <p className="text-xs text-muted-foreground line-clamp-1">{artist}</p>}
            {reason && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 pt-1">
                <span className="text-primary">Why this?</span> {reason}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-card border-border hover:bg-secondary/50 transition-colors p-3 group cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {showRank && rank && (
          <div className="flex-shrink-0 w-6 text-center">
            <span className="text-base font-bold text-muted-foreground">{rank}</span>
          </div>
        )}
        
        <div className="w-12 h-12 flex-shrink-0 bg-muted rounded-md flex items-center justify-center overflow-hidden">
          {renderAlbumArt("small")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors ${type === "Playlist" ? "text-base" : "text-sm"}`}>
              {title}
            </h4>
            {type && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 flex items-center gap-1">
                {type === "Album" ? <Disc3 className="w-3 h-3" /> : 
                 type === "Playlist" ? <ListMusic className="w-3 h-3" /> :
                 <Music2 className="w-3 h-3" />}
                {type}
              </Badge>
            )}
          </div>
          {artist && <p className="text-xs text-muted-foreground line-clamp-1">{artist}</p>}
          {reason && type !== "Playlist" && (
            <p className="text-xs text-muted-foreground/80 line-clamp-1 pt-1">
              <span className="text-primary">Why this?</span> {reason}
            </p>
          )}
        </div>

        {spotifyUrl && (
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}

        {rankChange && (
          <div className="flex-shrink-0">
            <Badge
              variant="outline"
              className="gap-1 border-none text-xs px-2 py-0.5"
              style={{ backgroundColor: getRankChangeColor(), color: "white" }}
            >
              {getRankChangeIcon()}
              {rankChange === "NEW" ? "NEW" : `${rankChange > 0 ? "+" : ""}${rankChange}`}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};