"use client";

import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import type { QuoteResponse } from "@/src/lib/types/quote.types";

// Extended quote type for table display
export interface QuoteTableItem extends QuoteResponse {
  quoteRequest?: {
    portOfLoading: string;
    portOfDischarge: string;
    commodity?: string;
    volume?: string;
    pickupAddress?: string;
    extraFields?: Record<string, unknown>;
    createdAt?: string;
  };
  client?: {
    _id?: string;
    name: string;
    companyName?: string;
    email?: string;
  };
}

interface QuoteTableProps {
  quotes: QuoteTableItem[];
  userType: "client" | "provider";
  compact?: boolean;
  onPrice?: (quote: QuoteTableItem) => void;
  onApprove?: (quote: QuoteTableItem) => void;
  onReject?: (quote: QuoteTableItem) => void;
  onComplete?: (quote: QuoteTableItem) => void;
  onRejectNegotiation?: (quote: QuoteTableItem) => void;
  onAddAgentDetails?: (quote: QuoteTableItem) => void;
  onViewSupplierDetails?: (quote: QuoteTableItem) => void;
  onViewAgentDetails?: (quote: QuoteTableItem) => void;
  onQuoteClick?: (quote: QuoteTableItem) => void;
}

export function QuoteTable({
  quotes,
  userType,
  compact = false,
  onPrice,
  onApprove,
  onReject,
  onComplete,
  onRejectNegotiation,
  onAddAgentDetails,
  onViewSupplierDetails,
  onViewAgentDetails,
  onQuoteClick,
}: QuoteTableProps) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p>No quotes found</p>
      </div>
    );
  }

  // Client view columns
  const renderClientTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          {!compact && <TableHead>Route</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Transit</TableHead>
          {!compact && <TableHead>Date</TableHead>}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => (
          <TableRow key={quote._id}>
            <TableCell className="font-medium">
              {quote.provider?.name || "Unknown Provider"}
            </TableCell>
            {!compact && (
              <TableCell>
                <span className="text-sm">
                  {quote.quoteRequest?.portOfLoading} →{" "}
                  {quote.quoteRequest?.portOfDischarge}
                </span>
              </TableCell>
            )}
            <TableCell>
              <StatusBadge status={quote.status} size={compact ? "sm" : "md"} />
            </TableCell>
            <TableCell>
              {quote.freightCost ? formatCurrency(quote.freightCost) : "-"}
            </TableCell>
            <TableCell>
              {quote.transitDays ? `${quote.transitDays} days` : "-"}
            </TableCell>
            {!compact && (
              <TableCell className="text-sm text-gray-600">
                {formatDate(quote.createdAt)}
              </TableCell>
            )}
            <TableCell>
              <div className="flex gap-2">
                {quote.status === "priced" && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onApprove?.(quote)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject?.(quote)}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {quote.status === "pending" && (
                  <span className="text-sm text-gray-600">Awaiting price</span>
                )}
                {(quote.status === "approved" ||
                  quote.status === "rejected") && (
                  <span className="text-sm text-gray-600">No actions</span>
                )}
                {quote.status === "completed" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-purple-600 font-medium">Completed</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewSupplierDetails?.(quote)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        Supplier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewAgentDetails?.(quote)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        Agent
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Provider view columns
  const renderProviderTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {!compact && <TableHead>Client</TableHead>}
          <TableHead>Route</TableHead>
          {!compact && <TableHead>Commodity</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Price</TableHead>
          {!compact && <TableHead>Date</TableHead>}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => (
          <TableRow key={quote._id}>
            {!compact && (
              <TableCell>
                <div>
                  <p className="font-semibold text-gray-900">
                    {quote.client?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {quote.client?.companyName}
                  </p>
                </div>
              </TableCell>
            )}
            <TableCell>
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {quote.quoteRequest?.portOfLoading} →{" "}
                  {quote.quoteRequest?.portOfDischarge}
                </span>
                {/* Extra Fields Badges */}
                {quote.quoteRequest?.extraFields &&
                  Object.keys(quote.quoteRequest.extraFields).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(quote.quoteRequest.extraFields)
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-700"
                            title={`${key}: ${String(value)}`}
                          >
                            {key}:{" "}
                            {String(value).length > 10
                              ? `${String(value).slice(0, 10)}...`
                              : String(value)}
                          </span>
                        ))}
                      {Object.keys(quote.quoteRequest.extraFields).length >
                        2 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                          +
                          {Object.keys(quote.quoteRequest.extraFields).length -
                            2}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </TableCell>
            {!compact && (
              <TableCell className="text-sm text-gray-800">
                {quote.quoteRequest?.commodity || "-"}
              </TableCell>
            )}
            <TableCell>
              <div className="flex flex-col gap-1">
                <StatusBadge
                  status={quote.status}
                  size={compact ? "sm" : "md"}
                />
                {quote.negotiationRequested &&
                  quote.status !== "lost" &&
                  quote.status !== "missed" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Negotiation
                    </span>
                  )}
              </div>
            </TableCell>
            <TableCell className="font-medium text-gray-900">
              <div>
                {quote.freightCost ? formatCurrency(quote.freightCost) : "-"}
                {quote.priceHistory && quote.priceHistory.length > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {quote.priceHistory.length} revision
                    {quote.priceHistory.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </TableCell>
            {!compact && (
              <TableCell className="text-sm text-gray-700">
                {formatDate(quote.createdAt)}
              </TableCell>
            )}
            <TableCell>
              <div className="flex flex-col gap-2">
                {/* View button for all quotes */}
                {onQuoteClick && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onQuoteClick(quote)}
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  >
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View
                  </Button>
                )}
                {quote.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onPrice?.(quote)}
                    >
                      Price
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject?.(quote)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                {quote.status === "priced" && quote.negotiationRequested && (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onPrice?.(quote)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        Revise Price
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRejectNegotiation?.(quote)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                    {quote.negotiationMessage && (
                      <p
                        className="text-xs text-gray-600 text-center truncate !my-[4px]"
                        title={quote.negotiationMessage}
                      >
                        <strong>request: {quote.negotiationMessage}</strong>
                      </p>
                    )}
                  </div>
                )}
                {quote.status === "priced" && !quote.negotiationRequested && (
                  <span className="text-sm text-gray-500">
                    Waiting for client response
                  </span>
                )}
                {quote.status === "approved" && !quote.supplierDetails && (
                  <span className="text-sm text-amber-600">
                    Waiting for supplier details
                  </span>
                )}
                {quote.status === "approved" && quote.supplierDetails && (
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onAddAgentDetails?.(quote)}
                    >
                      Add Agent Details
                    </Button>
                    <span
                      className="text-xs text-green-600 cursor-help"
                      title={quote.supplierDetails}
                    >
                      Supplier details added
                    </span>
                  </div>
                )}
                {quote.status === "completed" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-purple-600 font-medium">Completed</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewSupplierDetails?.(quote)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        Supplier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewAgentDetails?.(quote)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        Agent
                      </Button>
                    </div>
                  </div>
                )}
                {(quote.status === "rejected" ||
                  quote.status === "lost" ||
                  quote.status === "missed") && (
                  <span className="text-sm text-gray-600">No actions</span>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return userType === "client" ? renderClientTable() : renderProviderTable();
}
