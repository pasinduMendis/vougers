"use client";

import { cn } from "@/src/lib/utils";
import type { QuoteStatus } from "@/src/lib/types/quote.types";

interface StatusTab {
  value: QuoteStatus | "all";
  label: string;
  count?: number;
}

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: QuoteStatus | "all";
  onChange: (status: QuoteStatus | "all") => void;
  className?: string;
}

// Status colors for badges
const statusColors: Record<QuoteStatus | "all", string> = {
  all: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  priced: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-purple-100 text-purple-700",
  lost: "bg-orange-100 text-orange-700",
  missed: "bg-slate-100 text-slate-700",
};

// Active status colors
const activeColors: Record<QuoteStatus | "all", string> = {
  all: "bg-gray-600 text-white",
  pending: "bg-yellow-600 text-white",
  priced: "bg-blue-600 text-white",
  approved: "bg-green-600 text-white",
  rejected: "bg-red-600 text-white",
  completed: "bg-purple-600 text-white",
  lost: "bg-orange-600 text-white",
  missed: "bg-slate-600 text-white",
};

export function StatusTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: StatusTabsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap !h-[20px] !p-[16px] !my-[8px]",
              isActive
                ? activeColors[tab.value]
                : cn(statusColors[tab.value], "hover:opacity-80"),
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] !h-[20px] !px-[6px] rounded-full text-xs",
                  isActive ? "bg-white/20 text-white" : "bg-gray-900/10",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Preset tabs for common use cases (client view - no lost/missed)
export const DEFAULT_STATUS_TABS: StatusTab[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "priced", label: "Priced" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

// Preset tabs for provider view (includes lost/missed)
export const PROVIDER_STATUS_TABS: StatusTab[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "priced", label: "Priced" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
  { value: "missed", label: "Missed" },
];

// Helper to generate tabs with counts (client view)
export function generateStatusTabs(
  statusCounts: Partial<Record<QuoteStatus, number>>,
  totalCount: number,
): StatusTab[] {
  return [
    { value: "all", label: "All", count: totalCount },
    { value: "pending", label: "Pending", count: statusCounts.pending || 0 },
    { value: "priced", label: "Priced", count: statusCounts.priced || 0 },
    { value: "approved", label: "Approved", count: statusCounts.approved || 0 },
    { value: "rejected", label: "Rejected", count: statusCounts.rejected || 0 },
    {
      value: "completed",
      label: "Completed",
      count: statusCounts.completed || 0,
    },
  ];
}

// Helper to generate tabs with counts (provider view - includes lost/missed)
export function generateProviderStatusTabs(
  statusCounts: Partial<Record<QuoteStatus, number>>,
  totalCount: number,
): StatusTab[] {
  return [
    { value: "all", label: "All", count: totalCount },
    { value: "pending", label: "Pending", count: statusCounts.pending || 0 },
    { value: "priced", label: "Priced", count: statusCounts.priced || 0 },
    { value: "approved", label: "Approved", count: statusCounts.approved || 0 },
    { value: "rejected", label: "Rejected", count: statusCounts.rejected || 0 },
    {
      value: "completed",
      label: "Completed",
      count: statusCounts.completed || 0,
    },
    { value: "lost", label: "Lost", count: statusCounts.lost || 0 },
    { value: "missed", label: "Missed", count: statusCounts.missed || 0 },
  ];
}
