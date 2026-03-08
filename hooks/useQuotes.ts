'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  QuoteStatus,
  QuoteFilters,
  QuoteRequestFilters,
  QuoteResponse,
  QuoteRequestResponse,
  QuoteRequestWithQuotes,
  CreateQuoteRequestPayload,
  CreateQuoteRequestResponse,
  PriceQuotePayload,
} from '@/src/lib/types/quote.types';
import type { PaginatedResponse, ApiResponse } from '@/src/lib/types/api.types';

// Extended response type with status counts
interface QuotesResponseWithCounts extends PaginatedResponse<QuoteResponse> {
  statusCounts?: Record<string, number>;
  totalCount?: number;
}

// Hook for listing quotes
export function useQuotes(initialFilters?: QuoteFilters) {
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<QuoteFilters>(initialFilters || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/quotes?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }

      const data: QuotesResponseWithCounts = await response.json();

      if (data.success) {
        setQuotes(data.data);
        setPagination(data.pagination);
        setStatusCounts(data.statusCounts || {});
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quotes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const updateFilters = useCallback((newFilters: Partial<QuoteFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    quotes,
    pagination,
    statusCounts,
    totalCount,
    filters,
    isLoading,
    error,
    updateFilters,
    setPage,
    refresh: fetchQuotes,
  };
}

// Hook for listing quote requests (client)
export function useQuoteRequests(initialFilters?: QuoteRequestFilters) {
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<QuoteRequestFilters>(initialFilters || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/quote-requests?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quote requests');
      }

      const data: PaginatedResponse<QuoteRequestResponse> = await response.json();

      if (data.success) {
        setQuoteRequests(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quote requests';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQuoteRequests();
  }, [fetchQuoteRequests]);

  const updateFilters = useCallback((newFilters: Partial<QuoteRequestFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    quoteRequests,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    setPage,
    refresh: fetchQuoteRequests,
  };
}

// Hook for single quote request with quotes (client detail view)
export function useQuoteRequest(id: string | null) {
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequestWithQuotes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteRequest = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quote-requests/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Quote request not found');
        }
        throw new Error('Failed to fetch quote request');
      }

      const data: ApiResponse<QuoteRequestWithQuotes> = await response.json();

      if (data.success && data.data) {
        setQuoteRequest(data.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quote request';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuoteRequest();
  }, [fetchQuoteRequest]);

  return {
    quoteRequest,
    isLoading,
    error,
    refresh: fetchQuoteRequest,
  };
}

// Hook for single quote (provider view)
export function useQuote(id: string | null) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Quote not found');
        }
        throw new Error('Failed to fetch quote');
      }

      const data: ApiResponse<QuoteResponse> = await response.json();

      if (data.success && data.data) {
        setQuote(data.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quote';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    refresh: fetchQuote,
  };
}

// Hook for quote mutations
export function useQuoteMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create quote request (client)
  const createQuoteRequest = useCallback(async (
    payload: CreateQuoteRequestPayload
  ): Promise<CreateQuoteRequestResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data: ApiResponse<CreateQuoteRequestResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quote request');
      }

      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create quote request';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Price quote (provider)
  const priceQuote = useCallback(async (
    quoteId: string,
    payload: PriceQuotePayload
  ): Promise<QuoteResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${quoteId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data: ApiResponse<QuoteResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to price quote');
      }

      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to price quote';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update quote status (client or provider)
  const updateQuoteStatus = useCallback(async (
    quoteId: string,
    status: QuoteStatus
  ): Promise<QuoteResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      const data: ApiResponse<QuoteResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update quote status');
      }

      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update quote status';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel quote request (client)
  const cancelQuoteRequest = useCallback(async (
    quoteRequestId: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quote-requests/${quoteRequestId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data: ApiResponse<null> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel quote request');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel quote request';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request negotiation (client)
  const requestNegotiation = useCallback(async (
    quoteId: string,
    message?: string
  ): Promise<QuoteResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${quoteId}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      const data: ApiResponse<QuoteResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request negotiation');
      }

      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request negotiation';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createQuoteRequest,
    priceQuote,
    updateQuoteStatus,
    cancelQuoteRequest,
    requestNegotiation,
  };
}
