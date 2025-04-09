'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { messageApi } from '@/services/api';
import { formatDateTime } from '@/lib/utils';

export default function MessageBroadcastPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [triggerTime, setTriggerTime] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<string>('00:00:00');
  const [messageContent, setMessageContent] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('No further action possible. This application has successfully managed the isRDI state to a true condition.');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const startMessageTimer = async () => {
    try {
      console.log('🔴 DEBUGGING: Starting message timer');
      const response = await messageApi.startMessageTimer();
      console.log('🔴 DEBUGGING: Start message timer response:', response);
      
      if (response.success && response.timer) {
        setTimerActive(true);
        setTriggerTime(formatDateTime(new Date(response.timer.triggerTime)));
        const totalSeconds = Math.floor(response.timer.remainingTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setRemainingTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        if (response.timer.messageContent) {
          // Combine text and URL if available
          const messageText = response.timer.messageContent.text;
          const messageUrl = response.timer.messageContent.url;
          
          // Display both text and URL in the textarea
          setMessageContent(messageUrl ? `${messageText}\n\nURL: ${messageUrl}` : messageText);
        }
        
        console.log('🔴 DEBUGGING: Message timer started successfully');
      } else {
        console.log('🔴 DEBUGGING: Failed to start message timer:', response.message);
        setError(response.message || 'Failed to start message timer');
      }
    } catch (err) {
      console.error('Error starting message timer:', err);
      setError('Failed to start message timer');
    }
  };

  // Fetch timer status
  const fetchTimerStatus = async () => {
    try {
      console.log('🔴 DEBUGGING: Fetching message timer status');
      const response = await messageApi.getMessageStatus();
      console.log('🔴 DEBUGGING: Message status response:', response);
      
      if (response.connectionError) {
        setError('Connection to server failed. Please try again later.');
        return;
      }
      
      if (!response.success) {
        setError(response.message || 'Failed to fetch timer status');
        return;
      }
      
      setTimerActive(response.timerActive || false);
      setStatusMessage(response.message || 'No active timer');
      
      if (response.timer) {
        setTriggerTime(formatDateTime(new Date(response.timer.triggerTime)));
        
        if (response.timer.formattedRemaining) {
          setRemainingTime(response.timer.formattedRemaining);
        } else if (response.timer.remainingTime) {
          // Calculate formatted time
          const totalSeconds = Math.floor(response.timer.remainingTime / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          setRemainingTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
        
        if (response.timer.messageContent) {
          // Combine text and URL if available
          const messageText = response.timer.messageContent.text;
          const messageUrl = response.timer.messageContent.url;
          
          // Display both text and URL in the textarea
          setMessageContent(messageUrl ? `${messageText}\n\nURL: ${messageUrl}` : messageText);
        }
      } else if (!initialLoadDone) {
        // First time loading and no active timer - try to start one
        console.log('🔴 DEBUGGING: No active timer found, starting a new one');
        await startMessageTimer();
        setInitialLoadDone(true);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching timer status:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Initialize timer status and set up polling
  useEffect(() => {
    // Only check auth after auth loading is complete
    if (isLoading) return;
    
    if (!isAuthenticated) {
      console.log('🔴 DEBUGGING: User not authenticated, storing intended URL and redirecting to login');
      // Store the current URL to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', '/message');
      router.push('/login');
      return;
    }
    
    console.log('🔴 DEBUGGING: User is authenticated, fetching timer status');
    // Initial fetch
    fetchTimerStatus();
    
    // Set up polling interval
    const interval = setInterval(() => {
      fetchTimerStatus();
    }, 5000); // Update every 5 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, router]);

  // Return to dashboard
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Message Broadcast Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-3 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
              Loading message timer status...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Message Broadcast Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Message */}
          <div className={`p-3 rounded-md ${timerActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {statusMessage}
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}
          
          {/* Timer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1 text-gray-500">Trigger Time:</div>
              <div className="p-2 bg-gray-100 rounded text-gray-900 font-mono">
                {triggerTime || 'Not scheduled'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1 text-gray-500">Time Remaining:</div>
              <div className="p-2 bg-red-100 rounded text-gray-900 font-mono">
                {remainingTime}
              </div>
            </div>
          </div>
          
          {/* Message Content */}
          <div>
            <div className="text-sm font-medium mb-1 text-gray-500">Message Content:</div>
            <Textarea 
              value={messageContent}
              readOnly
              className="h-24 font-mono resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 