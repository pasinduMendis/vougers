"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatRelativeTime } from "@/src/lib/utils";
import type { QuoteTableItem } from "./QuoteTable";

interface QuoteCardProps {
  quote: QuoteTableItem;
  userType: "client" | "provider";
  onPrice?: (quote: QuoteTableItem) => void;
  onApprove?: (quote: QuoteTableItem) => void;
  onReject?: (quote: QuoteTableItem) => void;
  onComplete?: (quote: QuoteTableItem) => void;
  onClick?: (quote: QuoteTableItem) => void;
}

export function QuoteCard({
  quote,
  userType,
  onPrice,
  onApprove,
  onReject,
  onComplete,
  onClick,
}: QuoteCardProps) {
  // Client view card
  const renderClientCard = () => (
    <Card
      variant="bordered"
      padding="none"
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(quote)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              {quote.provider?.name || "Unknown Provider"}
            </h3>
            <p className="text-sm text-gray-600">
              {formatRelativeTime(quote.createdAt)}
            </p>
          </div>
          <StatusBadge status={quote.status} size="sm" />
        </div>

        {/* Route */}
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium">
              {quote.quoteRequest?.portOfLoading}
            </span>
            {" → "}
            <span className="font-medium">
              {quote.quoteRequest?.portOfDischarge}
            </span>
          </p>
        </div>

        {/* Price & Transit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase">Price</p>
            <p className="font-semibold text-lg text-gray-600">
              {quote.freightCost ? formatCurrency(quote.freightCost) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase">Transit</p>
            <p className="font-semibold text-lg text-gray-600">
              {quote.transitDays ? `${quote.transitDays} days` : "-"}
            </p>
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      {quote.status === "priced" && (
        <CardFooter
          className="px-4 py-3 bg-gray-50 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
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
        </CardFooter>
      )}
    </Card>
  );

  // Provider view card
  const renderProviderCard = () => (
    <Card
      variant="bordered"
      padding="none"
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(quote)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              {quote.client?.name || "Unknown Client"}
            </h3>
            <p className="text-sm text-gray-600">{quote.client?.companyName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={quote.status} size="sm" />
            {quote.negotiationRequested && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Negotiation
              </span>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium">
              {quote.quoteRequest?.portOfLoading}
            </span>
            {" → "}
            <span className="font-medium">
              {quote.quoteRequest?.portOfDischarge}
            </span>
          </p>
          {quote.quoteRequest?.commodity && (
            <p className="text-sm text-gray-600 !mt-[4px]">
              {quote.quoteRequest.commodity}
            </p>
          )}
        </div>

        {/* Extra Fields */}
        {quote.quoteRequest?.extraFields &&
          Object.keys(quote.quoteRequest.extraFields).length > 0 && (
            <div className="mb-3 flex flex-wrap !my-[4px]">
              {Object.entries(quote.quoteRequest.extraFields)
                .slice(0, 3)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
                  >
                    <span className="font-medium text-slate-700">{key}:</span>
                    <span className="ml-1">{String(value)}</span>
                  </span>
                ))}
              {Object.keys(quote.quoteRequest.extraFields).length > 3 && (
                <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                  +{Object.keys(quote.quoteRequest.extraFields).length - 3} more
                </span>
              )}
            </div>
          )}

        {/* Price (if priced) */}
        {quote.freightCost && (
          <div className="grid grid-cols-2 gap-4 !mt-[8px]">
            <div>
              <p className="text-xs text-gray-600 uppercase">Price</p>
              <p className="font-semibold text-lg text-gray-600">
                {formatCurrency(quote.freightCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Transit</p>
              <p className="font-semibold text-lg text-gray-600">
                {quote.transitDays ? `${quote.transitDays} days` : "-"}
              </p>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-600 mt-3">
          {formatRelativeTime(quote.createdAt)}
        </p>
      </CardContent>

      {/* Actions */}
      {quote.status === "pending" && (
        <CardFooter
          className="px-4 py-3 bg-gray-50 flex gap-2 !my-[8px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="primary"
            fullWidth
            onClick={() => onPrice?.(quote)}
          >
            Price Quote
          </Button>
          <Button
            size="sm"
            variant="outline"
            fullWidth
            onClick={() => onReject?.(quote)}
          >
            Reject
          </Button>
        </CardFooter>
      )}

      {quote.status === "priced" && quote.negotiationRequested && (
        <CardFooter
          className="px-4 py-3 bg-amber-50 flex flex-col !my-[8px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="primary"
            fullWidth
            onClick={() => onPrice?.(quote)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Revise Price
          </Button>
          {quote.negotiationMessage && (
            <p
              className="text-xs text-gray-600 text-center truncate !my-[4px]"
              title={quote.negotiationMessage}
            >
              <strong>request: {quote.negotiationMessage}</strong>
            </p>
          )}
        </CardFooter>
      )}

      {quote.status === "priced" && !quote.negotiationRequested && (
        <CardFooter
          className="px-4 py-3 bg-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="outline"
            fullWidth
            onClick={() => onReject?.(quote)}
          >
            Reject
          </Button>
        </CardFooter>
      )}

      {quote.status === "approved" && (
        <CardFooter
          className="px-4 py-3 bg-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="primary"
            fullWidth
            onClick={() => onComplete?.(quote)}
          >
            Mark Complete
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  return userType === "client" ? renderClientCard() : renderProviderCard();
}
