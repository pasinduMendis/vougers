"use client";

import { cn } from "@/src/lib/utils";
import { QuoteStatus } from "@/src/lib/types/quote.types";

export interface StatusBadgeProps {
  status: QuoteStatus;
  className?: string;
  size?: "sm" | "md";
}

const statusConfig: Record<QuoteStatus, { label: string; className: string }> =
  {
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    priced: {
      label: "Priced",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    completed: {
      label: "Completed",
      className: "bg-purple-100 text-purple-800 border-purple-200",
    },
  };

export function StatusBadge({
  status,
  className,
  size = "md",
}: StatusBadgeProps) {
  const config = statusConfig[status];

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border !bg-transparent !w-fit !border-0",
        config.className,
        sizes[size],
        className,
      )}
    >
      {config.label}
    </span>
  );
}
