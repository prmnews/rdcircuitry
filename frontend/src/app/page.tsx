'use client';

import { useState, useEffect } from 'react';
import { checkApiHealth } from '../services/api';
import { initializeSocket, closeSocket } from '../services/socket';

export default function Home() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [healthData, setHealthData] = useState<{ status: string; timestamp: string } | null>(null);

  useEffect(() => {
    // Check API health
    const checkHealth = async () => {
      try {
        const data = await checkApiHealth();
        setHealthData(data);
        setApiStatus('connected');
      } catch (error) {
        console.error('Health check failed:', error);
        setApiStatus('error');
      }
    };

    // Initialize socket connection
    const setupSocket = () => {
      try {
        setSocketStatus('connecting');
        const socket = initializeSocket();
        
        socket.on('connect', () => {
          setSocketStatus('connected');
        });
        
        socket.on('connect_error', () => {
          setSocketStatus('error');
        });
        
        socket.on('disconnect', () => {
          setSocketStatus('disconnected');
        });
      } catch (error) {
        console.error('Socket setup failed:', error);
        setSocketStatus('error');
      }
    };

    checkHealth();
    setupSocket();

    // Cleanup
    return () => {
      closeSocket();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <main className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          RD Circuitry
        </h1>
        
        <div className="grid gap-6 mb-8">
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Backend Connection Status</h2>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <span className="mr-2 font-medium">API Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  apiStatus === 'connected' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                    : apiStatus === 'loading' 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {apiStatus === 'connected' ? 'Connected' : apiStatus === 'loading' ? 'Connecting...' : 'Error'}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="mr-2 font-medium">Socket Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  socketStatus === 'connected' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                    : socketStatus === 'connecting' 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {socketStatus === 'connected' ? 'Connected' : socketStatus === 'connecting' ? 'Connecting...' : socketStatus === 'disconnected' ? 'Disconnected' : 'Error'}
                </span>
              </div>
              
              {healthData && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>Server time: {new Date(healthData.timestamp).toLocaleString()}</p>
                  <p>Status: {healthData.status}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Sprint 1 - Project Setup Complete</p>
        </div>
      </main>
    </div>
  );
}
