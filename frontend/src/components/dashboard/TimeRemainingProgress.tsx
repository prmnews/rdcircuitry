import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Timer } from "lucide-react";

interface TimeRemainingProgressProps {
  expirationTime?: string | null;
  initialMinutes?: number;
}

export default function TimeRemainingProgress({ 
  expirationTime, 
  initialMinutes = 5 
}: TimeRemainingProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [percentageRemaining, setPercentageRemaining] = useState(100);
  const [timeDisplay, setTimeDisplay] = useState('0m 0s');
  const [totalMinutesRemaining, setTotalMinutesRemaining] = useState(initialMinutes);
  const [alertLevel, setAlertLevel] = useState<'normal' | 'yellow' | 'red' | 'expired'>('normal');
  
  useEffect(() => {
    if (!expirationTime) return;
    
    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiration = new Date(expirationTime);
      const diff = expiration.getTime() - now.getTime();
      
      // If timer has expired
      if (diff <= 0) {
        setTimeDisplay('0m 0s');
        setPercentageRemaining(0);
        setTotalMinutesRemaining(0);
        setAlertLevel('expired');
        return;
      }
      
      // Calculate minutes and seconds
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const minutesWithFraction = minutes + (seconds / 60);
      
      setTimeDisplay(`${minutes}m ${seconds}s`);
      setTotalMinutesRemaining(minutesWithFraction);
      
      // Calculate percentage remaining
      const initialTime = initialMinutes * 60 * 1000; // convert to ms
      const percentRemaining = Math.min(100, Math.max(0, (diff / initialTime) * 100));
      
      setPercentageRemaining(percentRemaining);
      
      // Set alert levels based on env variables (matching TimeRemainingCard)
      const redMinutes = Number(process.env.NEXT_PUBLIC_MESSAGE_RED_MINUTES || 1);
      const yellowMinutes = Number(process.env.NEXT_PUBLIC_MESSAGE_YELLOW_MINUTES || 2);
      
      if (minutesWithFraction <= redMinutes) {
        setAlertLevel('red');
      } else if (minutesWithFraction <= yellowMinutes) {
        setAlertLevel('yellow');
      } else {
        setAlertLevel('normal');
      }
    };
    
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [expirationTime, initialMinutes]);
  
  // Draw the doughnut chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background circle (empty/gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f3f4f6';
    ctx.fill();
    
    // Draw remaining time arc (colored)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (percentageRemaining / 50) * Math.PI; // Sweep 180 degrees for 100%
    
    ctx.arc(
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle
    );
    
    // Color based on alert level - matching TimeRemainingCard
    const getColor = () => {
      if (alertLevel === 'expired') return '#ef4444'; // red when expired
      if (alertLevel === 'red') return '#ef4444'; // red
      if (alertLevel === 'yellow') return '#f59e0b'; // amber
      return '#10b981'; // green
    };
    
    ctx.fillStyle = getColor();
    ctx.fill();
    
    // Draw inner circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Draw text in center
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeDisplay, centerX, centerY);
    
  }, [percentageRemaining, timeDisplay, alertLevel]);
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Time Remaining Progress</CardTitle>
        <Timer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <canvas 
          ref={canvasRef} 
          width={200} 
          height={200} 
          className="max-w-full h-auto"
        />
      </CardContent>
    </Card>
  );
} 