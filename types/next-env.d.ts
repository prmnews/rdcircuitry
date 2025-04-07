/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_WS_URL: string;
    MONGODB_URI: string;
    NEXTAUTH_SECRET: string;
    NEXT_PUBLIC_KPI_LOW_MINUTES: string;
    NEXT_PUBLIC_KPI_AVERAGE_MINUTES: string;
    NEXT_PUBLIC_KPI_HIGH_MINUTES: string;
  }
} 