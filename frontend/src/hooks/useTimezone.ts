import { useState, useEffect } from 'react';
import { User } from '@/types';

interface TimezoneState {
  gmtOffset: number;
  timeZone: string;
  countryCode: string;
  countryName: string;
}

export default function useTimezone(userData?: User | null) {
  const [userTimezone, setUserTimezone] = useState<TimezoneState>({
    gmtOffset: 0,
    timeZone: 'UTC',
    countryCode: 'US',
    countryName: 'United States'
  });

  useEffect(() => {
    if (userData?.location?.gmtOffset) {
      // Parse the offset properly, handling formats like "-08:00"
      let offsetHours: number;
      
      if (userData.location.gmtOffset.includes(':')) {
        // Format is like "-08:00" or "+08:00"
        const sign = userData.location.gmtOffset.startsWith('-') ? -1 : 1;
        const [hours, minutes] = userData.location.gmtOffset.substring(1).split(':').map(Number);
        offsetHours = sign * (hours + (minutes / 60));
      } else {
        // Simple hour format like "-8" or "8"
        offsetHours = parseInt(userData.location.gmtOffset, 10);
      }
      
      setUserTimezone({
        gmtOffset: offsetHours,
        timeZone: userData.location.timeZone || 'UTC',
        countryCode: userData.location.countryCode || 'US',
        countryName: userData.location.countryName || 'United States'
      });
    }
  }, [userData]);

  // Convert browser's local time to user's preferred timezone
  const toLocalTime = (browserTime: Date | string | null): Date | null => {
    if (!browserTime) return null;
    
    // Create a new date object from input
    const date = new Date(browserTime);
    
    // For debug purposes - log the input date and timezone info
    console.log('Browser time:', date);
    console.log('User timezone:', userTimezone);
    
    try {
      // The direct way to get time in the requested timezone
      // This creates a date string in the specified timezone and parses it back
      return new Date(
        date.toLocaleString('en-US', { timeZone: userTimezone.timeZone })
      );
    } catch (error) {
      console.error('Error converting timezone:', error);
      
      // Fallback method using timezone offset
      // 1. Convert to UTC first
      const utcDate = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds()
      );
      
      // 2. Apply the user's offset to get their local time
      // Note: gmtOffset is already negative for western timezones, so we add it
      const offsetMillis = userTimezone.gmtOffset * 60 * 60 * 1000;
      return new Date(utcDate.getTime() + offsetMillis);
    }
  };

  // Convert user's local time to UTC
  const toUTCTime = (localTime: Date | string | null): Date | null => {
    if (!localTime) return null;
    
    const date = new Date(localTime);
    // Calculate the offset in milliseconds (hours * 60 min * 60 sec * 1000 ms)
    const offsetMillis = userTimezone.gmtOffset * 60 * 60 * 1000;
    
    // Remove the user's GMT offset to get UTC time
    return new Date(date.getTime() - offsetMillis);
  };

  return {
    userTimezone,
    toLocalTime,
    toUTCTime
  };
} 