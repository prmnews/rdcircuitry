# Sprint 4: Frontend Implementation

## Goal
Implement the frontend components that connect to our backend API and create a responsive dashboard UI with timezone-aware displays and real-time updates.

## Implementation

### Step 1: Set up frontend component structure
```bash
# Navigate to the project root
cd /d/Repo/rdi

# Create necessary component directories 
mkdir -p app/components/dashboard
mkdir -p app/components/shared
mkdir -p app/hooks
mkdir -p app/styles/modules
```

### Step 2: Create timezone utility hook
```bash
# Create timezone hook file
touch app/hooks/useTimezone.js
```

Add the implementation:
```javascript
// app/hooks/useTimezone.js
import { useState, useEffect } from 'react';

export default function useTimezone(userData) {
  const [userTimezone, setUserTimezone] = useState({
    gmtOffset: 0,
    timeZone: 'UTC',
    countryCode: 'US',
    countryName: 'United States'
  });

  useEffect(() => {
    if (userData?.gmtOffset) {
      setUserTimezone({
        gmtOffset: parseInt(userData.gmtOffset, 10),
        timeZone: userData.timeZone || 'UTC',
        countryCode: userData.countryCode || 'US',
        countryName: userData.countryName || 'United States'
      });
    }
  }, [userData]);

  // Convert UTC to user's local time
  const toLocalTime = (utcTime) => {
    if (!utcTime) return null;
    
    const date = new Date(utcTime);
    // Apply the user's GMT offset
    const localTime = new Date(date.getTime() + (userTimezone.gmtOffset * 60 * 1000));
    return localTime;
  };

  // Convert local time to UTC
  const toUTCTime = (localTime) => {
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
```

### Step 3: Implement dashboard card components

```bash
# Create dashboard component files
touch app/components/dashboard/CurrentTimeCard.jsx
touch app/components/dashboard/EstimatedExpirationCard.jsx
touch app/components/dashboard/TimeRemainingCard.jsx
touch app/components/dashboard/ResetEventsCard.jsx
touch app/components/shared/DoughnutChart.jsx
```

Implement the current time card:
```javascript
// app/components/dashboard/CurrentTimeCard.jsx
import { useState, useEffect } from 'react';
import styles from '../../styles/modules/Dashboard.module.css';
import useTimezone from '../../hooks/useTimezone';

export default function CurrentTimeCard({ userData }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toLocalTime, userTimezone } = useTimezone(userData);
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format the date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  // Format the time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  const localTime = toLocalTime(currentTime);
  
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Current Time</h3>
      <div className={styles.cardContent}>
        <div className={styles.timeDisplay}>{formatTime(localTime)}</div>
        <div className={styles.dateDisplay}>{formatDate(localTime)}</div>
        <div className={styles.timezoneDisplay}>
          {userTimezone.timeZone} (GMT{userTimezone.gmtOffset >= 0 ? '+' : ''}{userTimezone.gmtOffset})
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Implement time remaining card with alert system

```javascript
// app/components/dashboard/TimeRemainingCard.jsx
import { useState, useEffect } from 'react';
import styles from '../../styles/modules/Dashboard.module.css';
import DoughnutChart from '../shared/DoughnutChart';

export default function TimeRemainingCard({ expirationTime, initialMinutes }) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [alertLevel, setAlertLevel] = useState('normal');
  
  useEffect(() => {
    if (!expirationTime) return;
    
    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiration = new Date(expirationTime);
      const diff = expiration - now;
      
      // If timer has expired
      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ hours, minutes, seconds });
      
      // Set alert levels based on env variables
      const totalMinutesRemaining = hours * 60 + minutes + seconds / 60;
      
      if (totalMinutesRemaining <= process.env.MESSAGE_RED_MINUTES) {
        setAlertLevel('red');
      } else if (totalMinutesRemaining <= process.env.MESSAGE_YELLOW_MINUTES) {
        setAlertLevel('yellow');
      } else {
        setAlertLevel('normal');
      }
    };
    
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [expirationTime]);
  
  // Calculate percentage for doughnut chart
  const calculatePercentage = () => {
    if (!expirationTime || !initialMinutes) return 0;
    
    const now = new Date();
    const expiration = new Date(expirationTime);
    const totalDuration = initialMinutes * 60 * 1000;
    const elapsed = totalDuration - (expiration - now);
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };
  
  const formatTimeDisplay = () => {
    const { hours, minutes, seconds } = timeRemaining;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`${styles.card} ${styles[`alert-${alertLevel}`]}`}>
      <h3 className={styles.cardTitle}>Time Remaining</h3>
      <div className={styles.cardContent}>
        <DoughnutChart percentage={calculatePercentage()} />
        <div className={styles.timeRemainingDisplay}>
          {formatTimeDisplay()}
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Implement reset mechanism and event tracking

