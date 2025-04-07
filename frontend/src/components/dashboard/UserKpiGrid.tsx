import { useState, useEffect } from 'react';
import { UserKpiStats } from '@/types';
import { userApi } from '@/services/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function UserKpiGrid() {
  const [users, setUsers] = useState<UserKpiStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await userApi.getUserKpiStats();
        setUsers(response.users);
      } catch (err) {
        console.error('Failed to fetch user KPI stats:', err);
        setError('Could not load user statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchUserStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Determine KPI color based on thresholds in .env
  const getKpiColor = (minRemainder: number): string => {
    // These values should be defined in your .env file
    const lowMinutes = Number(process.env.NEXT_PUBLIC_KPI_LOW_MINUTES || 1);
    const avgMinutes = Number(process.env.NEXT_PUBLIC_KPI_AVERAGE_MINUTES || 2);
    const highMinutes = Number(process.env.NEXT_PUBLIC_KPI_HIGH_MINUTES || 3);
    
    if (minRemainder <= lowMinutes) return 'bg-red-500';
    if (minRemainder <= avgMinutes) return 'bg-yellow-500';
    if (minRemainder <= highMinutes) return 'bg-green-500';
    return 'bg-blue-500'; // Exceeds high threshold
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Performance</CardTitle>
        <CardDescription>
          Timer reset statistics by user
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-6">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">No user data available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">KPI</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Min (min)</TableHead>
                <TableHead className="text-right">Avg (min)</TableHead>
                <TableHead className="text-right">Max (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className={`h-3 w-3 rounded-full ${getKpiColor(user.minRemainder)}`} />
                  </TableCell>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell className="text-right">{user.minRemainder.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{user.avgRemainder.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{user.maxRemainder.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 