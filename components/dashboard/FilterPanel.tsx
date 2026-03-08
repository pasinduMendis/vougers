'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/src/lib/utils';
import type { QuoteStatus, QuoteFilters } from '@/src/lib/types/quote.types';
import { QUOTE_STATUSES } from '@/src/constants/statuses';

interface FilterPanelProps {
  filters: QuoteFilters;
  onFilterChange: (filters: Partial<QuoteFilters>) => void;
  showStatusFilter?: boolean;
  className?: string;
}

const STATUS_OPTIONS: { value: QuoteStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: QUOTE_STATUSES.PENDING, label: 'Pending' },
  { value: QUOTE_STATUSES.PRICED, label: 'Priced' },
  { value: QUOTE_STATUSES.APPROVED, label: 'Approved' },
  { value: QUOTE_STATUSES.REJECTED, label: 'Rejected' },
  { value: QUOTE_STATUSES.COMPLETED, label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'status', label: 'Status' },
];

export function FilterPanel({
  filters,
  onFilterChange,
  showStatusFilter = true,
  className,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // Debounce search
    const timeout = setTimeout(() => {
      onFilterChange({ search: value || undefined });
    }, 300);

    return () => clearTimeout(timeout);
  };

  // Handle status change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as QuoteStatus | '';
    onFilterChange({ status: value || undefined });
  };

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ sortBy: e.target.value });
  };

  // Handle sort order toggle
  const handleSortOrderToggle = () => {
    onFilterChange({
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchValue('');
    onFilterChange({
      status: undefined,
      search: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    filters.status ||
    filters.search ||
    filters.sortBy !== 'createdAt' ||
    filters.sortOrder !== 'desc'
  );

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 !p-[16px]', className)}>
      {/* Main Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 md:items-center">
        {/* Search */}
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by port, commodity..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        {/* Status Filter (Desktop) */}
        {showStatusFilter && (
          <div className="hidden sm:block">
            <select
              value={filters.status || ''}
              onChange={handleStatusChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary sm:text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Expand/Collapse Button (Mobile) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="sm:hidden"
        >
          {isExpanded ? 'Less Filters' : 'More Filters'}
        </Button>

        {/* Sort Controls (Desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <select
            value={filters.sortBy || 'createdAt'}
            onChange={handleSortChange}
            className="block rounded-lg border border-gray-300 !px-[8px] !h-[48px] py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary sm:text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSortOrderToggle}
            title={filters.sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
          >
            {filters.sortOrder === 'asc' ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="hidden sm:block"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters (Mobile) */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 sm:hidden">
          {/* Status Filter */}
          {showStatusFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={handleStatusChange}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary sm:text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex gap-2 !my-[8px]">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy || 'createdAt'}
                onChange={handleSortChange}
                className="block w-full rounded-lg border border-gray-300 !h-[48px] !px-[8px] py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary sm:text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={handleSortOrderToggle}
                className="w-full"
              >
                {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </Button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={handleClearFilters}
            >
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
