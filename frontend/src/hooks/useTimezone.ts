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
      setUserTimezone({
        gmtOffset: parseInt(userData.location.gmtOffset, 10),
        timeZone: userData.location.timeZone || 'UTC',
        countryCode: userData.location.countryCode || 'US',
        countryName: userData.location.countryName || 'United States'
      });
    }
  }, [userData]);

  // Convert UTC to user's local time
  const toLocalTime = (utcTime: Date | string | null): Date | null => {
    if (!utcTime) return null;
    
    const date = new Date(utcTime);
    // Apply the user's GMT offset
    const localTime = new Date(date.getTime() + (userTimezone.gmtOffset * 60 * 1000));
    return localTime;
  };

  // Convert local time to UTC
  const toUTCTime = (localTime: Date | string | null): Date | null => {
    if (!localTime) return null;
    
    const date = new Date(localTime);
    // Remove the user's GMT offset
    const utcTime = new Date(date.getTime() - (userTimezone.gmtOffset * 60 * 1000));
    return utcTime;
  };

  return {
    userTimezone,
    toLocalTime,
    toUTCTime
  };
} 