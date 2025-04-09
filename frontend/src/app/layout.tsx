'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { useAppState } from '@/hooks/useAppState';

const inter = Inter({ subsets: ['latin'] });

const metadata = {
  title: 'RD Circuitry',
  description: 'RD Circuitry Timer Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAppState();

  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body className={inter.className}>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
