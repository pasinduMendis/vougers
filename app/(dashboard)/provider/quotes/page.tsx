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
  generateProviderStatusTabs,
} from "@/components/dashboard/StatusTabs";
import { QuoteList, QuoteTableItem } from "@/components/dashboard/QuoteList";
import { useQuotes, useQuoteMutations } from "@/hooks/useQuotes";
import { useQuoteSubscription } from "@/hooks/useQuoteSubscription";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { QuoteStatus } from "@/src/lib/types/quote.types";

export default function ProviderQuotesPage() {
  const { user, canEdit } = useAuth();

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
    rejectNegotiation,
    addAgentDetails,
    isLoading: isMutating,
  } = useQuoteMutations();

  // Subscribe to real-time quote updates
  const { isConnected } = useQuoteSubscription({
    organizationId: user?.organizationId,
    onAnyQuoteEvent: refresh, // Auto-refresh when any quote event occurs
  });

  // Generate status tabs with counts (provider view includes lost/missed)
  const statusTabs = useMemo(() => {
    return generateProviderStatusTabs(statusCounts, totalCount);
  }, [statusCounts, totalCount]);

  // Count quotes with negotiation requests (exclude lost/missed - no action needed)
  const negotiationCount = useMemo(() => {
    return (quotes as QuoteTableItem[]).filter(
      (q) =>
        q.negotiationRequested &&
        q.status !== "lost" &&
        q.status !== "missed"
    ).length;
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

  // Agent details modal state
  const [agentDetailsModalOpen, setAgentDetailsModalOpen] = useState(false);
  const [selectedQuoteForAgentDetails, setSelectedQuoteForAgentDetails] = useState<QuoteTableItem | null>(null);
  const [agentDetailsText, setAgentDetailsText] = useState("");
  const [agentDetailsError, setAgentDetailsError] = useState<string | null>(null);

  // View details modal state (for completed quotes)
  const [viewSupplierModalOpen, setViewSupplierModalOpen] = useState(false);
  const [viewAgentModalOpen, setViewAgentModalOpen] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<QuoteTableItem | null>(null);

  // Quote detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQuoteForDetail, setSelectedQuoteForDetail] = useState<QuoteTableItem | null>(null);

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

  // Handle reject
  const handleReject = async (quote: QuoteTableItem) => {
    try {
      await updateQuoteStatus(quote._id, "rejected");
      refresh();
    } catch (err) {
      console.error("Failed to reject quote:", err);
    }
  };

  // Handle reject negotiation (keep price, clear negotiation request)
  const handleRejectNegotiation = async (quote: QuoteTableItem) => {
    try {
      await rejectNegotiation(quote._id);
      refresh();
    } catch (err) {
      console.error("Failed to reject negotiation:", err);
    }
  };

  // Handle add agent details modal open
  const handleAddAgentDetails = (quote: QuoteTableItem) => {
    setSelectedQuoteForAgentDetails(quote);
    setAgentDetailsText("");
    setAgentDetailsError(null);
    setAgentDetailsModalOpen(true);
  };

  // Submit agent details
  const handleSubmitAgentDetails = async () => {
    if (!selectedQuoteForAgentDetails) return;

    if (!agentDetailsText.trim()) {
      setAgentDetailsError("Please enter agent details");
      return;
    }

    if (agentDetailsText.length > 2000) {
      setAgentDetailsError("Agent details cannot exceed 2000 characters");
      return;
    }

    try {
      await addAgentDetails(selectedQuoteForAgentDetails._id, agentDetailsText.trim());
      setAgentDetailsModalOpen(false);
      setSelectedQuoteForAgentDetails(null);
      setAgentDetailsText("");
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add agent details";
      setAgentDetailsError(message);
    }
  };

  // Handle view supplier details (for completed quotes)
  const handleViewSupplierDetails = (quote: QuoteTableItem) => {
    setSelectedQuoteForView(quote);
    setViewSupplierModalOpen(true);
  };

  // Handle view agent details (for completed quotes)
  const handleViewAgentDetails = (quote: QuoteTableItem) => {
    setSelectedQuoteForView(quote);
    setViewAgentModalOpen(true);
  };

  // Handle view quote details (opens detail modal)
  const handleViewQuote = (quote: QuoteTableItem) => {
    setSelectedQuoteForDetail(quote);
    setDetailModalOpen(true);
  };

  // Handle close detail modal
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedQuoteForDetail(null);
  };

  // Handle price from detail modal
  const handlePriceFromDetail = () => {
    if (selectedQuoteForDetail) {
      handleCloseDetailModal();
      handlePrice(selectedQuoteForDetail);
    }
  };

  // Handle add agent details from detail modal
  const handleAddAgentDetailsFromDetail = () => {
    if (selectedQuoteForDetail) {
      handleCloseDetailModal();
      handleAddAgentDetails(selectedQuoteForDetail);
    }
  };

  // Format date for display
  const formatDate = (date?: string | Date) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        onRejectNegotiation={canEdit ? handleRejectNegotiation : undefined}
        onAddAgentDetails={canEdit ? handleAddAgentDetails : undefined}
        onViewSupplierDetails={handleViewSupplierDetails}
        onViewAgentDetails={handleViewAgentDetails}
        onQuoteClick={handleViewQuote}
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

      {/* Agent Details Modal */}
      <Modal
        isOpen={agentDetailsModalOpen}
        onClose={() => setAgentDetailsModalOpen(false)}
        title="Add Agent Details"
        description={
          selectedQuoteForAgentDetails
            ? `${selectedQuoteForAgentDetails.quoteRequest?.portOfLoading} → ${selectedQuoteForAgentDetails.quoteRequest?.portOfDischarge}`
            : ""
        }
        size="md"
      >
        <div className="space-y-4">
          {agentDetailsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {agentDetailsError}
            </div>
          )}

          {/* Client Info */}
          {selectedQuoteForAgentDetails?.client && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Client:</span>{" "}
              {selectedQuoteForAgentDetails.client.name}
              {selectedQuoteForAgentDetails.client.companyName &&
                ` (${selectedQuoteForAgentDetails.client.companyName})`}
            </div>
          )}

          {/* Show supplier details that client submitted */}
          {selectedQuoteForAgentDetails?.supplierDetails && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-700 mb-2">
                Client Supplier Details:
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {selectedQuoteForAgentDetails.supplierDetails}
              </p>
            </div>
          )}

          {/* Agent Details Text Area */}
          <div>
            <label
              htmlFor="agentDetails"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Agent Details
            </label>
            <textarea
              id="agentDetails"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Enter agent/shipping details for the client..."
              value={agentDetailsText}
              onChange={(e) => setAgentDetailsText(e.target.value)}
              disabled={isMutating}
              maxLength={2000}
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {agentDetailsText.length}/2000 characters
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Submitting agent details will automatically mark this quote as completed.
            </p>
          </div>
        </div>

        <ModalFooter className="!my-[8px] !py-[8px]">
          <Button
            variant="outline"
            onClick={() => setAgentDetailsModalOpen(false)}
            disabled={isMutating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAgentDetails}
            isLoading={isMutating}
            disabled={isMutating || !agentDetailsText.trim()}
          >
            Submit & Complete
          </Button>
        </ModalFooter>
      </Modal>

      {/* View Supplier Details Modal (Read-only for completed quotes) */}
      <Modal
        isOpen={viewSupplierModalOpen}
        onClose={() => {
          setViewSupplierModalOpen(false);
          setSelectedQuoteForView(null);
        }}
        title="Supplier Details"
        description={
          selectedQuoteForView
            ? `${selectedQuoteForView.client?.name || "Client"} - ${selectedQuoteForView.quoteRequest?.portOfLoading} → ${selectedQuoteForView.quoteRequest?.portOfDischarge}`
            : ""
        }
        size="md"
      >
        <div className="space-y-4">
          {selectedQuoteForView && (
            <>
              {selectedQuoteForView.supplierDetails ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedQuoteForView.supplierDetails}
                    </p>
                  </div>
                  {selectedQuoteForView.supplierDetailsAddedAt && (
                    <p className="text-xs text-gray-500">
                      Added on {formatDate(selectedQuoteForView.supplierDetailsAddedAt)}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <p className="mt-2 text-sm text-gray-500">No supplier details available</p>
                </div>
              )}
            </>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => {
              setViewSupplierModalOpen(false);
              setSelectedQuoteForView(null);
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* View Agent Details Modal (Read-only for completed quotes) */}
      <Modal
        isOpen={viewAgentModalOpen}
        onClose={() => {
          setViewAgentModalOpen(false);
          setSelectedQuoteForView(null);
        }}
        title="Agent Details"
        description={
          selectedQuoteForView
            ? `${selectedQuoteForView.client?.name || "Client"} - ${selectedQuoteForView.quoteRequest?.portOfLoading} → ${selectedQuoteForView.quoteRequest?.portOfDischarge}`
            : ""
        }
        size="md"
      >
        <div className="space-y-4">
          {selectedQuoteForView && (
            <>
              {selectedQuoteForView.agentDetails ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedQuoteForView.agentDetails}
                    </p>
                  </div>
                  {selectedQuoteForView.agentDetailsAddedAt && (
                    <p className="text-xs text-gray-500">
                      Added on {formatDate(selectedQuoteForView.agentDetailsAddedAt)}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <p className="mt-2 text-sm text-gray-500">No agent details available</p>
                </div>
              )}
            </>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => {
              setViewAgentModalOpen(false);
              setSelectedQuoteForView(null);
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Quote Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        title="Quote Details"
        size="lg"
      >
        {selectedQuoteForDetail && (
          <div className="space-y-6">
            {/* Status and Date Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedQuoteForDetail.status} />
                {selectedQuoteForDetail.negotiationRequested &&
                  selectedQuoteForDetail.status !== "lost" &&
                  selectedQuoteForDetail.status !== "missed" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      Negotiation Requested
                    </span>
                  )}
              </div>
              <span className="text-sm text-gray-500">
                Quote ID: {selectedQuoteForDetail._id.slice(-8)}
              </span>
            </div>

            {/* Client Information */}
            {selectedQuoteForDetail.client && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Client Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    <p className="font-semibold text-gray-900">
                      {selectedQuoteForDetail.client.name}
                    </p>
                  </div>
                  {selectedQuoteForDetail.client.companyName && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company</p>
                      <p className="font-medium text-gray-900">
                        {selectedQuoteForDetail.client.companyName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Negotiation Request Alert */}
            {selectedQuoteForDetail.negotiationRequested &&
              selectedQuoteForDetail.status !== "lost" &&
              selectedQuoteForDetail.status !== "missed" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">
                        Client Requested Price Revision
                      </h4>
                      {selectedQuoteForDetail.negotiationMessage ? (
                        <p className="text-sm text-amber-700 mt-1 italic">
                          &quot;{selectedQuoteForDetail.negotiationMessage}&quot;
                        </p>
                      ) : (
                        <p className="text-sm text-amber-600 mt-1">
                          No additional message provided
                        </p>
                      )}
                      {selectedQuoteForDetail.negotiationRequestedAt && (
                        <p className="text-xs text-amber-600 mt-2">
                          Requested on {formatDate(selectedQuoteForDetail.negotiationRequestedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Route Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Route Information
              </h4>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500 mb-1">Port of Loading</p>
                  <p className="font-semibold text-gray-900">
                    {selectedQuoteForDetail.quoteRequest?.portOfLoading}
                  </p>
                </div>
                <div className="flex-shrink-0 mx-4 flex items-center justify-center">
                  <div className="h-px w-8 bg-indigo-300" />
                  <svg
                    className="h-5 w-5 text-indigo-500 mx-2"
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
                  <div className="h-px w-8 bg-indigo-300" />
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500 mb-1">Port of Discharge</p>
                  <p className="font-semibold text-gray-900">
                    {selectedQuoteForDetail.quoteRequest?.portOfDischarge}
                  </p>
                </div>
              </div>
            </div>

            {/* Cargo / Shipment Details */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Shipment Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {selectedQuoteForDetail.quoteRequest?.commodity && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Commodity</p>
                    <p className="font-medium text-gray-900">
                      {selectedQuoteForDetail.quoteRequest.commodity}
                    </p>
                  </div>
                )}
                {selectedQuoteForDetail.quoteRequest?.volume && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Volume</p>
                    <p className="font-medium text-gray-900">
                      {selectedQuoteForDetail.quoteRequest.volume}
                    </p>
                  </div>
                )}
                {selectedQuoteForDetail.quoteRequest?.pickupAddress && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Pickup Address</p>
                    <p className="font-medium text-gray-900">
                      {selectedQuoteForDetail.quoteRequest.pickupAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information (Extra Fields) */}
            {selectedQuoteForDetail.quoteRequest?.extraFields &&
              Object.keys(selectedQuoteForDetail.quoteRequest.extraFields).length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Additional Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedQuoteForDetail.quoteRequest.extraFields).map(
                      ([key, value]) => (
                        <div key={key} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="font-medium text-gray-900">{String(value)}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Pricing Information */}
            {(selectedQuoteForDetail.freightCost || selectedQuoteForDetail.transitDays) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-green-800 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Your Pricing
                  </h4>
                  {selectedQuoteForDetail.pricedAt && (
                    <span className="text-xs text-green-600">
                      Priced on {formatDate(selectedQuoteForDetail.pricedAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-8">
                  {selectedQuoteForDetail.freightCost && (
                    <div>
                      <p className="text-xs text-green-600 mb-1">Freight Cost</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(selectedQuoteForDetail.freightCost)}
                      </p>
                    </div>
                  )}
                  {selectedQuoteForDetail.transitDays && (
                    <div>
                      <p className="text-xs text-green-600 mb-1">Transit Time</p>
                      <p className="text-2xl font-bold text-green-700">
                        {selectedQuoteForDetail.transitDays}{" "}
                        <span className="text-sm font-normal">days</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price History */}
            {selectedQuoteForDetail.priceHistory &&
              selectedQuoteForDetail.priceHistory.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Price History ({selectedQuoteForDetail.priceHistory.length} revision
                    {selectedQuoteForDetail.priceHistory.length > 1 ? "s" : ""})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedQuoteForDetail.priceHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-gray-900">
                            {formatCurrency(entry.freightCost)}
                          </span>
                          <span className="text-gray-600">
                            {entry.transitDays} days
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(entry.pricedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Supplier Details (from client) */}
            {selectedQuoteForDetail.supplierDetails && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Client Supplier Details
                  </h4>
                  {selectedQuoteForDetail.supplierDetailsAddedAt && (
                    <span className="text-xs text-blue-600">
                      Added on {formatDate(selectedQuoteForDetail.supplierDetailsAddedAt)}
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedQuoteForDetail.supplierDetails}
                  </p>
                </div>
              </div>
            )}

            {/* Agent Details (from provider) */}
            {selectedQuoteForDetail.agentDetails && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-purple-800 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Your Agent Details
                  </h4>
                  {selectedQuoteForDetail.agentDetailsAddedAt && (
                    <span className="text-xs text-purple-600">
                      Added on {formatDate(selectedQuoteForDetail.agentDetailsAddedAt)}
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedQuoteForDetail.agentDetails}
                  </p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                <span>
                  <strong>Quote Created:</strong> {formatDate(selectedQuoteForDetail.createdAt)}
                </span>
                {selectedQuoteForDetail.updatedAt && (
                  <span>
                    <strong>Last Updated:</strong> {formatDate(selectedQuoteForDetail.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <ModalFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={handleCloseDetailModal}>
            Close
          </Button>
          {canEdit && selectedQuoteForDetail && (
            <>
              {/* Pending: Can Price or Reject */}
              {selectedQuoteForDetail.status === "pending" && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleCloseDetailModal();
                      handleReject(selectedQuoteForDetail);
                    }}
                    disabled={isMutating}
                  >
                    Reject
                  </Button>
                  <Button variant="primary" onClick={handlePriceFromDetail}>
                    Price Quote
                  </Button>
                </>
              )}

              {/* Priced with negotiation: Can Revise Price or Reject negotiation */}
              {selectedQuoteForDetail.status === "priced" &&
                selectedQuoteForDetail.negotiationRequested && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleCloseDetailModal();
                        handleRejectNegotiation(selectedQuoteForDetail);
                      }}
                      disabled={isMutating}
                    >
                      Reject Negotiation
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handlePriceFromDetail}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Revise Price
                    </Button>
                  </>
                )}

              {/* Priced without negotiation: Waiting for client */}
              {selectedQuoteForDetail.status === "priced" &&
                !selectedQuoteForDetail.negotiationRequested && (
                  <span className="text-sm text-gray-500 px-4">
                    Waiting for client response
                  </span>
                )}

              {/* Approved without supplier details: Waiting */}
              {selectedQuoteForDetail.status === "approved" &&
                !selectedQuoteForDetail.supplierDetails && (
                  <span className="text-sm text-amber-600 px-4">
                    Waiting for client to submit supplier details
                  </span>
                )}

              {/* Approved with supplier details: Can add agent details */}
              {selectedQuoteForDetail.status === "approved" &&
                selectedQuoteForDetail.supplierDetails && (
                  <Button variant="primary" onClick={handleAddAgentDetailsFromDetail}>
                    Add Agent Details
                  </Button>
                )}

              {/* Completed: Show status */}
              {selectedQuoteForDetail.status === "completed" && (
                <span className="text-sm text-purple-600 font-medium px-4">
                  Shipment completed
                </span>
              )}

              {/* Rejected/Lost/Missed: No actions */}
              {(selectedQuoteForDetail.status === "rejected" ||
                selectedQuoteForDetail.status === "lost" ||
                selectedQuoteForDetail.status === "missed") && (
                <span className="text-sm text-gray-500 px-4">No actions available</span>
              )}
            </>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
