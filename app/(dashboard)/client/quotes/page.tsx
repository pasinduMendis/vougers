"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import {
  StatusTabs,
  generateStatusTabs,
} from "@/components/dashboard/StatusTabs";
import { useQuoteRequests } from "@/hooks/useQuotes";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { formatDate, formatRelativeTime } from "@/src/lib/utils";
import type {
  QuoteStatus,
  QuoteRequestFilters,
} from "@/src/lib/types/quote.types";

export default function ClientQuotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // Get status from URL query parameter
  const urlStatus = searchParams.get("status") as QuoteStatus | null;

  // Initialize hook with status filter from URL
  const {
    quoteRequests,
    pagination,
    filters,
    isLoading,
    updateFilters,
    setPage,
  } = useQuoteRequests(urlStatus ? { status: urlStatus } : undefined);

  // Sync URL status changes to filters
  useEffect(() => {
    if (urlStatus) {
      updateFilters({ status: urlStatus });
    } else {
      updateFilters({ status: undefined });
    }
  }, [urlStatus, updateFilters]);

  // Filters state for tabs
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">(
    urlStatus || "all",
  );

  // Handle status tab change
  const handleStatusChange = (status: QuoteStatus | "all") => {
    setStatusFilter(status);
    // Note: For quote requests, we might filter differently
    // For now, this is just UI state
  };

  // Status tabs (for future enhancement with actual counts)
  const statusTabs = useMemo(() => {
    return [{ value: "all" as const, label: "All", count: pagination.total }];
  }, [pagination.total]);

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<QuoteRequestFilters>) => {
    updateFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 !my-[16px]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {urlStatus === "pending" && "Awaiting Quotes"}
            {urlStatus === "priced" && "Priced Quotes"}
            {urlStatus === "approved" && "Approved Quotes"}
            {!urlStatus && "My Quote Requests"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {urlStatus === "pending" &&
              "Quote requests waiting for provider pricing"}
            {urlStatus === "priced" &&
              "Quote requests with pricing ready for your decision"}
            {urlStatus === "approved" && "Quote requests you have approved"}
            {!urlStatus && "Manage your shipping quote requests"}
          </p>
        </div>
        <Link href="/client/quotes/new">
          <Button>
            <svg
              className="h-4 w-4 mr-2"
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
            New Quote Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        showStatusFilter={false}
      />

      {/* Status Tabs (Mobile) */}
      {isMobile && (
        <StatusTabs
          tabs={statusTabs}
          activeTab={statusFilter}
          onChange={handleStatusChange}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && quoteRequests.length === 0 && (
        <Card variant="bordered" padding="lg">
          <CardContent className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No quote requests yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Create your first quote request to get pricing from service
              providers.
            </p>
            <div className="mt-6">
              <Link href="/client/quotes/new">
                <Button>Create Quote Request</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote Requests List */}
      {!isLoading && quoteRequests.length > 0 && (
        <div className="space-y-4">
          {quoteRequests.map((request) => (
            <Card
              key={request._id}
              variant="bordered"
              padding="none"
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/client/quotes/${request._id}`)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Route & Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <span>{request.portOfLoading}</span>
                      <svg
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                      <span>{request.portOfDischarge}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                      {request.commodity && (
                        <span>Commodity: {request.commodity}</span>
                      )}
                      {request.volume && <span>Volume: {request.volume}</span>}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatRelativeTime(request.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>

                {/* View Details Link */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  <span className="text-sm text-primary font-medium flex items-center gap-1">
                    View Quotes
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
