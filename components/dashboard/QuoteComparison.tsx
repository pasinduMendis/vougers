"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { cn } from "@/src/lib/utils";
import type {
  QuoteResponse,
  QuoteRequestWithQuotes,
} from "@/src/lib/types/quote.types";

interface QuoteComparisonProps {
  quoteRequest: QuoteRequestWithQuotes;
  onApprove?: (quote: QuoteResponse) => void;
  onReject?: (quote: QuoteResponse) => void;
  onNegotiate?: (quote: QuoteResponse) => void;
  onAddSupplierDetails?: (quote: QuoteResponse, details: string) => Promise<void>;
}

export function QuoteComparison({
  quoteRequest,
  onApprove,
  onReject,
  onNegotiate,
  onAddSupplierDetails,
}: QuoteComparisonProps) {
  const { quotes } = quoteRequest;

  // Supplier details modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedQuoteForSupplier, setSelectedQuoteForSupplier] = useState<QuoteResponse | null>(null);
  const [supplierDetails, setSupplierDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // View details modal state (for completed quotes)
  const [showViewSupplierModal, setShowViewSupplierModal] = useState(false);
  const [showViewAgentModal, setShowViewAgentModal] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<QuoteResponse | null>(null);

  // Handle opening supplier details modal
  const handleOpenSupplierModal = (quote: QuoteResponse) => {
    setSelectedQuoteForSupplier(quote);
    setSupplierDetails(quote.supplierDetails || "");
    setSupplierError(null);
    setShowSupplierModal(true);
  };

  // Handle submitting supplier details
  const handleSubmitSupplierDetails = async () => {
    if (!selectedQuoteForSupplier || !onAddSupplierDetails) return;

    if (!supplierDetails.trim()) {
      setSupplierError("Please enter supplier details");
      return;
    }

    try {
      setIsSubmitting(true);
      setSupplierError(null);
      await onAddSupplierDetails(selectedQuoteForSupplier, supplierDetails.trim());
      setShowSupplierModal(false);
      setSelectedQuoteForSupplier(null);
      setSupplierDetails("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add supplier details";
      setSupplierError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if any quote has been approved or completed
  const approvedQuote = useMemo(() => {
    return quotes.find((q) => q.status === "approved" || q.status === "completed");
  }, [quotes]);

  const hasApprovedQuote = !!approvedQuote;

  // Find the best (lowest) price among priced quotes
  const bestPrice = useMemo(() => {
    const pricedQuotes = quotes.filter((q) => q.freightCost != null);
    if (pricedQuotes.length === 0) return null;
    return Math.min(...pricedQuotes.map((q) => q.freightCost!));
  }, [quotes]);

  // Find the fastest (lowest) transit time
  const fastestTransit = useMemo(() => {
    const transitQuotes = quotes.filter((q) => q.transitDays != null);
    if (transitQuotes.length === 0) return null;
    return Math.min(...transitQuotes.map((q) => q.transitDays!));
  }, [quotes]);

  // Separate quotes by status for ordering
  // Note: 'lost' and 'missed' are provider-only statuses, display them after rejected
  const sortedQuotes = useMemo(() => {
    const statusOrder: Record<string, number> = {
      approved: 1,
      completed: 2,
      priced: 3,
      pending: 4,
      rejected: 5,
      lost: 6,
      missed: 7,
    };
    return [...quotes].sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      return orderA - orderB;
    });
  }, [quotes]);

  if (quotes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No quotes available for this request.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shipment Details Summary */}
      <Card variant="bordered" padding="md">
        <CardHeader>
          <CardTitle className="text-lg">Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="[&>div]:!my-[24px]">
          <div className="grid grid-cols-2 md:grid-cols-4 !gap-[16px] text-sm">
            <div>
              <p className="text-gray-700">Port of Loading</p>
              <p className="font-semibold text-gray-900">
                {quoteRequest.portOfLoading}
              </p>
            </div>
            <div>
              <p className="text-gray-700">Port of Discharge</p>
              <p className="font-semibold text-gray-900">
                {quoteRequest.portOfDischarge}
              </p>
            </div>
            {quoteRequest.commodity && (
              <div>
                <p className="text-gray-700">Commodity</p>
                <p className="font-semibold text-gray-900">
                  {quoteRequest.commodity}
                </p>
              </div>
            )}
            {quoteRequest.volume && (
              <div>
                <p className="text-gray-700">Volume</p>
                <p className="font-semibold text-gray-900">
                  {quoteRequest.volume}
                </p>
              </div>
            )}
          </div>
          {quoteRequest.pickupAddress && (
            <div className="mt-4 text-sm">
              <p className="text-gray-700">Pickup Address</p>
              <p className="font-semibold text-gray-900">
                {quoteRequest.pickupAddress}
              </p>
            </div>
          )}

          {/* Extra Fields */}
          {quoteRequest.extraFields &&
            Object.keys(quoteRequest.extraFields).length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Additional Information
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm [&>div]:!my-[24px]">
                  {Object.entries(quoteRequest.extraFields).map(
                    ([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-slate-700 text-xs uppercase tracking-wide">
                          {key}
                        </p>
                        <p className="font-medium text-slate-800 mt-0.5">
                          {String(value)}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Quote Comparison Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Provider Quotes ({quotes.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedQuotes.map((quote) => {
            const isBestPrice =
              quote.freightCost === bestPrice && bestPrice !== null;
            const isFastest =
              quote.transitDays === fastestTransit && fastestTransit !== null;
            const isApprovedQuote = quote.status === "approved" || quote.status === "completed";
            const isLostOrMissed = quote.status === "lost" || quote.status === "missed";
            const isDisabled = hasApprovedQuote && !isApprovedQuote;

            return (
              <Card
                key={quote._id}
                variant="bordered"
                padding="none"
                className={cn(
                  "relative overflow-hidden transition-all",
                  isBestPrice && !isDisabled && !isLostOrMissed && "ring-2 ring-green-500",
                  isApprovedQuote && "ring-2 ring-green-500",
                  (isDisabled || isLostOrMissed) && "opacity-60 grayscale",
                )}
              >
                {/* Best Price Badge */}
                {isBestPrice && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl">
                    Best Price
                  </div>
                )}

                <CardContent className="p-4">
                  {/* Provider Name & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      {quote.provider?.name || "Unknown Provider"}
                    </h4>
                    {/* For lost/missed, show "Not Selected" instead of the provider-only status */}
                    {isLostOrMissed ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
                        Not Selected
                      </span>
                    ) : (
                      <StatusBadge status={quote.status} size="sm" />
                    )}
                  </div>

                  {/* Pricing Info */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Freight Cost
                      </span>
                      <span
                        className={cn(
                          "font-semibold text-lg text-gray-600",
                          isBestPrice && "text-green-600",
                        )}
                      >
                        {quote.freightCost != null ? (
                          formatCurrency(quote.freightCost)
                        ) : (
                          <span className="text-gray-600">Pending</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Transit Time
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          isFastest && "text-blue-600",
                        )}
                      >
                        {quote.transitDays != null ? (
                          `${quote.transitDays} days`
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                        {isFastest && (
                          <span className="ml-1 text-xs">(fastest)</span>
                        )}
                      </span>
                    </div>

                    {quote.pricedAt && (
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>Priced on</span>
                        <span>{formatDate(quote.pricedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Actions */}
                {quote.status === "priced" && !isDisabled && (
                  <CardFooter className="px-4 py-3 bg-gray-50">
                    {/* Show negotiation requested status */}
                    {quote.negotiationRequested ? (
                      <div className="w-full text-center">
                        <p className="text-sm text-amber-700 font-medium">
                          Negotiation requested
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Awaiting provider&apos;s revised price
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            fullWidth
                            onClick={() => onApprove?.(quote)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            fullWidth
                            onClick={() => onReject?.(quote)}
                          >
                            Reject
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          fullWidth
                          onClick={() => onNegotiate?.(quote)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          Request Better Price
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                )}

                {/* Disabled state when another quote is approved - show for priced quotes */}
                {quote.status === "priced" && isDisabled && (
                  <CardFooter className="px-4 py-3 bg-gray-100">
                    <p className="text-sm text-gray-500 text-center w-full">
                      Another quote has been approved
                    </p>
                  </CardFooter>
                )}

                {quote.status === "approved" && (
                  <CardFooter className="px-4 py-3 bg-green-50">
                    <div className="w-full">
                      <p className="text-sm text-green-700 text-center mb-2">
                        You approved this quote
                      </p>
                      {quote.supplierDetails ? (
                        <div className="mt-2 p-2 bg-white rounded border border-green-200">
                          <p className="text-xs text-gray-600 mb-1">Supplier Details:</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{quote.supplierDetails}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            fullWidth
                            onClick={() => handleOpenSupplierModal(quote)}
                            className="mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            Edit Supplier Details
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          fullWidth
                          onClick={() => handleOpenSupplierModal(quote)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Add Supplier Details
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                )}

                {quote.status === "rejected" && (
                  <CardFooter className="px-4 py-3 bg-red-50">
                    <p className="text-sm text-red-700 text-center w-full">
                      You rejected this quote
                    </p>
                  </CardFooter>
                )}

                {quote.status === "pending" && !isDisabled && (
                  <CardFooter className="px-4 py-3 bg-yellow-50">
                    <p className="text-sm text-yellow-700 text-center w-full">
                      Awaiting provider&apos;s price
                    </p>
                  </CardFooter>
                )}

                {/* Disabled state for pending quotes when another quote is approved */}
                {quote.status === "pending" && isDisabled && (
                  <CardFooter className="px-4 py-3 bg-gray-100">
                    <p className="text-sm text-gray-500 text-center w-full">
                      Another quote has been approved
                    </p>
                  </CardFooter>
                )}

                {/* Lost/Missed quotes - show neutral message for client */}
                {isLostOrMissed && (
                  <CardFooter className="px-4 py-3 bg-gray-100">
                    <p className="text-sm text-gray-500 text-center w-full">
                      Another quote was selected
                    </p>
                  </CardFooter>
                )}

                {quote.status === "completed" && (
                  <CardFooter className="px-4 py-3 bg-purple-50">
                    <div className="w-full space-y-3">
                      <p className="text-sm text-purple-700 text-center font-medium">
                        Shipment completed
                      </p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          fullWidth
                          onClick={() => {
                            setSelectedQuoteForView(quote);
                            setShowViewSupplierModal(true);
                          }}
                        >
                          View Supplier Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          fullWidth
                          onClick={() => {
                            setSelectedQuoteForView(quote);
                            setShowViewAgentModal(true);
                          }}
                        >
                          View Agent Details
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <Card variant="bordered" padding="md" className="bg-gray-50">
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {quotes.length}
              </p>
              <p className="text-sm text-gray-700">Total Providers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {quotes.filter((q) => q.status === "approved" || q.status === "completed").length}
              </p>
              <p className="text-sm text-gray-700">Approved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {quotes.filter((q) => q.status === "priced").length}
              </p>
              <p className="text-sm text-gray-700">Priced</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {quotes.filter((q) => q.status === "pending").length}
              </p>
              <p className="text-sm text-gray-700">Awaiting</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Details Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title={selectedQuoteForSupplier?.supplierDetails ? "Edit Supplier Details" : "Add Supplier Details"}
        description={
          selectedQuoteForSupplier
            ? `Add supplier information for ${selectedQuoteForSupplier.provider?.name || "the provider"}`
            : ""
        }
        size="md"
      >
        <div className="space-y-4">
          {/* Provider Info */}
          {selectedQuoteForSupplier && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-2">Approved Quote</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedQuoteForSupplier.freightCost
                      ? formatCurrency(selectedQuoteForSupplier.freightCost)
                      : "-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedQuoteForSupplier.transitDays
                      ? `${selectedQuoteForSupplier.transitDays} days transit`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {selectedQuoteForSupplier.provider?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {supplierError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {supplierError}
            </div>
          )}

          {/* Supplier Details Input */}
          <div>
            <label
              htmlFor="supplier-details"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Supplier Details
            </label>
            <textarea
              id="supplier-details"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-700"
              placeholder="Enter supplier details such as contact information, pickup schedule, special instructions, etc."
              value={supplierDetails}
              onChange={(e) => setSupplierDetails(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-600">
              {supplierDetails.length}/2000 characters
            </p>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <svg
                className="h-5 w-5 text-blue-600 flex-shrink-0"
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
              <p className="text-sm text-blue-800">
                These details will be shared with the service provider to help them fulfill your shipment.
              </p>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowSupplierModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitSupplierDetails}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {selectedQuoteForSupplier?.supplierDetails ? "Update Details" : "Submit Details"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* View Supplier Details Modal (Read-only for completed quotes) */}
      <Modal
        isOpen={showViewSupplierModal}
        onClose={() => {
          setShowViewSupplierModal(false);
          setSelectedQuoteForView(null);
        }}
        title="Supplier Details"
        description={
          selectedQuoteForView
            ? `${selectedQuoteForView.provider?.name || "Provider"} - ${quoteRequest.portOfLoading} → ${quoteRequest.portOfDischarge}`
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
              setShowViewSupplierModal(false);
              setSelectedQuoteForView(null);
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* View Agent Details Modal (Read-only for completed quotes) */}
      <Modal
        isOpen={showViewAgentModal}
        onClose={() => {
          setShowViewAgentModal(false);
          setSelectedQuoteForView(null);
        }}
        title="Agent Details"
        description={
          selectedQuoteForView
            ? `${selectedQuoteForView.provider?.name || "Provider"} - ${quoteRequest.portOfLoading} → ${quoteRequest.portOfDischarge}`
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
              setShowViewAgentModal(false);
              setSelectedQuoteForView(null);
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
