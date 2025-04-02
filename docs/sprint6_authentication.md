# Sprint 6: Authentication and User Management

## Goal
Implement a secure authentication system with timezone-aware user profiles, ensuring user sessions are properly managed and credentials are validated against the authentication API.

## Implementation

### Step 1: Set up authentication infrastructure
```bash
# Navigate to the project root
cd /d/Repo/rdi

# Create authentication-related directories and files
mkdir -p lib/auth
touch lib/auth/session.js
touch lib/auth/validation.js
mkdir -p app/components/auth
touch app/components/auth/LoginForm.jsx
touch app/components/auth/PinInput.jsx
touch app/api/auth/[...nextauth]/route.js
```

### Step 2: Implement session management

```javascript
// lib/auth/session.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../app/api/auth/[...nextauth]/route";
import { logger } from "../logger";

/**
 * Get the current authenticated user session
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<object|null>} - Session object or null if not authenticated
 */
export async function getSession(req, res) {
  try {
    return await getServerSession(req, res, authOptions);
  } catch (error) {
    logger.error('Error getting session:', error);
    return null;
  }
}

/**
 * Check if the current request is authenticated
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<boolean>} - Whether the request is authenticated
 */
export async function isAuthenticated(req, res) {
  const session = await getSession(req, res);
  return !!session;
}

/**
 * Get the current user from the session
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<object|null>} - User object or null if not authenticated
 */
export async function getCurrentUser(req, res) {
  const session = await getSession(req, res);
  return session?.user || null;
}

/**
 * Create a middleware to require authentication
 * Redirects to login if not authenticated
 */
export function withAuth(handler) {
  return async (req, res) => {
    const session = await getSession(req, res);
    
    if (!session) {
      return Response.redirect(new URL('/login', req.nextUrl));
    }
    
    return handler(req, res);
  };
}

/**
 * Create a middleware to check API key authentication
 */
export function withApiAuth(handler) {
  return async (req, res) => {
    try {
      // Check for API key in headers
      const apiKey = req.headers.get('x-api-key');
      
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'API key is required' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate API key
      const isValid = await validateApiKey(apiKey);
      
      if (!isValid) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid or expired API key' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return handler(req, res);
    } catch (error) {
      logger.error('API authentication error:', error);
      
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Authentication error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Validate an API key against the database
 * @param {string} apiKey - API key to validate
 * @returns {Promise<boolean>} - Whether the API key is valid
 */
async function validateApiKey(apiKey) {
  try {
    const { ApiKey } = require('../../app/models');
    
    const key = await ApiKey.findOne({ 
      apiKey,
      isRevoked: false,
      status: 'active'
    });
    
    if (!key) return false;
    
    // Check if key is within valid date range
    const now = new Date();
    
    if (key.apiStart && now < new Date(key.apiStart)) {
      return false; // Key not yet active
    }
    
    if (key.expireDateTime && now > new Date(key.expireDateTime)) {
      return false; // Key expired
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating API key:', error);
    return false;
  }
}
```

### Step 3: Implement NextAuth.js authentication

