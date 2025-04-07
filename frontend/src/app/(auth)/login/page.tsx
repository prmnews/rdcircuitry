"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [pinNumber, setPinNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName || !pinNumber) {
      toast.error('Username and PIN are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authApi.login(userName, pinNumber);
      
      if (response.success) {
        toast.success('Login successful');
        router.push('/dashboard');
      } else {
        toast.error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access the dashboard
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label 
              htmlFor="userName" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Username
            </label>
            <input
              id="userName"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label 
              htmlFor="pinNumber" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              PIN Number
            </label>
            <input
              id="pinNumber"
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={pinNumber}
              onChange={(e) => setPinNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter>
        <p className="text-xs text-center text-muted-foreground w-full">
          By continuing, you agree to accept our Privacy Policy & Terms of Service.
        </p>
      </CardFooter>
    </Card>
  );
} 