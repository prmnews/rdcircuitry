import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { timerApi } from '@/services/api';

interface AppState {
  isLoading: boolean;
  isRDI: boolean;
}

/**
 * Hook to be used on app startup to check the current state
 * and enforce navigation restrictions based on timer state
 */
export function useAppState(): AppState {
  const router = useRouter();
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isRDI: false
  });

  useEffect(() => {
    const checkAppState = async () => {
      try {
        // Check if user is logged in
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          setState({
            isLoading: false,
            isRDI: false
          });
          return;
        }
        
        // If logged in, check timer state
        const timerState = await timerApi.getTimerState();
        
        // Update state with isRDI value
        setState({
          isLoading: false,
          isRDI: timerState.isRDI || false
        });
        
        // If isRDI is true, redirect to message page
        if (timerState.isRDI) {
          console.log('🔒 App startup: isRDI is true, redirecting to message page');
          router.push('/message');
        }
      } catch (error) {
        console.error('Error checking app state on startup:', error);
        setState({
          isLoading: false,
          isRDI: false
        });
      }
    };

    checkAppState();
  }, [router]);

  return state;
} 