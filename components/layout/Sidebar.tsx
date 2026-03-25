"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/src/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  showBadge?: boolean;
}

interface SidebarProps {
  userType: "client" | "provider";
  isAdmin?: boolean;
  className?: string;
  notificationCount?: number;
}

// Icon components
const QuoteIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const NewQuoteIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const PricedIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ApprovedIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CompletedIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const ClientsIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const NotificationsIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

// Client navigation items
const clientNavItems: NavItem[] = [
  { href: "/client/quotes", label: "My Quotes", icon: <QuoteIcon /> },
  { href: "/client/quotes/new", label: "New Quote", icon: <NewQuoteIcon /> },
  {
    href: "/client/quotes?status=pending",
    label: "Awaiting Quotes",
    icon: <ClockIcon />,
  },
  {
    href: "/client/quotes?status=priced",
    label: "Priced Quotes",
    icon: <PricedIcon />,
  },
  {
    href: "/client/quotes?status=approved",
    label: "Approved Quotes",
    icon: <ApprovedIcon />,
  },
  {
    href: "/client/quotes?status=completed",
    label: "Completed",
    icon: <CompletedIcon />,
  },
  {
    href: "/client/notifications",
    label: "Notifications",
    icon: <NotificationsIcon />,
    showBadge: true,
  },
];

// Provider navigation items
const getProviderNavItems = (isAdmin: boolean): NavItem[] => {
  const items: NavItem[] = [
    { href: "/provider/quotes", label: "Quotes", icon: <QuoteIcon /> },
    { href: "/provider/clients", label: "Clients", icon: <ClientsIcon /> },
    { href: "/provider/notifications", label: "Notifications", icon: <NotificationsIcon />, showBadge: true },
  ];

  if (isAdmin) {
    items.push({
      href: "/provider/users",
      label: "Users",
      icon: <UsersIcon />,
    });
  }

  return items;
};

export function Sidebar({
  userType,
  isAdmin = false,
  className,
  notificationCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status");
  const navItems =
    userType === "client" ? clientNavItems : getProviderNavItems(isAdmin);

  const isNavItemActive = (item: NavItem): boolean => {
    const url = new URL(item.href, "http://localhost");
    const itemPath = url.pathname;
    const itemStatus = url.searchParams.get("status");

    // For items with status query param
    if (itemStatus) {
      return pathname === itemPath && currentStatus === itemStatus;
    }

    // For "My Quotes" - active only when on /client/quotes without status param
    if (item.href === "/client/quotes") {
      return pathname === "/client/quotes" && !currentStatus;
    }

    // For other items (like New Quote)
    return pathname === itemPath || pathname.startsWith(itemPath + "/");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:inset-y-0 bg-slate-50 border-r border-slate-200 min-h-[100vh]",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-200 bg-white">
        <Link
          href={userType === "client" ? "/client/quotes" : "/provider/quotes"}
          className="flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Voyagers
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = isNavItemActive(item);
          const showBadgeCount = item.showBadge && notificationCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 h-[40px] !px-[24px]",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm",
              )}
            >
              <span className={cn(isActive ? "text-white" : "text-slate-500")}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {showBadgeCount && (
                <span
                  className={cn(
                    "flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full",
                    isActive
                      ? "bg-white text-indigo-600"
                      : "bg-red-500 text-white"
                  )}
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Type Badge */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="px-4 py-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
            Account Type
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {userType === "client"
              ? "Client"
              : isAdmin
                ? "Provider Admin"
                : "Provider User"}
          </p>
        </div>
      </div>
    </aside>
  );
}
