'use client';

import { useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTabs, generateStatusTabs } from '@/components/dashboard/StatusTabs';
import { useClient, ClientQuote } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { QuoteStatus } from '@/src/lib/types/quote.types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { canEdit } = useAuth();
  const isMobile = useIsMobile();

  // Status filter
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  // Fetch client data with filters
  const { data, isLoading, error, refresh } = useClient(id, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    limit: 10,
  });

  // Quote detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<ClientQuote | null>(null);

  // Price modal state
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceForm, setPriceForm] = useState({ freightCost: '', transitDays: '' });
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Generate status tabs
  const statusTabs = useMemo(() => {
    return generateStatusTabs(data?.statusCounts || {}, data?.totalCount || 0);
  }, [data?.statusCounts, data?.totalCount]);

  // Handle status tab change
  const handleStatusChange = (status: QuoteStatus | 'all') => {
    setStatusFilter(status);
    setPage(1);
  };

  // Handle view quote details
  const handleViewQuote = (quote: ClientQuote) => {
    setSelectedQuote(quote);
    setDetailModalOpen(true);
  };

  // Handle price quote (from detail modal)
  const handlePrice = () => {
    setDetailModalOpen(false);
    setPriceForm({ freightCost: '', transitDays: '' });
    setPriceError(null);
    setPriceModalOpen(true);
  };

  // Handle price quote directly
  const handlePriceDirect = (quote: ClientQuote) => {
    setSelectedQuote(quote);
    setPriceForm({ freightCost: '', transitDays: '' });
    setPriceError(null);
    setPriceModalOpen(true);
  };

  // Submit price
  const handleSubmitPrice = async () => {
    if (!selectedQuote) return;

    const freightCost = parseFloat(priceForm.freightCost);
    const transitDays = parseInt(priceForm.transitDays, 10);

    if (isNaN(freightCost) || freightCost <= 0) {
      setPriceError('Please enter a valid freight cost');
      return;
    }

    if (isNaN(transitDays) || transitDays <= 0) {
      setPriceError('Please enter valid transit days');
      return;
    }

    try {
      setIsMutating(true);
      const response = await fetch(`/api/quotes/${selectedQuote._id}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ freightCost, transitDays }),
      });

      if (!response.ok) {
        throw new Error('Failed to price quote');
      }

      setPriceModalOpen(false);
      setSelectedQuote(null);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to price quote';
      setPriceError(message);
    } finally {
      setIsMutating(false);
    }
  };

  // Handle complete
  const handleComplete = async (quote: ClientQuote) => {
    try {
      setIsMutating(true);
      await fetch(`/api/quotes/${quote._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });
      setDetailModalOpen(false);
      refresh();
    } catch (err) {
      console.error('Failed to complete quote:', err);
    } finally {
      setIsMutating(false);
    }
  };

  // Handle reject quote
  const handleReject = async (quote: ClientQuote) => {
    if (!confirm('Are you sure you want to reject this quote?')) return;

    try {
      setIsMutating(true);
      await fetch(`/api/quotes/${quote._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected' }),
      });
      setDetailModalOpen(false);
      refresh();
    } catch (err) {
      console.error('Failed to reject quote:', err);
    } finally {
      setIsMutating(false);
    }
  };

  // Handle revise price (for already priced quotes)
  const handleRevisePrice = (quote: ClientQuote) => {
    setDetailModalOpen(false);
    setPriceForm({
      freightCost: quote.freightCost?.toString() || '',
      transitDays: quote.transitDays?.toString() || '',
    });
    setPriceError(null);
    setPriceModalOpen(true);
  };

  // Handle close detail modal
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedQuote(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse"
            >
              <div className="h-5 w-full bg-slate-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card variant="bordered" padding="lg" className="bg-red-50 border-red-200">
          <CardContent className="text-center text-red-700">
            <p className="text-lg font-medium">{error || 'Client not found'}</p>
            <Link
              href="/provider/clients"
              className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
            >
              Back to Clients
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, quotes, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/provider/clients"
        className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Clients
      </Link>

      {/* Client Header */}
      <Card variant="bordered" padding="none">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-2xl">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-gray-600">{client.companyName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {client.email}
                </span>
                <span className="flex items-center gap-1">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {client.companyAddress}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quotes ({pagination.total})
        </h2>

        {/* Status Tabs */}
        <StatusTabs
          tabs={statusTabs}
          activeTab={statusFilter}
          onChange={handleStatusChange}
        />
      </div>

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <Card variant="bordered" padding="lg">
          <CardContent className="text-center text-gray-600">
            <svg
              className="mx-auto h-12 w-12 text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium">No quotes found</p>
            <p className="text-sm mt-1">
              {statusFilter === 'all'
                ? 'This client has no quotes with your organization yet'
                : `No ${statusFilter} quotes found`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card
              key={quote._id}
              variant="bordered"
              padding="none"
              className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
              onClick={() => handleViewQuote(quote)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Quote Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={quote.status as QuoteStatus} />
                      <span className="text-sm text-gray-600">
                        {formatDate(quote.createdAt)}
                      </span>
                      {/* Negotiation Label */}
                      {quote.negotiationRequested && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Negotiation
                        </span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-gray-900">
                      <span className="font-medium">
                        {quote.quoteRequest.portOfLoading}
                      </span>
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
                      <span className="font-medium">
                        {quote.quoteRequest.portOfDischarge}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                      {quote.quoteRequest.commodity && (
                        <span>Commodity: {quote.quoteRequest.commodity}</span>
                      )}
                      {quote.quoteRequest.volume && (
                        <span>Volume: {quote.quoteRequest.volume}</span>
                      )}
                    </div>

                    {/* Price Info */}
                    {quote.freightCost && (
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-lg font-semibold text-indigo-600">
                          {formatCurrency(quote.freightCost)}
                        </span>
                        {quote.transitDays && (
                          <span className="text-sm text-gray-600">
                            {quote.transitDays} days transit
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {canEdit && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {quote.status === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePriceDirect(quote)}
                        >
                          Price
                        </Button>
                      )}
                      {quote.status === 'priced' && quote.negotiationRequested && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            handleRevisePrice(quote);
                          }}
                        >
                          Revise
                        </Button>
                      )}
                      {quote.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleComplete(quote)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Quote Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        title="Quote Details"
        size="lg"
      >
        {selectedQuote && (
          <div className="space-y-6">
            {/* Status and Date */}
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedQuote.status as QuoteStatus} />
              <span className="text-sm text-gray-500">
                Created: {formatDate(selectedQuote.createdAt)}
              </span>
            </div>

            {/* Negotiation Request Alert */}
            {selectedQuote.negotiationRequested && (
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">
                      Client Requested Negotiation
                    </h4>
                    {selectedQuote.negotiationMessage && (
                      <p className="text-sm text-amber-700 mt-1">
                        &quot;{selectedQuote.negotiationMessage}&quot;
                      </p>
                    )}
                    {selectedQuote.negotiationRequestedAt && (
                      <p className="text-xs text-amber-600 mt-2">
                        Requested on {formatDate(selectedQuote.negotiationRequestedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Route Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Route</h4>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Port of Loading</p>
                  <p className="font-semibold text-gray-900">
                    {selectedQuote.quoteRequest.portOfLoading}
                  </p>
                </div>
                <div className="flex-1 mx-4 flex items-center justify-center">
                  <div className="h-px bg-indigo-300 flex-1" />
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
                  <div className="h-px bg-indigo-300 flex-1" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Port of Discharge</p>
                  <p className="font-semibold text-gray-900">
                    {selectedQuote.quoteRequest.portOfDischarge}
                  </p>
                </div>
              </div>
            </div>

            {/* Cargo Details */}
            <div className="grid grid-cols-2 gap-4">
              {selectedQuote.quoteRequest.commodity && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Commodity</p>
                  <p className="font-medium text-gray-900">
                    {selectedQuote.quoteRequest.commodity}
                  </p>
                </div>
              )}
              {selectedQuote.quoteRequest.volume && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Volume</p>
                  <p className="font-medium text-gray-900">
                    {selectedQuote.quoteRequest.volume}
                  </p>
                </div>
              )}
              {selectedQuote.quoteRequest.pickupAddress && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Pickup Address</p>
                  <p className="font-medium text-gray-900">
                    {selectedQuote.quoteRequest.pickupAddress}
                  </p>
                </div>
              )}
            </div>

            {/* Pricing Information (if available) */}
            {(selectedQuote.freightCost || selectedQuote.transitDays) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-green-800">
                    Current Pricing
                  </h4>
                  {selectedQuote.pricedAt && (
                    <span className="text-xs text-green-600">
                      Priced on {formatDate(selectedQuote.pricedAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  {selectedQuote.freightCost && (
                    <div>
                      <p className="text-xs text-green-600 mb-1">Freight Cost</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(selectedQuote.freightCost)}
                      </p>
                    </div>
                  )}
                  {selectedQuote.transitDays && (
                    <div>
                      <p className="text-xs text-green-600 mb-1">Transit Time</p>
                      <p className="text-2xl font-bold text-green-700">
                        {selectedQuote.transitDays}{' '}
                        <span className="text-sm font-normal">days</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price History */}
            {selectedQuote.priceHistory && selectedQuote.priceHistory.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Price History ({selectedQuote.priceHistory.length} revision{selectedQuote.priceHistory.length > 1 ? 's' : ''})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedQuote.priceHistory.map((entry, index) => (
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

            {/* Request Date */}
            <div className="text-sm text-gray-500 pt-2 border-t border-gray-100">
              Quote Request Created:{' '}
              {formatDate(selectedQuote.quoteRequest.createdAt)}
            </div>
          </div>
        )}

        <ModalFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={handleCloseDetailModal}>
            Close
          </Button>
          {canEdit && selectedQuote && (
            <>
              {/* Pending: Can Price or Reject */}
              {selectedQuote.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleReject(selectedQuote)}
                    disabled={isMutating}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handlePrice}
                  >
                    Price Quote
                  </Button>
                </>
              )}

              {/* Priced: Can Revise Price or Reject */}
              {selectedQuote.status === 'priced' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleReject(selectedQuote)}
                    disabled={isMutating}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleRevisePrice(selectedQuote)}
                  >
                    Revise Price
                  </Button>
                </>
              )}

              {/* Approved: Can Complete */}
              {selectedQuote.status === 'approved' && (
                <Button
                  variant="primary"
                  onClick={() => handleComplete(selectedQuote)}
                  isLoading={isMutating}
                  disabled={isMutating}
                >
                  Mark Complete
                </Button>
              )}
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Price Modal */}
      <Modal
        isOpen={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title={selectedQuote?.status === 'priced' ? 'Revise Price' : 'Price Quote'}
        description={
          selectedQuote
            ? `${selectedQuote.quoteRequest?.portOfLoading} → ${selectedQuote.quoteRequest?.portOfDischarge}`
            : ''
        }
        size="sm"
      >
        <div className="space-y-4">
          {/* Negotiation Request Message */}
          {selectedQuote?.negotiationRequested && selectedQuote?.status === 'priced' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
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
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Client Revision Request
                  </p>
                  {selectedQuote.negotiationMessage ? (
                    <p className="text-sm text-amber-700 mt-1">
                      &quot;{selectedQuote.negotiationMessage}&quot;
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 mt-1 italic">
                      No message provided
                    </p>
                  )}
                  {selectedQuote.negotiationRequestedAt && (
                    <p className="text-xs text-amber-600 mt-2">
                      Requested on {formatDate(selectedQuote.negotiationRequestedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {priceError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {priceError}
            </div>
          )}

          <Input
            type="number"
            label="Freight Cost (USD)"
            placeholder="0.00"
            value={priceForm.freightCost}
            onChange={(e) =>
              setPriceForm((prev) => ({ ...prev, freightCost: e.target.value }))
            }
            disabled={isMutating}
          />

          <Input
            type="number"
            label="Transit Days"
            placeholder="0"
            value={priceForm.transitDays}
            onChange={(e) =>
              setPriceForm((prev) => ({ ...prev, transitDays: e.target.value }))
            }
            disabled={isMutating}
          />
        </div>

        <ModalFooter>
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
          >
            Submit Price
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
