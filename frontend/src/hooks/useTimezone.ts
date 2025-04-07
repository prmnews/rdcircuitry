import { useState, useEffect } from 'react';

interface TimezoneData {
  gmtOffset: string | number;
  timeZone: string;
  countryCode: string;
  countryName: string;
}

interface UserTimezone {
  gmtOffset: number;
  timeZone: string;
  countryCode: string;
  countryName: string;
}

export default function useTimezone(userData?: TimezoneData | null) {
  const [userTimezone, setUserTimezone] = useState<UserTimezone>({
    gmtOffset: 0,
    timeZone: 'UTC',
    countryCode: 'US',
    countryName: 'United States'
  });

  useEffect(() => {
    if (userData?.gmtOffset) {
      setUserTimezone({
        gmtOffset: typeof userData.gmtOffset === 'string' 
          ? parseInt(userData.gmtOffset, 10) 
          : userData.gmtOffset,
        timeZone: userData.timeZone || 'UTC',
        countryCode: userData.countryCode || 'US',
        countryName: userData.countryName || 'United States'
      });
    }
  }, [userData]);

  // Convert UTC to user's local time
  const toLocalTime = (utcTime: Date | string | null): Date | null => {
    if (!utcTime) return null;
    
    const date = new Date(utcTime);
    if (isNaN(date.getTime())) return null;
    
    // Apply the user's GMT offset (in minutes)
    const offsetMs = userTimezone.gmtOffset * 60 * 1000;
    const localTime = new Date(date.getTime() + offsetMs);
    return localTime;
  };

  // Convert local time to UTC
  const toUTCTime = (localTime: Date | string | null): Date | null => {
    if (!localTime) return null;
    
    const date = new Date(localTime);
    if (isNaN(date.getTime())) return null;
    
    // Remove the user's GMT offset
    const offsetMs = userTimezone.gmtOffset * 60 * 1000;
    const utcTime = new Date(date.getTime() - offsetMs);
    return utcTime;
  };

  return {
    userTimezone,
    toLocalTime,
    toUTCTime
  };
} 