```javascript
// app/components/dashboard/EstimatedExpirationCard.jsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/modules/Dashboard.module.css';
import useTimezone from '../../hooks/useTimezone';
import { toast } from 'react-toastify';

export default function EstimatedExpirationCard({ expirationTime, userData, onReset }) {
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const { toLocalTime } = useTimezone(userData);
  
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      const response = await fetch('/api/timer/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset timer');
      }
      
      const data = await response.json();
      toast.success('Timer reset successful');
      
      if (onReset) {
        onReset(data.newExpirationTime);
      }
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast.error('Failed to reset timer');
    } finally {
      setIsResetting(false);
    }
  };
  
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  const localExpirationTime = toLocalTime(expirationTime);
  
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Estimated Expiration</h3>
      <div className={styles.cardContent}>
        <div className={styles.expirationDisplay}>
          {formatDateTime(localExpirationTime)}
        </div>
        <button
          className={styles.resetButton}
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? 'Resetting...' : 'Reset Timer'}
        </button>
      </div>
    </div>
  );
}
```

### Step 6: Create dashboard layout with all components

```javascript
// app/components/dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import styles from '../../styles/modules/Dashboard.module.css';
import CurrentTimeCard from './CurrentTimeCard';
import EstimatedExpirationCard from './EstimatedExpirationCard';
import TimeRemainingCard from './TimeRemainingCard';
import ResetEventsCard from './ResetEventsCard';

export default function Dashboard() {
  const { data: session } = useSession();
  const [timerState, setTimerState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchTimerState = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/timer/state');
      
      if (!response.ok) {
        throw new Error('Failed to fetch timer state');
      }
      
      const data = await response.json();
      setTimerState(data);
    } catch (error) {
      console.error('Error fetching timer state:', error);
      setError('Failed to load timer information');
      toast.error('Failed to load timer information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTimerState();
    
    // Periodically refetch timer state (as a fallback if WebSockets fail)
    const interval = setInterval(fetchTimerState, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleTimerReset = (newExpirationTime) => {
    setTimerState(prev => ({
      ...prev,
      currentState: newExpirationTime,
      resetEvents: {
        last24Hours: prev.resetEvents.last24Hours + 1,
        total: prev.resetEvents.total + 1
      }
    }));
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }
  
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.row}>
        <div className={styles.column}>
          <CurrentTimeCard userData={session?.user} />
        </div>
        <div className={styles.column}>
          <EstimatedExpirationCard
            expirationTime={timerState?.currentState}
            userData={session?.user}
            onReset={handleTimerReset}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.column}>
          <TimeRemainingCard
            expirationTime={timerState?.currentState}
            initialMinutes={process.env.TIMER_INITIAL_MINUTES}
          />
        </div>
        <div className={styles.column}>
          <ResetEventsCard resetEvents={timerState?.resetEvents} />
        </div>
      </div>
    </div>
  );
}
```

### Step 7: Create supporting components

```javascript
// app/components/shared/DoughnutChart.jsx
import { useEffect, useRef } from 'react';
import styles from '../../styles/modules/DoughnutChart.module.css';

export default function DoughnutChart({ percentage = 0 }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f0f0f0';
    ctx.fill();
    
    // Draw progress arc
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(
      centerX,
      centerY,
      radius,
      -0.5 * Math.PI,
      (-0.5 + percentage / 50) * Math.PI
    );
    ctx.fillStyle = percentage >= 75 ? '#ff4d4d' : 
                   percentage >= 50 ? '#ffcc00' : 
                   '#4caf50';
    ctx.fill();
    
    // Draw inner circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }, [percentage]);
  
  return (
    <div className={styles.chartContainer}>
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={200} 
        className={styles.doughnutChart}
      />
      <div className={styles.percentageText}>
        {Math.round(percentage)}%
      </div>
    </div>
  );
}
```

## Notes to Future You

1. **Timezone Handling**
   - All datetime values should be stored in UTC in the database
   - Only convert to local time at the display layer using the `useTimezone` hook
   - Always send UTC times in API requests and responses

2. **Timer Calculation**
   - Never rely on client-side time for critical timer functions
   - Always calculate remaining time based on server-provided expiration
   - Use WebSockets for real-time updates when available
   - Implement polling as a fallback mechanism with reasonable intervals

3. **Performance Considerations**
   - Use `useCallback` and `useMemo` for expensive calculations
   - Be careful with interval timers - always clean them up in useEffect returns
   - Consider debouncing reset actions to prevent accidental double-clicks

4. **UI/UX Best Practices**
   - Provide clear visual feedback for all user actions
   - Use toast notifications for important events
   - Implement loading states for all async operations
   - Make sure alert colors follow accessibility standards (WCAG)

5. **Code Organization**
   - Keep components focused on a single responsibility
   - Extract reusable logic into custom hooks
   - Place business logic in services, not components
   - Use consistent naming conventions 