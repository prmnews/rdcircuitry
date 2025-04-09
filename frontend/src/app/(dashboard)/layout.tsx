"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { timerApi } from '@/services/api';
import RouteProtection from '@/components/RouteProtection';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRDI, setIsRDI] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is logged in
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Check timer state for isRDI
      try {
        const timerState = await timerApi.getTimerState();
        setIsRDI(timerState.isRDI || false);
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking timer state:', error);
        // If we can't check state, assume authorized
        setIsAuthorized(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in the useEffect
  }

  return (
    <RouteProtection>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
            <div className="p-6">
              <h2 className="text-xl font-bold">RD Circuitry</h2>
            </div>
            <nav className="px-4 py-2">
              <ul className="space-y-2">
                <li>
                  <a 
                    href={isRDI ? '#' : '/dashboard'} 
                    className={`flex items-center px-4 py-2 rounded-md ${
                      isRDI 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={(e) => {
                      if (isRDI) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a 
                    href={isRDI ? '#' : '/profile'} 
                    className={`flex items-center px-4 py-2 rounded-md ${
                      isRDI 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={(e) => {
                      if (isRDI) {
                        e.preventDefault();
                      }
                    }}
                  >
                    User Profile
                  </a>
                </li>
                <li>
                  <a 
                    href="/logout" 
                    className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                  >
                    Logout
                  </a>
                </li>
              </ul>
            </nav>
          </aside>
          
          {/* Main content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteProtection>
  );
} 