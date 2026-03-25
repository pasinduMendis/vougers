'use client';

import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';
import { QuoteTable } from './QuoteTable';
import type { QuoteTableItem } from './QuoteTable';
import { QuoteCard } from './QuoteCard';

export type { QuoteTableItem };

interface QuoteListProps {
  quotes: QuoteTableItem[];
  userType: 'client' | 'provider';
  onPrice?: (quote: QuoteTableItem) => void;
  onApprove?: (quote: QuoteTableItem) => void;
  onReject?: (quote: QuoteTableItem) => void;
  onComplete?: (quote: QuoteTableItem) => void;
  onRejectNegotiation?: (quote: QuoteTableItem) => void;
  onAddAgentDetails?: (quote: QuoteTableItem) => void;
  onViewSupplierDetails?: (quote: QuoteTableItem) => void;
  onViewAgentDetails?: (quote: QuoteTableItem) => void;
  onQuoteClick?: (quote: QuoteTableItem) => void;
  isLoading?: boolean;
}

export function QuoteList({
  quotes,
  userType,
  onPrice,
  onApprove,
  onReject,
  onComplete,
  onRejectNegotiation,
  onAddAgentDetails,
  onViewSupplierDetails,
  onViewAgentDetails,
  onQuoteClick,
  isLoading = false,
}: QuoteListProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes</h3>
        <p className="mt-1 text-sm text-gray-600">
          {userType === 'client'
            ? 'Create a quote request to get started.'
            : 'No quote requests assigned to your organization yet.'}
        </p>
      </div>
    );
  }

  // Mobile: Card layout
  if (isMobile) {
    return (
      <div className="space-y-4">
        {quotes.map((quote) => (
          <QuoteCard
            key={quote._id}
            quote={quote}
            userType={userType}
            onPrice={onPrice}
            onApprove={onApprove}
            onReject={onReject}
            onComplete={onComplete}
            onRejectNegotiation={onRejectNegotiation}
            onAddAgentDetails={onAddAgentDetails}
            onViewSupplierDetails={onViewSupplierDetails}
            onViewAgentDetails={onViewAgentDetails}
            onClick={onQuoteClick}
          />
        ))}
      </div>
    );
  }

  // Tablet/Desktop: Table layout (compact on tablet)
  return (
    <QuoteTable
      quotes={quotes}
      userType={userType}
      compact={isTablet}
      onPrice={onPrice}
      onApprove={onApprove}
      onReject={onReject}
      onComplete={onComplete}
      onRejectNegotiation={onRejectNegotiation}
      onAddAgentDetails={onAddAgentDetails}
      onViewSupplierDetails={onViewSupplierDetails}
      onViewAgentDetails={onViewAgentDetails}
      onQuoteClick={onQuoteClick}
    />
  );
}
