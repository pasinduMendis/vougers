'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse, PaginatedResponse } from '@/src/lib/types/api.types';

export interface Client {
  _id: string;
  name: string;
  email: string;
  companyName: string;
  companyAddress: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PriceHistoryEntry {
  freightCost: number;
  transitDays: number;
  pricedAt: string;
  pricedBy: string;
}

export interface ClientQuote {
  _id: string;
  status: string;
  freightCost?: number;
  transitDays?: number;
  pricedAt?: string;
  negotiationRequested?: boolean;
  negotiationMessage?: string;
  negotiationRequestedAt?: string;
  priceHistory?: PriceHistoryEntry[];
  supplierDetails?: string;
  supplierDetailsAddedAt?: string;
  agentDetails?: string;
  agentDetailsAddedAt?: string;
  agentDetailsAddedBy?: string;
  createdAt: string;
  updatedAt: string;
  quoteRequest: {
    _id: string;
    portOfLoading: string;
    portOfDischarge: string;
    commodity?: string;
    volume?: string;
    pickupAddress?: string;
    createdAt: string;
  };
}

export interface ClientWithQuotes {
  client: Client;
  quotes: ClientQuote[];
  statusCounts: Record<string, number>;
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Hook for listing clients
export function useClients(initialFilters?: ClientFilters) {
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<ClientFilters>(initialFilters || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/clients?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data: PaginatedResponse<Client> = await response.json();

      if (data.success) {
        setClients(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch clients';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const updateFilters = useCallback((newFilters: Partial<ClientFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    clients,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    setPage,
    refresh: fetchClients,
  };
}

// Hook for single client with quotes
export function useClient(id: string | null, quoteFilters?: { status?: string; page?: number; limit?: number }) {
  const [data, setData] = useState<ClientWithQuotes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (quoteFilters?.status) params.append('status', quoteFilters.status);
      if (quoteFilters?.page) params.append('page', quoteFilters.page.toString());
      if (quoteFilters?.limit) params.append('limit', quoteFilters.limit.toString());

      const response = await fetch(`/api/clients/${id}?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Client not found');
        }
        throw new Error('Failed to fetch client');
      }

      const result: ApiResponse<ClientWithQuotes> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, quoteFilters?.status, quoteFilters?.page, quoteFilters?.limit]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchClient,
  };
}
