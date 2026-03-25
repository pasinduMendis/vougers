"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth, AuthUser } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useNotificationSubscription } from "@/hooks/useNotificationSubscription";
import { SocketProvider } from "@/contexts/SocketContext";

// Inner layout component that uses socket hooks (must be inside SocketProvider)
function ClientDashboardInner({
  children,
  user,
  logout,
}: {
  children: React.ReactNode;
  user: AuthUser | null;
  logout: () => Promise<void>;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Get unread notification count
  const { count: unreadCount, increment: incrementUnread } = useUnreadCount();

  // Subscribe to real-time notifications for sidebar badge
  useNotificationSubscription({
    clientId: user?.id,
    callbacks: {
      onNewNotification: () => {
        incrementUnread();
      },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 md:grid grid-cols-12">
      <div className="md:col-span-3">
        {/* Sidebar - Desktop */}
        <Sidebar userType="client" notificationCount={unreadCount} />
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        userType="client"
        notificationCount={unreadCount}
      />

      <div className="mx-[24px] md:col-span-9">
        {/* Main Content Area */}
        <div>
          {/* Header */}
          <Header
            user={user}
            onLogout={logout}
            onMenuClick={() => setIsMobileNavOpen(true)}
          />

          {/* Page Content */}
          <main className=" !p-[24px] md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isClient, logout } = useAuth();

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    } else if (!isLoading && isAuthenticated && !isClient) {
      // Provider trying to access client routes
      router.push("/provider/quotes");
    }
  }, [isLoading, isAuthenticated, isClient, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 animate-pulse">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not client
  if (!isAuthenticated || !isClient) {
    return null;
  }

  return (
    <SocketProvider>
      <ClientDashboardInner user={user} logout={logout}>
        {children}
      </ClientDashboardInner>
    </SocketProvider>
  );
}
