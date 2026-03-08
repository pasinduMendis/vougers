'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/src/lib/utils';
import type { AuthUser } from '@/hooks/useAuth';

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
  onMenuClick: () => void;
  className?: string;
}

export function Header({ user, onLogout, onMenuClick, className }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200 shadow-sm !px-[8px]',
        className
      )}
    >
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Logo */}
      <div className="md:hidden flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
          <span className="text-white font-bold text-lg">V</span>
        </div>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden md:block" />

      {/* User Menu */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          {/* Avatar */}
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-200">
            <span className="text-sm font-semibold text-indigo-600">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>

          {/* Name (hidden on mobile) */}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-600">
              {user?.type === 'client' ? user?.companyName : user?.organizationName}
            </p>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={cn(
              'h-4 w-4 text-slate-500 transition-transform duration-200',
              showUserMenu && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 !p-[16px] z-20">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-sm text-slate-600">{user?.email}</p>
              </div>

              {user?.type === 'provider' && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Organization</p>
                  <p className="text-sm text-slate-800 font-medium mt-0.5">{user?.organizationName}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                      {user?.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}

              <div className="px-2 !pt-[8px]">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
