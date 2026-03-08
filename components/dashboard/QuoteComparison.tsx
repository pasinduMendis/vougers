"use client";

import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
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
}

export function QuoteComparison({
  quoteRequest,
  onApprove,
  onReject,
  onNegotiate,
}: QuoteComparisonProps) {
  const { quotes } = quoteRequest;

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
  const sortedQuotes = useMemo(() => {
    const statusOrder: Record<string, number> = {
      approved: 1,
      priced: 2,
      pending: 3,
      rejected: 4,
      completed: 5,
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

            return (
              <Card
                key={quote._id}
                variant="bordered"
                padding="none"
                className={cn(
                  "relative overflow-hidden",
                  isBestPrice && "ring-2 ring-green-500",
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
                    <StatusBadge status={quote.status} size="sm" />
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
                {quote.status === "priced" && (
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

                {quote.status === "approved" && (
                  <CardFooter className="px-4 py-3 bg-green-50">
                    <p className="text-sm text-green-700 text-center w-full">
                      You approved this quote
                    </p>
                  </CardFooter>
                )}

                {quote.status === "rejected" && (
                  <CardFooter className="px-4 py-3 bg-red-50">
                    <p className="text-sm text-red-700 text-center w-full">
                      You rejected this quote
                    </p>
                  </CardFooter>
                )}

                {quote.status === "pending" && (
                  <CardFooter className="px-4 py-3 bg-yellow-50">
                    <p className="text-sm text-yellow-700 text-center w-full">
                      Awaiting provider&apos;s price
                    </p>
                  </CardFooter>
                )}

                {quote.status === "completed" && (
                  <CardFooter className="px-4 py-3 bg-purple-50">
                    <p className="text-sm text-purple-700 text-center w-full">
                      Shipment completed
                    </p>
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
            <div>
              <p className="text-2xl font-bold text-green-600">
                {quotes.filter((q) => q.status === "approved").length}
              </p>
              <p className="text-sm text-gray-700">Approved</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
