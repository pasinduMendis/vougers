'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const { login, isLoading, error } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await login(
        {
          email: formData.email.trim(),
          password: formData.password,
        },
        redirectTo
      );
    } catch (err) {
      // Error is handled by the hook
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden !p-[36px] !mt-[24px] !mx-[16px]">
        {/* Header */}
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-center border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-whit !pb-[24px]">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p className="mt-1.5 text-sm text-slate-600">Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 sm:px-8 !my-[24px]">
          <div className="!mb-[24px]">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 !my-[16px] rounded-xl text-sm flex items-start gap-3 animate-in fade-in duration-200">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Input
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              disabled={isLoading}
              autoComplete="email"
              className='!mb-[16px]'
            />

            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {/* Submit Button */}
          <div className="mt-6 sm:mt-8">
            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className='!mb-[16px]'
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>

          {/* Register Link */}
          <p className="mt-6 text-sm text-slate-600 text-center">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors hover:underline"
            >
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