```javascript
// app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '../../../lib/db';
import { User } from '../../../models';
import { validateCredentials } from '../../../lib/auth/validation';
import { logger } from '../../../lib/logger';

/**
 * NextAuth.js configuration
 */
export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'RDI Login',
      credentials: {
        userName: { label: "Username", type: "text" },
        pinNumber: { label: "PIN", type: "password" }
      },
      authorize: async (credentials) => {
        try {
          if (!credentials?.userName || !credentials?.pinNumber) {
            return null;
          }
          
          // Connect to database
          await connectDB();
          
          // Validate credentials against auth API
          const isValid = await validateCredentials(
            credentials.userName,
            credentials.pinNumber
          );
          
          if (!isValid) {
            logger.warn(`Failed login attempt for user: ${credentials.userName}`);
            return null;
          }
          
          // Get or create user in our database
          let user = await User.findOne({ userName: credentials.userName });
          
          if (!user) {
            // If user doesn't exist in our database but credentials are valid,
            // create a new user record with default timezone settings
            user = await User.create({
              userName: credentials.userName,
              countryCode: 'US',
              countryName: 'United States',
              timeZone: 'America/New_York',
              gmtOffset: '-5',
              lastLogin: new Date()
            });
            
            logger.info(`Created new user: ${credentials.userName}`);
          } else {
            // Update last login time
            user.lastLogin = new Date();
            await user.save();
          }
          
          // Return user object with timezone info for session
          return {
            id: user._id.toString(),
            userName: user.userName,
            countryCode: user.countryCode,
            countryName: user.countryName,
            timeZone: user.timeZone,
            gmtOffset: user.gmtOffset
          };
        } catch (error) {
          logger.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to JWT token
      if (user) {
        token.id = user.id;
        token.userName = user.userName;
        token.countryCode = user.countryCode;
        token.countryName = user.countryName;
        token.timeZone = user.timeZone;
        token.gmtOffset = user.gmtOffset;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user data to session
      if (token) {
        session.user = {
          id: token.id,
          userName: token.userName,
          countryCode: token.countryCode,
          countryName: token.countryName,
          timeZone: token.timeZone,
          gmtOffset: token.gmtOffset
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error: (code, metadata) => {
      logger.error(`NextAuth error: ${code}`, metadata);
    },
    warn: (code) => {
      logger.warn(`NextAuth warning: ${code}`);
    },
    debug: (code, metadata) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`NextAuth debug: ${code}`, metadata);
      }
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Step 4: Implement credential validation service

```javascript
// lib/auth/validation.js
import axios from 'axios';
import { logger } from '../logger';

/**
 * Validate user credentials against the authentication API
 * @param {string} userName - Username to validate
 * @param {string} pinNumber - PIN to validate
 * @returns {Promise<boolean>} - Whether the credentials are valid
 */
