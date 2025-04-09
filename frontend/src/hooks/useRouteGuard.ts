import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { timerApi } from '@/services/api';

interface RouteGuardState {
  isLoading: boolean;
  isAllowed: boolean;
}

/**
 * Hook to guard routes based on timer and RDI state
 * Will redirect to /message if isRDI=true and prevent access to other routes
 */
export function useRouteGuard(currentRoute: string): RouteGuardState {
  const router = useRouter();
  const [state, setState] = useState<RouteGuardState>({
    isLoading: true,
    isAllowed: false
  });

  useEffect(() => {
    // Don't run checks if we're already on the message page
    if (currentRoute === '/message') {
      setState({
        isLoading: false,
        isAllowed: true
      });
      return;
    }

    const checkTimerState = async () => {
      try {
        // Check the timer state
        const timerState = await timerApi.getTimerState();
        
        if (timerState.isRDI) {
          console.log('🔒 RDI is active, redirecting to message page');
          router.push('/message');
          setState({
            isLoading: false,
            isAllowed: false
          });
        } else {
          setState({
            isLoading: false,
            isAllowed: true
          });
        }
      } catch (error) {
        console.error('Error checking timer state:', error);
        // If we can't check state, allow access
        setState({
          isLoading: false,
          isAllowed: true
        });
      }
    };

    checkTimerState();
  }, [router, currentRoute]);

  return state;
} 