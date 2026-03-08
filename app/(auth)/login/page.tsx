'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';
import { useAuth } from '@/hooks/useAuth';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuth();

  const registered = searchParams.get('registered');
  const redirectUrl = searchParams.get('redirect');

  // Redirect if already authenticated (user visits login page while logged in)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Determine redirect target
      let targetUrl = redirectUrl;
      if (!targetUrl) {
        targetUrl = user.type === 'client' ? '/client/quotes' : '/provider/quotes';
      }
      // Use window.location for full page navigation to ensure proper redirect
      window.location.href = targetUrl;
    }
  }, [isLoading, isAuthenticated, user, redirectUrl]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show login if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center w-full px-4 py-8 sm:px-6 md:px-8 lg:py-12">
        <div className="w-full max-w-[440px]">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 transform hover:scale-105 transition-transform">
                <span className="text-white font-bold text-3xl">V</span>
              </div>
            </Link>
            <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Voyagers
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Travel Import Parcel Management
            </p>
          </div>

          {/* Success Message */}
          {registered && (
            <div className="mb-6">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Registration successful! Please sign in to continue.</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <LoginForm redirectTo={redirectUrl ?? undefined} />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-xs sm:text-sm text-slate-600">
          By signing in, you agree to our{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 hover:underline">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent"></div>
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
