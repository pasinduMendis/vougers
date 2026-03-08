"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isClient, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 md:grid grid-cols-12">
      <div className="md:col-span-3">
        {/* Sidebar - Desktop */}
        <Sidebar userType="client" />
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        userType="client"
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
