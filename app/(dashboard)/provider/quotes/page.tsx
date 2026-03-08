"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import {
  StatusTabs,
  generateStatusTabs,
} from "@/components/dashboard/StatusTabs";
import { QuoteList, QuoteTableItem } from "@/components/dashboard/QuoteList";
import { useQuotes, useQuoteMutations } from "@/hooks/useQuotes";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/src/lib/utils";
import type { QuoteStatus } from "@/src/lib/types/quote.types";

export default function ProviderQuotesPage() {
  const { canEdit } = useAuth();

  // Client filter state
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    undefined,
  );

  // Clients data for filter dropdown
  const { clients, isLoading: isLoadingClients } = useClients({ limit: 100 });

  // Quotes data with client filter
  const {
    quotes,
    pagination,
    statusCounts,
    totalCount,
    filters,
    isLoading,
    error,
    updateFilters,
    setPage,
    refresh,
  } = useQuotes({
    clientId: selectedClientId,
  });
  const {
    priceQuote,
    updateQuoteStatus,
    isLoading: isMutating,
  } = useQuoteMutations();

  // Generate status tabs with counts
  const statusTabs = useMemo(() => {
    return generateStatusTabs(statusCounts, totalCount);
  }, [statusCounts, totalCount]);

  // Count quotes with negotiation requests
  const negotiationCount = useMemo(() => {
    return (quotes as QuoteTableItem[]).filter((q) => q.negotiationRequested)
      .length;
  }, [quotes]);

  // Price modal state
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteTableItem | null>(
    null,
  );
  const [priceForm, setPriceForm] = useState({
    freightCost: "",
    transitDays: "",
  });
  const [priceError, setPriceError] = useState<string | null>(null);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  // Handle client filter change
  const handleClientChange = (clientId: string) => {
    const newClientId = clientId === "all" ? undefined : clientId;
    setSelectedClientId(newClientId);
    updateFilters({ clientId: newClientId, status: undefined });
    setStatusFilter("all");
  };

  // Handle status tab change
  const handleStatusChange = (status: QuoteStatus | "all") => {
    setStatusFilter(status);
    updateFilters({ status: status === "all" ? undefined : status });
  };

  // Handle price quote
  const handlePrice = (quote: QuoteTableItem) => {
    setSelectedQuote(quote);
    setPriceForm({ freightCost: "", transitDays: "" });
    setPriceError(null);
    setPriceModalOpen(true);
  };

  // Submit price
  const handleSubmitPrice = async () => {
    if (!selectedQuote) return;

    const freightCost = parseFloat(priceForm.freightCost);
    const transitDays = parseInt(priceForm.transitDays, 10);

    if (isNaN(freightCost) || freightCost <= 0) {
      setPriceError("Please enter a valid freight cost");
      return;
    }

    if (isNaN(transitDays) || transitDays <= 0) {
      setPriceError("Please enter valid transit days");
      return;
    }

    try {
      await priceQuote(selectedQuote._id, { freightCost, transitDays });
      setPriceModalOpen(false);
      setSelectedQuote(null);
      refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to price quote";
      setPriceError(message);
    }
  };

  // Handle complete
  const handleComplete = async (quote: QuoteTableItem) => {
    try {
      await updateQuoteStatus(quote._id, "completed");
      refresh();
    } catch (err) {
      console.error("Failed to complete quote:", err);
    }
  };

  // Handle reject
  const handleReject = async (quote: QuoteTableItem) => {
    try {
      await updateQuoteStatus(quote._id, "rejected");
      refresh();
    } catch (err) {
      console.error("Failed to reject quote:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage quote requests from clients
        </p>
      </div>

      {/* Client Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="h-5 w-5 text-slate-500"
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
          <span className="text-sm font-medium text-slate-700">
            Filter by Client
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleClientChange("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !selectedClientId
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Clients
          </button>
          {isLoadingClients ? (
            <div className="px-4 py-2 text-sm text-slate-500">
              Loading clients...
            </div>
          ) : (
            clients.map((client) => (
              <button
                key={client._id}
                onClick={() => handleClientChange(client._id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedClientId === client._id
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {client.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <StatusTabs
        tabs={statusTabs}
        activeTab={statusFilter}
        onChange={handleStatusChange}
      />

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFilterChange={updateFilters}
        showStatusFilter={false}
      />

      {/* Negotiation Requests Alert */}
      {negotiationCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl !my-[16px]">
          <div className="flex items-start gap-3 !p-[16px] ">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">
                {negotiationCount} Negotiation Request
                {negotiationCount > 1 ? "s" : ""}
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                Client{negotiationCount > 1 ? "s have" : " has"} requested price
                revisions. Review and submit updated prices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card
          variant="bordered"
          padding="md"
          className="bg-red-50 border-red-200"
        >
          <CardContent className="text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Quotes List */}
      <QuoteList
        quotes={quotes as QuoteTableItem[]}
        userType="provider"
        isLoading={isLoading}
        onPrice={canEdit ? handlePrice : undefined}
        onReject={canEdit ? handleReject : undefined}
        onComplete={canEdit ? handleComplete : undefined}
      />

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

      {/* Price Modal */}
      <Modal
        isOpen={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title={
          selectedQuote?.negotiationRequested ? "Revise Price" : "Price Quote"
        }
        description={
          selectedQuote
            ? `${selectedQuote.quoteRequest?.portOfLoading} → ${selectedQuote.quoteRequest?.portOfDischarge}`
            : ""
        }
        size="md"
      >
        <div className="space-y-4">
          {priceError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {priceError}
            </div>
          )}

          {/* Negotiation Request Info */}
          {selectedQuote?.negotiationRequested && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg !p-[16px] !my-[8px]">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Client Requested Price Revision
                  </p>
                  {selectedQuote.negotiationMessage ? (
                    <p className="mt-1 text-sm text-amber-700 italic">
                      &quot;{selectedQuote.negotiationMessage}&quot;
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">
                      No additional message provided
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Price (for re-pricing) */}
          {selectedQuote?.negotiationRequested && selectedQuote.freightCost && (
            <div className="bg-gray-50 rounded-lg p-4 !my-[8px]">
              <p className="text-sm text-gray-600 mb-2">Current Price</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedQuote.freightCost)}
                  </p>
                  <p className="text-sm text-gray-600 !my-[8px]">
                    {selectedQuote.transitDays} days transit
                  </p>
                </div>
                {selectedQuote.priceHistory &&
                  selectedQuote.priceHistory.length > 0 && (
                    <p className="text-xs text-gray-600 !my-[8px]">
                      {selectedQuote.priceHistory.length} previous revision
                      {selectedQuote.priceHistory.length > 1 ? "s" : ""}
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Client Info */}
          {selectedQuote?.client && (
            <div className="text-sm text-gray-600 !my-[8px]">
              <span className="font-medium">Client:</span>{" "}
              {selectedQuote.client.name}
              {selectedQuote.client.companyName &&
                ` (${selectedQuote.client.companyName})`}
            </div>
          )}

          <Input
            type="number"
            label={
              selectedQuote?.negotiationRequested
                ? "New Freight Cost (USD)"
                : "Freight Cost (USD)"
            }
            placeholder="0.00"
            value={priceForm.freightCost}
            onChange={(e) =>
              setPriceForm((prev) => ({ ...prev, freightCost: e.target.value }))
            }
            disabled={isMutating}
            className="!my-[8px]"
          />

          <Input
            type="number"
            label={
              selectedQuote?.negotiationRequested
                ? "New Transit Days"
                : "Transit Days"
            }
            placeholder="0"
            value={priceForm.transitDays}
            onChange={(e) =>
              setPriceForm((prev) => ({ ...prev, transitDays: e.target.value }))
            }
            disabled={isMutating}
          />
        </div>

        <ModalFooter className="!my-[8px] !py-[8px]">
          <Button
            variant="outline"
            onClick={() => setPriceModalOpen(false)}
            disabled={isMutating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPrice}
            isLoading={isMutating}
            disabled={isMutating}
            className={
              selectedQuote?.negotiationRequested
                ? "bg-amber-600 hover:bg-amber-700"
                : ""
            }
          >
            {selectedQuote?.negotiationRequested
              ? "Submit Revised Price"
              : "Submit Price"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
