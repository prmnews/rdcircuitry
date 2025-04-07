"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import UserKpiGrid from '@/components/dashboard/UserKpiGrid';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Check if user is authenticated (in a real app, use authentication hooks)
  useEffect(() => {
    // Simplified authentication check - replace with actual auth check
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
    setIsLoading(false);
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return null; // This will be redirected in useEffect
  }
  
  return (
    <main className="container mx-auto p-4">
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor timer states and user statistics
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <UserKpiGrid />
        </div>
      </div>
    </main>
  );
} 