'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { useClients } from '@/hooks/useClients';

export default function ProviderClientsPage() {
  const [searchInput, setSearchInput] = useState('');
  const { clients, pagination, isLoading, error, updateFilters, setPage } = useClients();

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="mt-1 text-sm text-gray-600">
          View all clients and their quote history
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Search
        </button>
      </form>

      {/* Error State */}
      {error && (
        <Card variant="bordered" padding="md" className="bg-red-50 border-red-200">
          <CardContent className="text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-slate-200 rounded" />
                  <div className="h-4 w-60 bg-slate-100 rounded" />
                </div>
                <div className="h-8 w-24 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clients List */}
      {!isLoading && clients.length === 0 && (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-lg font-medium">No clients found</p>
            <p className="text-sm mt-1">
              Clients will appear here when they have quotes assigned to your organization
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && clients.length > 0 && (
        <div className="space-y-4">
          {clients.map((client) => (
            <Link
              key={client._id}
              href={`/provider/clients/${client._id}`}
              className="block"
            >
              <Card
                variant="bordered"
                padding="none"
                className="hover:shadow-md hover:border-indigo-200 transition-all duration-200"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Client Info */}
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {client.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {client.companyName}
                          </p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
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
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="h-5 w-5 text-gray-500"
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
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
