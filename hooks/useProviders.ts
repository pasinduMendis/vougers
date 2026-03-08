'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from '@/src/lib/types/api.types';

// Provider type for client selection
export interface Provider {
  _id: string;
  name: string;
  slug: string;
}

interface UseProvidersReturn {
  providers: Provider[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch active providers for quote request form
 */
export function useProviders(): UseProvidersReturn {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/providers', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      const data: ApiResponse<Provider[]> = await response.json();

      if (data.success && data.data) {
        setProviders(data.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch providers';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    providers,
    isLoading,
    error,
    refresh: fetchProviders,
  };
}
