import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Calendar } from "lucide-react";
import type { ResetEvents } from '@/types';

interface ResetEventsCardProps {
  resetEvents?: ResetEvents;
}

export default function ResetEventsCard({ resetEvents }: ResetEventsCardProps) {
  const last24Hours = resetEvents?.last24Hours || 0;
  const total = resetEvents?.total || 0;
  
  // Get percentage width for progress bar based on count
  const getPercentageWidth = (count: number): string => {
    if (count === 0) return '0%';
    if (count <= 3) return `${count * 10}%`;
    if (count <= 5) return `${count * 8}%`;
    if (count <= 10) return `${count * 6}%`;
    return '100%';
  };

  // Get color for progress bar based on count
  const getColorClass = (count: number): string => {
    if (count <= 3) return 'bg-green-500';
    if (count <= 5) return 'bg-yellow-500';
    if (count <= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Reset Events</CardTitle>
          <CardDescription>
            Timer reset statistics
          </CardDescription>
        </div>
        <BarChart className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Last 24 Hours</span>
            <span className="text-sm">{last24Hours}</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${getColorClass(last24Hours)} transition-all duration-500`}
              style={{ width: getPercentageWidth(last24Hours) }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">All Time</span>
            <span className="text-sm">{total}</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, (total / 100) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 