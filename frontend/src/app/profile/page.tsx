'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import RouteProtection from '@/components/RouteProtection';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [user, setUser] = useState<{
    userName: string;
    pinNumber: string;
    apiKey: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Fetch user profile data
    const fetchUserProfile = async () => {
      try {
        const response = await authApi.getCurrentUser();
        
        if (response.success && response.user) {
          // For the PIN, we'll just show a masked version
          setUser({
            userName: response.user.userName,
            pinNumber: '••••••', // Masked PIN
            apiKey: 'API-XXXX-XXXX-XXXX', // We don't have access to API key in the user object
          });
        } else {
          toast.error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('An error occurred while fetching your profile');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RouteProtection>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">User Profile</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account information used for authentication</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">Username</label>
              <Input
                id="username"
                value={user?.userName || ''}
                disabled
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pin">PIN Number</label>
              <Input
                id="pin"
                type="password"
                value={user?.pinNumber || ''}
                disabled
                readOnly
              />
              <p className="text-xs text-gray-500">Your PIN is securely stored and masked for security reasons</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="apiKey">API Key</label>
              <Input
                id="apiKey"
                value={user?.apiKey || ''}
                disabled
                readOnly
              />
              <p className="text-xs text-gray-500">Used for authentication with our services</p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </RouteProtection>
  );
} 