"use client";

import { useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/src/lib/utils";
import type { Provider } from "@/hooks/useProviders";

export interface ProviderSelectorProps {
  providers: Provider[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  selectAll: boolean;
  onSelectAllChange: (selectAll: boolean) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function ProviderSelector({
  providers,
  selectedIds,
  onChange,
  selectAll,
  onSelectAllChange,
  disabled = false,
  error,
  className,
}: ProviderSelectorProps) {
  // When selectAll changes, update selectedIds accordingly
  useEffect(() => {
    if (selectAll) {
      // Select all providers
      onChange(providers.map((p) => p._id));
    }
  }, [selectAll, providers, onChange]);

  // Handle individual provider selection
  const handleProviderChange = (providerId: string, checked: boolean) => {
    let newIds: string[];

    if (checked) {
      newIds = [...selectedIds, providerId];
    } else {
      newIds = selectedIds.filter((id) => id !== providerId);
    }

    onChange(newIds);

    // Update selectAll state
    if (newIds.length === providers.length) {
      onSelectAllChange(true);
    } else if (selectAll) {
      onSelectAllChange(false);
    }
  };

  // Handle select all change
  const handleSelectAllChange = (checked: boolean) => {
    onSelectAllChange(checked);
    if (checked) {
      onChange(providers.map((p) => p._id));
    } else {
      onChange([]);
    }
  };

  // Check if all are selected
  const allSelected = useMemo(() => {
    return providers.length > 0 && selectedIds.length === providers.length;
  }, [providers.length, selectedIds.length]);

  // Check if some but not all are selected (indeterminate)
  const isIndeterminate = useMemo(() => {
    return selectedIds.length > 0 && selectedIds.length < providers.length;
  }, [selectedIds.length, providers.length]);

  return (
    <div className={cn("w-full", className)}>
      <label className="block text-sm font-medium text-gray-700 !mb-[16px]">
        Select Service Providers
      </label>

      <div className="border border-gray-200 rounded-lg !p-[16px]">
        {/* Select All Checkbox */}
        <div className="border-b border-gray-200 !mb-[16px]">
          <Checkbox
            checked={allSelected}
            onChange={(e) => handleSelectAllChange(e.target.checked)}
            disabled={disabled || providers.length === 0}
            label="Select All"
            description="Send quote request to all providers"
            className="!p-[6px]"
          />
        </div>

        {/* Provider List */}
        {providers.length === 0 ? (
          <p className="text-sm text-gray-600 py-2">No providers available</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto !mb-[8px]">
            {providers.map((provider) => (
              <div className="!mb-[8px]">
              <Checkbox
                key={provider._id}
                checked={selectedIds.includes(provider._id)}
                onChange={(e) =>
                  handleProviderChange(provider._id, e.target.checked)
                }
                disabled={disabled}
                label={provider.name}
                className=""
              />
              </div>
            ))}
          </div>
        )}

        {/* Selected Count */}
        <div className="!py-[12px] pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Selected: {selectedIds.length} of {providers.length} provider
            {providers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Validation Message */}
      {selectedIds.length === 0 && !error && (
        <p className="mt-1 text-sm text-amber-600">
          Please select at least one provider
        </p>
      )}
    </div>
  );
}
