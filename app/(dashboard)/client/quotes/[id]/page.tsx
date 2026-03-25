"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { QuoteComparison } from "@/components/dashboard/QuoteComparison";
import { useQuoteRequest } from "@/hooks/useQuotes";
import { useQuoteMutations } from "@/hooks/useQuotes";
import { useQuoteSubscription } from "@/hooks/useQuoteSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatCurrency } from "@/src/lib/utils";
import type { QuoteResponse } from "@/src/lib/types/quote.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuoteRequestDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { quoteRequest, isLoading, error, refresh } = useQuoteRequest(id);
  const {
    updateQuoteStatus,
    cancelQuoteRequest,
    requestNegotiation,
    addSupplierDetails,
    isLoading: isMutating,
  } = useQuoteMutations();

  // Subscribe to real-time quote updates
  const { isConnected } = useQuoteSubscription({
    clientId: user?.id,
    quoteRequestId: id,
    onAnyQuoteEvent: refresh, // Auto-refresh when any quote event occurs
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Negotiation modal state
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedQuoteForNegotiation, setSelectedQuoteForNegotiation] =
    useState<QuoteResponse | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState("");

  // Check if any quote has been approved
  const hasApprovedQuote = useMemo(() => {
    if (!quoteRequest) return false;
    return quoteRequest.quotes.some((q) => q.status === "approved");
  }, [quoteRequest]);

  // Handle approve quote
  const handleApprove = async (quote: QuoteResponse) => {
    try {
      setActionError(null);
      await updateQuoteStatus(quote._id, "approved");
      refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve quote";
      setActionError(message);
    }
  };

  // Handle reject quote
  const handleReject = async (quote: QuoteResponse) => {
    try {
      setActionError(null);
      await updateQuoteStatus(quote._id, "rejected");
      refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject quote";
      setActionError(message);
    }
  };

  // Open negotiation modal
  const handleOpenNegotiateModal = (quote: QuoteResponse) => {
    setSelectedQuoteForNegotiation(quote);
    setNegotiationMessage("");
    setShowNegotiateModal(true);
  };

  // Submit negotiation request
  const handleSubmitNegotiation = async () => {
    if (!selectedQuoteForNegotiation) return;

    try {
      setActionError(null);
      await requestNegotiation(
        selectedQuoteForNegotiation._id,
        negotiationMessage || undefined,
      );
      setShowNegotiateModal(false);
      setSelectedQuoteForNegotiation(null);
      setNegotiationMessage("");
      refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to request negotiation";
      setActionError(message);
    }
  };

  // Handle cancel quote request
  const handleCancel = async () => {
    try {
      setActionError(null);
      await cancelQuoteRequest(id);
      router.push("/client/quotes");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel quote request";
      setActionError(message);
      setShowCancelConfirm(false);
    }
  };

  // Handle add supplier details
  const handleAddSupplierDetails = async (quote: QuoteResponse, details: string) => {
    try {
      setActionError(null);
      await addSupplierDetails(quote._id, details);
      refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add supplier details";
      setActionError(message);
      throw err; // Re-throw so the modal can handle the error
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-60 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quoteRequest) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card variant="bordered" padding="lg">
          <CardContent className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Quote request not found
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {error || "The quote request you are looking for does not exist."}
            </p>
            <div className="mt-6">
              <Link href="/client/quotes">
                <Button variant="outline">Back to Quotes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 !mb-[8px]">
        <Link href="/client/quotes" className="hover:text-primary">
          My Quotes
        </Link>
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
        <span className="text-gray-900">Quote Request Details</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 !mb-[8px]">
            {quoteRequest.portOfLoading} → {quoteRequest.portOfDischarge}
          </h1>
          <p className="mt-1 text-sm text-gray-600 !mb-[8px]">
            Created on {formatDate(quoteRequest.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!hasApprovedQuote && (
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isMutating}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cancel Request
            </Button>
          )}
          <Link href="/client/quotes/new">
            <Button variant="outline">
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
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl !p-[24px] max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 !my-[8px]">
              Cancel Quote Request?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to cancel this quote request? This action
              cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isMutating}
              >
                Keep Request
              </Button>
              <Button
                variant="primary"
                onClick={handleCancel}
                disabled={isMutating}
                className="bg-red-600 hover:bg-red-700"
              >
                {isMutating ? "Cancelling..." : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Quote Comparison */}
      <QuoteComparison
        quoteRequest={quoteRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        onNegotiate={handleOpenNegotiateModal}
        onAddSupplierDetails={handleAddSupplierDetails}
      />

      {/* Negotiation Modal */}
      <Modal
        isOpen={showNegotiateModal}
        onClose={() => setShowNegotiateModal(false)}
        title="Request Better Price"
        description={
          selectedQuoteForNegotiation
            ? `Request a price revision from ${selectedQuoteForNegotiation.provider?.name || "the provider"}`
            : ""
        }
        size="md"
      >
        <div className="space-y-4">
          {/* Current Price Info */}
          {selectedQuoteForNegotiation && (
            <div className="bg-gray-50 rounded-lg !my-[16px]">
              <p className="text-sm text-gray-600 mb-2">Current Quote</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedQuoteForNegotiation.freightCost
                      ? formatCurrency(selectedQuoteForNegotiation.freightCost)
                      : "-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedQuoteForNegotiation.transitDays
                      ? `${selectedQuoteForNegotiation.transitDays} days transit`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {selectedQuoteForNegotiation.provider?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="!my-[16px]">
            <label
              htmlFor="negotiation-message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Message to Provider (optional)
            </label>
            <textarea
              id="negotiation-message"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-700 !p-[8px]"
              placeholder="e.g., Can you offer a better rate for this route? We have regular shipments..."
              value={negotiationMessage}
              onChange={(e) => setNegotiationMessage(e.target.value)}
              maxLength={500}
              disabled={isMutating}
            />
            <p className="mt-1 text-xs text-gray-600">
              {negotiationMessage.length}/500 characters
            </p>
          </div>

          {/* Info Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <svg
                className="h-5 w-5 text-amber-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-amber-800 !my-[8px]">
                The provider will be notified of your request and can submit a
                revised price.
              </p>
            </div>
          </div>
        </div>

        <ModalFooter className="!my-[16px]">
          <Button
            variant="outline"
            onClick={() => setShowNegotiateModal(false)}
            disabled={isMutating}
            className="!mt-[8px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitNegotiation}
            isLoading={isMutating}
            disabled={isMutating}
            className="!mt-[8px]"
          >
            Send Request
          </Button>
        </ModalFooter>
      </Modal>

      {/* Back Button */}
      <div className="pt-4 border-t border-gray-200">
        <Link href="/client/quotes">
          <Button variant="ghost">
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to All Quotes
          </Button>
        </Link>
      </div>
    </div>
  );
}
