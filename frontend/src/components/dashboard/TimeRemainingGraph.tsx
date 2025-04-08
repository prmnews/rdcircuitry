import { useRef, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { timerApi } from "@/services/api";

interface TimeRemainingGraphProps {
  data?: { hour: number; value: number }[];
}

export default function TimeRemainingGraph({ data: propData }: TimeRemainingGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{ hour: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data from API if no prop data is provided
  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await timerApi.getTimeRemainingHistory();
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load graph data');
        }
      } catch (err) {
        console.error('Error fetching time remaining history:', err);
        setError('Failed to load graph data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [propData]);
  
  // Draw chart when data changes
  useEffect(() => {
    if (loading || !data.length || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find min and max values
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 1); // At least 1 minute
    const minValue = Math.min(...values, 0);
    
    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    
    // X-axis
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw Y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Draw Y-axis gridlines and labels
    const yStep = graphHeight / 4;
    for (let i = 0; i <= 4; i++) {
      const y = height - padding - (i * yStep);
      const value = Math.round(minValue + ((maxValue - minValue) * (i / 4)));
      
      // Gridline
      ctx.beginPath();
      ctx.strokeStyle = '#f3f4f6';
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      // Label
      ctx.fillText(value.toString(), padding - 5, y);
    }
    
    // Draw X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const xStep = graphWidth / 24;
    for (let i = 0; i < 24; i += 4) {
      const x = padding + (i * xStep);
      ctx.fillText(`${i}:00`, x, height - padding + 5);
    }
    
    // Draw area chart
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    data.forEach((point, i) => {
      const x = padding + (i * xStep);
      const normalizedValue = (point.value - minValue) / (maxValue - minValue);
      const y = height - padding - (normalizedValue * graphHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Close the path to x-axis
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    
    // Fill area
    ctx.fillStyle = 'rgba(209, 213, 219, 0.5)';
    ctx.fill();
    
    // Draw line on top of area
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = padding + (i * xStep);
      const normalizedValue = (point.value - minValue) / (maxValue - minValue);
      const y = height - padding - (normalizedValue * graphHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.stroke();
    
  }, [data, loading]);
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Time Remaining Over 24 Hours</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-[180px] sm:h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[180px] sm:h-[200px] text-destructive text-sm">
            {error}
          </div>
        ) : (
          <div className="h-[180px] sm:h-[200px] w-full">
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={200} 
              className="max-w-full h-full"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 