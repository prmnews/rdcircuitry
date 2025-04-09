'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';
import { toast } from 'react-hot-toast';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Perform logout
    const performLogout = () => {
      try {
        // Clear token from localStorage
        authApi.logout();
        
        // Show success message
        toast.success('You have been logged out successfully');
        
        // Redirect to login page (using the path that matches the (auth) route group)
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        
        // Still redirect to login even if there's an error
        router.push('/login');
      }
    };

    // Execute logout immediately
    performLogout();
  }, [router]);

  // Show a loading indicator while logout is processing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-gray-600">Logging out...</p>
    </div>
  );
} 