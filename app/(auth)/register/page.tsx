'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

type UserType = 'client' | 'provider';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, registerClient, registerProvider, error } = useAuth();

  // User type selection
  const [userType, setUserType] = useState<UserType>('client');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyAddress: '',
    organizationName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.type === 'client') {
        router.push('/client/quotes');
      } else {
        router.push('/provider/quotes');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (userType === 'client') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      }
      if (!formData.companyAddress.trim()) {
        newErrors.companyAddress = 'Company address is required';
      }
    } else {
      if (!formData.organizationName.trim()) {
        newErrors.organizationName = 'Organization name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsSubmitting(true);

      if (userType === 'client') {
        await registerClient({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          companyName: formData.companyName.trim(),
          companyAddress: formData.companyAddress.trim(),
        });
      } else {
        await registerProvider({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          organizationName: formData.organizationName.trim(),
        });
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Registration failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show register if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center w-full px-4 py-8 sm:px-6 md:px-8 lg:py-12">
        <div className="w-full max-w-[520px]">
          {/* Logo & Header */}
          <div className="text-center mb-6 sm:mb-8">
            <Link href="/" className="inline-flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 transform hover:scale-105 transition-transform">
                <span className="text-white font-bold text-3xl">V</span>
              </div>
            </Link>
            <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Create Account
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Join Voyagers to manage your shipping quotes
            </p>
          </div>

          {/* Registration Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
            {/* User Type Selection */}
            <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
              <label className="block text-sm font-semibold text-slate-700 mb-4">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Client Option */}
                <button
                  type="button"
                  onClick={() => setUserType('client')}
                  className={`relative p-4 sm:p-5 rounded-xl border-2 text-center transition-all duration-200 ${
                    userType === 'client'
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {userType === 'client' && (
                    <div className="absolute -top-2 -right-2 h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`h-12 w-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${
                    userType === 'client' ? 'bg-indigo-600' : 'bg-slate-100'
                  }`}>
                    <svg
                      className={`h-6 w-6 ${userType === 'client' ? 'text-white' : 'text-slate-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className={`block font-semibold text-sm sm:text-base ${userType === 'client' ? 'text-indigo-700' : 'text-slate-700'}`}>
                    Client
                  </span>
                  <p className="text-xs text-slate-600 mt-1 hidden sm:block">
                    Request shipping quotes
                  </p>
                </button>

                {/* Provider Option */}
                <button
                  type="button"
                  onClick={() => setUserType('provider')}
                  className={`relative p-4 sm:p-5 rounded-xl border-2 text-center transition-all duration-200 ${
                    userType === 'provider'
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {userType === 'provider' && (
                    <div className="absolute -top-2 -right-2 h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`h-12 w-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${
                    userType === 'provider' ? 'bg-indigo-600' : 'bg-slate-100'
                  }`}>
                    <svg
                      className={`h-6 w-6 ${userType === 'provider' ? 'text-white' : 'text-slate-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <span className={`block font-semibold text-sm sm:text-base ${userType === 'provider' ? 'text-indigo-700' : 'text-slate-700'}`}>
                    Provider
                  </span>
                  <p className="text-xs text-slate-600 mt-1 hidden sm:block">
                    Provide shipping quotes
                  </p>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="px-5 sm:px-8 py-6 sm:py-8">
              <div className="space-y-4 sm:space-y-5">
                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-in fade-in duration-200">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Common Fields */}
                <Input
                  name="name"
                  label="Full Name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  disabled={isSubmitting}
                />

                <Input
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  disabled={isSubmitting}
                />

                {/* Password Fields - Side by side on tablet+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <Input
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={isSubmitting}
                  />

                  <Input
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Client-specific Fields */}
                {userType === 'client' && (
                  <div className="space-y-4 sm:space-y-5 pt-2 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider pt-2">Company Details</p>
                    <Input
                      name="companyName"
                      label="Company Name"
                      placeholder="Your company"
                      value={formData.companyName}
                      onChange={handleChange}
                      error={errors.companyName}
                      disabled={isSubmitting}
                    />
                    <Input
                      name="companyAddress"
                      label="Company Address"
                      placeholder="Full address"
                      value={formData.companyAddress}
                      onChange={handleChange}
                      error={errors.companyAddress}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Provider-specific Fields */}
                {userType === 'provider' && (
                  <div className="space-y-4 sm:space-y-5 pt-2 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider pt-2">Organization Details</p>
                    <Input
                      name="organizationName"
                      label="Organization Name"
                      placeholder="Your logistics company"
                      value={formData.organizationName}
                      onChange={handleChange}
                      error={errors.organizationName}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="mt-6 sm:mt-8">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>

              {/* Login Link */}
              <p className="mt-6 text-sm text-slate-600 text-center">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-xs sm:text-sm text-slate-600">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 hover:underline">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}
