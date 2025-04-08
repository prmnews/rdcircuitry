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
  const [percentage, setPercentage] = useState(0);
  const [timeDisplay, setTimeDisplay] = useState('0m 0s');
  
  useEffect(() => {
    if (!expirationTime) return;
    
    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiration = new Date(expirationTime);
      const diff = expiration.getTime() - now.getTime();
      
      // If timer has expired
      if (diff <= 0) {
        setTimeDisplay('0m 0s');
        setPercentage(100);
        return;
      }
      
      // Calculate minutes and seconds
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      setTimeDisplay(`${minutes}m ${seconds}s`);
      
      // Calculate percentage
      const initialTime = initialMinutes * 60 * 1000; // convert to ms
      const elapsed = initialTime - diff;
      const percentComplete = Math.min(100, Math.max(0, (elapsed / initialTime) * 100));
      
      setPercentage(percentComplete);
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
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f3f4f6';
    ctx.fill();
    
    // Draw progress arc
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (percentage / 50) * Math.PI;
    
    ctx.arc(
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle
    );
    
    // Color based on percentage
    ctx.fillStyle = percentage >= 75 ? '#f59e0b' : '#f59e0b';
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
    
  }, [percentage, timeDisplay]);
  
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