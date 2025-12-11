/**
 * @fileoverview Loading state component for the Dashboard
 * Displays skeleton placeholders while data is being fetched
 */

import { Navbar } from "@/components/Navbar";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the dashboard while data loads
 */
export function DashboardLoadingState() {
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

/**
 * Error state for the dashboard when data fails to load
 */
export function DashboardErrorState({ error }: { error: string }) {
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
