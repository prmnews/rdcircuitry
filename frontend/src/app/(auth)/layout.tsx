"use client";

import { Toaster } from 'react-hot-toast';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Toaster position="top-right" />
      {children}
    </div>
  );
} 