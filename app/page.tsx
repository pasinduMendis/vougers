'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect to appropriate dashboard based on user type
        if (user.type === 'client') {
          router.replace('/client/quotes');
        } else {
          router.replace('/provider/quotes');
        }
      } else {
        // Not authenticated, redirect to login
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Logo */}
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
          <span className="text-white font-bold text-4xl">V</span>
        </div>

        {/* App Name */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">Voyagers</h1>
        <p className="text-sm sm:text-base text-slate-600">Travel Import Parcel Management</p>

        {/* Loading Spinner */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}
