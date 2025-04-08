import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RotateCw } from "lucide-react";

interface ResetEventsProps {
  resetEvents?: {
    total: number;
    last24Hours: number;
  } | null;
}

export default function ResetEventsCard({ resetEvents }: ResetEventsProps) {
  const last24Hours = resetEvents?.last24Hours || 0;
  const hourlyAverage = last24Hours / 24;
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Reset Events (24h)</CardTitle>
        <RotateCw className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{last24Hours}</div>
        <p className="text-xs text-muted-foreground mt-1">
          +{resetEvents?.last24Hours || 0} from last hour
        </p>
      </CardContent>
    </Card>
  );
} 