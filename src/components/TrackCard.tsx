import { Music, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
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
}

export const TrackCard = ({
  rank,
  title,
  artist,
  rankChange,
  reason,
  layout = "horizontal",
  showRank = false,
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

  if (layout === "vertical") {
    return (
      <Card className="bg-card border-border hover:bg-secondary/50 transition-colors p-4 group cursor-pointer">
        <div className="flex flex-col gap-3">
          <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-1">{artist}</p>
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
    <Card className="bg-card border-border hover:bg-secondary/50 transition-colors p-4 group cursor-pointer">
      <div className="flex items-center gap-4">
        {showRank && rank && (
          <div className="flex-shrink-0 w-8 text-center">
            <span className="text-lg font-bold text-muted-foreground">{rank}</span>
          </div>
        )}
        
        <div className="w-14 h-14 flex-shrink-0 bg-muted rounded-md flex items-center justify-center overflow-hidden">
          <Music className="w-8 h-8 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-sm text-muted-foreground line-clamp-1">{artist}</p>
          {reason && (
            <p className="text-xs text-muted-foreground/80 line-clamp-1 pt-1">
              <span className="text-primary">Why this?</span> {reason}
            </p>
          )}
        </div>

        {rankChange && (
          <div className="flex-shrink-0">
            <Badge
              variant="outline"
              className="gap-1 border-none"
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
