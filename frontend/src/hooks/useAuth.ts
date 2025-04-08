import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    
    setState({
      isAuthenticated,
      isLoading: false
    });
  }, []);

  return state;
} 