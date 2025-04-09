'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { timerApi } from '@/services/api';

interface RouteProtectionProps {
  children: React.ReactNode;
}

/**
 * Component to wrap routes and protect them based on timer state
 * If isRDI=true, it will redirect to /message and block access to other routes
 */
export default function RouteProtection({ children }: RouteProtectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  
  useEffect(() => {
    const checkRouteAccess = async () => {
      try {
        // Skip check for message page and auth-related pages
        if (
          pathname === '/message' || 
          pathname === '/login' || 
          pathname === '/logout' || 
          pathname.startsWith('/api/')
        ) {
          setIsAllowed(true);
          setIsLoading(false);
          return;
        }
        
        // Get token - if no token, allow as auth will handle
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          setIsAllowed(true);
          setIsLoading(false);
          return;
        }
        
        // Check timer state
        const timerState = await timerApi.getTimerState();
        
        if (timerState.isRDI) {
          console.log('🔒 RouteProtection: isRDI is true, redirecting to message page');
          router.push('/message');
          setIsAllowed(false);
        } else {
          setIsAllowed(true);
        }
      } catch (error) {
        console.error('Error in route protection:', error);
        // If we can't check, allow access and let other auth handle
        setIsAllowed(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkRouteAccess();
  }, [pathname, router]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAllowed ? children : null;
} 