export async function validateCredentials(userName, pinNumber) {
  try {
    const authApiUrl = process.env.AUTH_API_URL;
    const authApiKey = process.env.AUTH_API_KEY;
    
    if (!authApiUrl || !authApiKey) {
      logger.error('Auth API URL or key not configured');
      return false;
    }
    
    const response = await axios.post(
      authApiUrl,
      { userName, pinNumber },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': authApiKey
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    // Check if the response indicates valid credentials
    if (response.status === 200 && response.data && response.data.success) {
      logger.info(`Successfully validated credentials for user: ${userName}`);
      return true;
    }
    
    logger.warn(`Invalid credentials for user: ${userName}`);
    return false;
  } catch (error) {
    logger.error(`Error validating credentials for user ${userName}:`, error);
    return false;
  }
}

/**
 * Validate an API key against the database
 * @param {string} apiKey - API key to validate
 * @returns {Promise<boolean>} - Whether the API key is valid
 */
export async function validateApiKey(apiKey) {
  try {
    const { ApiKey } = require('../../app/models');
    
    const key = await ApiKey.findOne({ 
      apiKey,
      isRevoked: false,
      status: 'active'
    });
    
    if (!key) return false;
    
    // Check if key is within valid date range
    const now = new Date();
    
    if (key.apiStart && now < new Date(key.apiStart)) {
      return false; // Key not yet active
    }
    
    if (key.expireDateTime && now > new Date(key.expireDateTime)) {
      return false; // Key expired
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating API key:', error);
    return false;
  }
}
```

### Step 5: Create login form component

```javascript
// app/components/auth/LoginForm.jsx
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import PinInput from './PinInput';
import styles from '../../styles/modules/LoginForm.module.css';

export default function LoginForm() {
  const [userName, setUserName] = useState('');
  const [pinNumber, setPinNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userName || !pinNumber) {
      setError('Username and PIN are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const result = await signIn('credentials', {
        redirect: false,
        userName,
        pinNumber
      });
      
      if (result.error) {
        setError('Invalid username or PIN');
        return;
      }
      
      // Redirect to dashboard on successful login
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h2 className={styles.loginTitle}>RDI Timer Login</h2>
        
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="userName" className={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className={styles.input}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="pinNumber" className={styles.label}>
              PIN
            </label>
            <PinInput
              value={pinNumber}
              onChange={setPinNumber}
              length={6}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Step 6: Create PIN input component for secure entry

```javascript
// app/components/auth/PinInput.jsx
import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/modules/PinInput.module.css';

export default function PinInput({ value, onChange, length = 6, disabled = false }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);
  
  // Initialize input refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);
  
  // Update local state when parent value changes
  useEffect(() => {
    if (value) {
      const valueArray = value.split('').slice(0, length);
      setValues([...valueArray, ...Array(length - valueArray.length).fill('')]);
    } else {
      setValues(Array(length).fill(''));
    }
  }, [value, length]);
  
  // Focus the first empty input or the last one
  const focusInput = (index) => {
    // Find the next empty input
    const nextEmptyIndex = values.findIndex((val, idx) => val === '' && idx >= index);
    
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      // Focus the last input if all are filled
      inputRefs.current[length - 1]?.focus();
    }
  };
  
  const handleChange = (e, index) => {
    const newChar = e.target.value.slice(-1);
    
    if (newChar.match(/\d/) || newChar === '') {
      const newValues = [...values];
      newValues[index] = newChar;
      setValues(newValues);
      
      // Notify parent component of the change
      onChange(newValues.join(''));
      
      // Focus the next input if there is a new value
      if (newChar !== '') {
        const nextIndex = index + 1;
        if (nextIndex < length) {
          inputRefs.current[nextIndex]?.focus();
        }
      }
    }
  };
  
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && values[index] === '' && index > 0) {
      // Move to previous input when backspace is pressed on an empty input
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      // Move to previous input when left arrow is pressed
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      // Move to next input when right arrow is pressed
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handlePaste = (e) => {
    e.preventDefault();
    
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Only allow digits
    const digits = pastedData.match(/\d/g);
    
    if (digits && digits.length > 0) {
      const digitsStr = digits.join('').slice(0, length);
      const newValues = [
        ...digitsStr.split(''),
        ...Array(length - digitsStr.length).fill('')
      ];
      
      setValues(newValues);
      onChange(newValues.join(''));
      focusInput(digitsStr.length);
    }
  };
  
  return (
    <div className={styles.pinContainer}>
      {values.map((val, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={styles.pinInput}
          disabled={disabled}
          autoComplete={index === 0 ? 'current-password' : 'off'}
        />
      ))}
    </div>
  );
}
```

### Step 7: Create timezone selection component

```javascript
// app/components/auth/TimezoneSelector.jsx
import { useState, useEffect } from 'react';
import styles from '../../styles/modules/TimezoneSelector.module.css';

export default function TimezoneSelector({ value, onChange, disabled = false }) {
  const [countries, setCountries] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Fetch countries and timezones on component mount
  useEffect(() => {
    const fetchCountriesAndTimezones = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/countries-timezones');
        
        if (!response.ok) {
          throw new Error('Failed to fetch countries and timezones');
        }
        
        const data = await response.json();
        setCountries(data);
        
        // If we have a value, set the selected country and timezone
        if (value) {
          const { countryCode, timeZone } = value;
          setSelectedCountry(countryCode);
          
          // Find the timezones for the selected country
          const countryTimezones = data.find(c => c.code === countryCode)?.timezones || [];
          setTimezones(countryTimezones);
          setSelectedTimezone(timeZone);
        }
      } catch (error) {
        console.error('Error fetching countries and timezones:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCountriesAndTimezones();
  }, [value]);
  
  // Handle country selection
  const handleCountryChange = (e) => {
    const country = e.target.value;
    setSelectedCountry(country);
    
    // Find the timezones for the selected country
    const countryTimezones = countries.find(c => c.code === country)?.timezones || [];
    setTimezones(countryTimezones);
    
    // Select the first timezone by default
    const defaultTimezone = countryTimezones[0]?.name || '';
    setSelectedTimezone(defaultTimezone);
    
    // Find the GMT offset for the selected timezone
    const gmtOffset = countryTimezones.find(tz => tz.name === defaultTimezone)?.gmtOffset || '0';
    
    // Notify parent component of the change
    if (onChange) {
      const countryName = countries.find(c => c.code === country)?.name || '';
      onChange({
        countryCode: country,
        countryName,
        timeZone: defaultTimezone,
        gmtOffset
      });
    }
  };
  
  // Handle timezone selection
  const handleTimezoneChange = (e) => {
    const timezone = e.target.value;
    setSelectedTimezone(timezone);
    
    // Find the GMT offset for the selected timezone
    const gmtOffset = timezones.find(tz => tz.name === timezone)?.gmtOffset || '0';
    
    // Notify parent component of the change
    if (onChange) {
      const countryName = countries.find(c => c.code === selectedCountry)?.name || '';
      onChange({
        countryCode: selectedCountry,
        countryName,
        timeZone: timezone,
        gmtOffset
      });
    }
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }
  
  return (
    <div className={styles.timezoneSelector}>
      <div className={styles.formGroup}>
        <label htmlFor="country" className={styles.label}>
          Country
        </label>
        <select
          id="country"
          value={selectedCountry}
          onChange={handleCountryChange}
          className={styles.select}
          disabled={disabled || loading}
        >
          <option value="" disabled>Select a country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="timezone" className={styles.label}>
          Timezone
        </label>
        <select
          id="timezone"
          value={selectedTimezone}
          onChange={handleTimezoneChange}
          className={styles.select}
          disabled={disabled || loading || !selectedCountry}
        >
          <option value="" disabled>Select a timezone</option>
          {timezones.map((timezone) => (
            <option key={timezone.name} value={timezone.name}>
              {timezone.name} (GMT{timezone.gmtOffset >= 0 ? '+' : ''}{timezone.gmtOffset})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

### Step 8: Create protected route wrapper

```javascript
// app/components/auth/ProtectedRoute.js
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const router = useRouter();
  
  useEffect(() => {
    // If the session is loaded and there's no user, redirect to login
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);
  
  // If loading, show a loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // If there's a session, render the children
  return session ? children : null;
}
```

### Step 9: Implement login page

```javascript
// app/login/page.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoginForm from '../components/auth/LoginForm';
import styles from '../styles/modules/Login.module.css';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // If authenticated, redirect to dashboard
  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);
  
  // Show loading state while checking session
  if (status === 'loading') {
    return <div className={styles.loading}>Loading...</div>;
  }
  
  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="RDI Timer" />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

### Step 10: Create user profile update API

```javascript
// app/api/user/profile/route.js
import { connectDB } from '../../../lib/db';
import { User } from '../../../models';
import { withAuth } from '../../../lib/auth/session';
import { logger } from '../../../lib/logger';

export const PUT = withAuth(async (req) => {
  try {
    // Get user data from request
    const { timeZone, countryCode, countryName, gmtOffset } = await req.json();
    const userName = req.session.user.userName;
    
    // Validate input
    if (!timeZone || !countryCode || !countryName || gmtOffset === undefined) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Connect to database
    await connectDB();
    
    // Update user profile
    const user = await User.findOneAndUpdate(
      { userName },
      { timeZone, countryCode, countryName, gmtOffset },
      { new: true }
    );
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return updated user data
    return new Response(JSON.stringify({
      success: true,
      user: {
        userName: user.userName,
        countryCode: user.countryCode,
        countryName: user.countryName,
        timeZone: user.timeZone,
        gmtOffset: user.gmtOffset
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update profile'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

## Notes to Future You

1. **Session Security**
   - Session expiration is set to 12 hours for security
   - Sessions are stored as JWT tokens in HTTP-only cookies
   - Force re-authentication after session timeout
   - Never store sensitive information in localStorage or sessionStorage

2. **Timezone Management**
   - User profile always stores the "home" timezone settings
   - Display proper local time even if the user travels to another timezone
   - When updating a user's profile, update the session data as well

3. **API Authentication**
   - All API routes should use withAuth/withApiAuth middleware
   - API keys must be validated on every request
   - Check both isRevoked flag and date ranges for API keys
   - Log failed authentication attempts for security monitoring

4. **Security Best Practices**
   - Validate all user input on both client and server
   - Use PIN input component for secure PIN entry
   - Implement rate limiting on authentication endpoints (next steps)
   - Keep authentication logic in a separate library from business logic

5. **Error Handling**
   - Provide meaningful error messages to users
   - Log detailed errors on the server but return minimal info to clients
   - Handle authentication failures gracefully with proper UI feedback
   - Never expose internal error details in production 