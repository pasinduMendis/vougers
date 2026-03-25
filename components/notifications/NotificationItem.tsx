'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils';
import type { NotificationItem as NotificationItemType } from '@/hooks/useNotifications';

// Icons for different notification types
const notificationIcons: Record<string, React.ReactNode> = {
  quote_priced: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  quote_repriced: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  quote_approved: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  quote_rejected: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  quote_completed: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  quote_lost: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  quote_missed: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  negotiation_requested: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  negotiation_rejected: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  new_quote_request: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
};

// Colors for different notification types
const notificationColors: Record<string, string> = {
  quote_priced: 'text-green-600 bg-green-100',
  quote_repriced: 'text-blue-600 bg-blue-100',
  quote_approved: 'text-green-600 bg-green-100',
  quote_rejected: 'text-red-600 bg-red-100',
  quote_completed: 'text-indigo-600 bg-indigo-100',
  quote_lost: 'text-amber-600 bg-amber-100',
  quote_missed: 'text-slate-600 bg-slate-100',
  negotiation_requested: 'text-purple-600 bg-purple-100',
  negotiation_rejected: 'text-red-600 bg-red-100',
  new_quote_request: 'text-indigo-600 bg-indigo-100',
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
}

export interface NotificationItemProps extends HTMLAttributes<HTMLDivElement> {
  notification: NotificationItemType;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
  compact?: boolean;
}

const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(
  ({ className, notification, onMarkAsRead, onClick, compact = false, ...props }, ref) => {
    const icon = notificationIcons[notification.type] || notificationIcons.new_quote_request;
    const colorClass = notificationColors[notification.type] || 'text-slate-600 bg-slate-100';

    const handleClick = () => {
      if (!notification.read && onMarkAsRead) {
        onMarkAsRead(notification._id);
      }
      onClick?.();
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors',
          !notification.read && 'bg-indigo-50/50',
          notification.read ? 'hover:bg-slate-50' : 'hover:bg-indigo-50',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {/* Icon */}
        <div className={cn('flex-shrink-0 p-2 rounded-xl', colorClass)}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm',
              !notification.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-indigo-500" />
            )}
          </div>
          {!compact && (
            <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            {formatTimeAgo(notification.createdAt)}
          </p>
        </div>
      </div>
    );
  }
);

NotificationItem.displayName = 'NotificationItem';
export { NotificationItem };
