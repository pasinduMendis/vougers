"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { ProviderSelector } from "./ProviderSelector";
import { useProviders } from "@/hooks/useProviders";
import { useQuoteMutations } from "@/hooks/useQuotes";
import type { CreateQuoteRequestPayload } from "@/src/lib/types/quote.types";

interface QuoteRequestFormProps {
  onSuccess?: () => void;
}

// Dynamic field type
interface DynamicField {
  id: string;
  key: string;
  value: string;
}

export function QuoteRequestForm({ onSuccess }: QuoteRequestFormProps) {
  const router = useRouter();
  const { providers, isLoading: providersLoading } = useProviders();
  const { createQuoteRequest, isLoading, error } = useQuoteMutations();

  // Form state
  const [formData, setFormData] = useState({
    portOfLoading: "",
    portOfDischarge: "",
    commodity: "",
    volume: "",
    pickupAddress: "",
  });

  // Dynamic fields state
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);

  // Provider selection state
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Add new dynamic field
  const addDynamicField = () => {
    setDynamicFields((prev) => [
      ...prev,
      { id: crypto.randomUUID(), key: "", value: "" },
    ]);
  };

  // Remove dynamic field
  const removeDynamicField = (id: string) => {
    setDynamicFields((prev) => prev.filter((field) => field.id !== id));
    // Clear any errors for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`dynamicKey_${id}`];
      delete newErrors[`dynamicValue_${id}`];
      return newErrors;
    });
  };

  // Update dynamic field
  const updateDynamicField = (
    id: string,
    fieldType: "key" | "value",
    newValue: string,
  ) => {
    setDynamicFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, [fieldType]: newValue } : field,
      ),
    );
    // Clear error when user starts typing
    const errorKey =
      fieldType === "key" ? `dynamicKey_${id}` : `dynamicValue_${id}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.portOfLoading.trim()) {
      newErrors.portOfLoading = "Port of loading is required";
    }

    if (!formData.portOfDischarge.trim()) {
      newErrors.portOfDischarge = "Port of discharge is required";
    }

    if (selectedProviderIds.length === 0 && !selectAll) {
      newErrors.providers = "Please select at least one provider";
    }

    // Validate dynamic fields - both key and value are required if field exists
    dynamicFields.forEach((field) => {
      if (!field.key.trim() && field.value.trim()) {
        newErrors[`dynamicKey_${field.id}`] = "Field name is required";
      }
      if (field.key.trim() && !field.value.trim()) {
        newErrors[`dynamicValue_${field.id}`] = "Field value is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      // Build extra fields from dynamic fields (only include complete pairs)
      const extraFields: Record<string, string> = {};
      dynamicFields.forEach((field) => {
        if (field.key.trim() && field.value.trim()) {
          extraFields[field.key.trim()] = field.value.trim();
        }
      });

      const payload: CreateQuoteRequestPayload = {
        portOfLoading: formData.portOfLoading.trim(),
        portOfDischarge: formData.portOfDischarge.trim(),
        commodity: formData.commodity.trim() || undefined,
        volume: formData.volume.trim() || undefined,
        pickupAddress: formData.pickupAddress.trim() || undefined,
        // If selectAll is true, send empty array (backend will use all providers)
        // Otherwise, send selected provider IDs
        serviceProviderIds: selectAll ? [] : selectedProviderIds,
        // Include extra fields if any
        extraFields:
          Object.keys(extraFields).length > 0 ? extraFields : undefined,
      };

      const result = await createQuoteRequest(payload);

      if (result) {
        if (onSuccess) {
          onSuccess();
        }
        // Redirect to the newly created quote request
        router.push(`/client/quotes/${result.quoteRequest._id}`);
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error("Failed to create quote request:", err);
    }
  };

  return (
    <Card variant="bordered" className="!p-[20px] !mt-[4px]">
      <CardHeader>
        <CardTitle>Shipment Details</CardTitle>
        <p className="text-sm text-slate-600 !mt-[4px]">
          Enter your shipment information to request quotes
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit} className="!pt-[8px]">
        <CardContent className="!my-[16px]">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Port Information */}
          <div className="">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <svg
                className="w-5 h-5 text-indigo-500"
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
              Port Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <div className="!mt-[8px]">
                <Input
                  name="portOfLoading"
                  label="Port of Loading"
                  placeholder="e.g., Singapore"
                  value={formData.portOfLoading}
                  onChange={handleChange}
                  error={errors.portOfLoading}
                  disabled={isLoading}
                  size="md"
                />
              </div>

              <div className="!mt-[8px]">
                <Input
                  name="portOfDischarge"
                  label="Port of Discharge"
                  placeholder="e.g., Los Angeles"
                  value={formData.portOfDischarge}
                  onChange={handleChange}
                  error={errors.portOfDischarge}
                  disabled={isLoading}
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* Cargo Details */}
          <div className="!my-[16px]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              Cargo Details (Optional)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <div className="!mt-[8px]">
                <Input
                  name="commodity"
                  label="Commodity"
                  placeholder="e.g., Electronics"
                  value={formData.commodity}
                  onChange={handleChange}
                  disabled={isLoading}
                  size="md"
                />
              </div>

              <div className="!mt-[8px]">
                <Input
                  name="volume"
                  label="Volume"
                  placeholder="e.g., 20 CBM"
                  value={formData.volume}
                  onChange={handleChange}
                  disabled={isLoading}
                  size="md"
                />
              </div>
            </div>

            <div className="!mt-[8px]">
              <Input
                name="pickupAddress"
                label="Pickup Address"
                placeholder="Full pickup address"
                value={formData.pickupAddress}
                onChange={handleChange}
                disabled={isLoading}
                size="md"
              />
            </div>
          </div>

          {/* Dynamic Custom Fields */}
          <div className="!my-[16px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <svg
                  className="w-5 h-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Additional Information (Optional)
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDynamicField}
                disabled={isLoading}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Field
              </Button>
            </div>

            {dynamicFields.length > 0 && (
              <div className="space-y-3">
                {dynamicFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-3 bg-slate-50 rounded-xl border border-slate-200 !mt-[8px] !p-[16px]"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Field Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Weight"
                          value={field.key}
                          onChange={(e) =>
                            updateDynamicField(field.id, "key", e.target.value)
                          }
                          disabled={isLoading}
                          className={`block w-full h-11 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 rounded-xl border-2 shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-0 ${
                            errors[`dynamicKey_${field.id}`]
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/50"
                              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 hover:border-slate-300 bg-white"
                          } ${isLoading ? "bg-slate-100 cursor-not-allowed opacity-60" : ""}`}
                        />
                        {errors[`dynamicKey_${field.id}`] && (
                          <p className="!mt-[8px] text-sm text-red-600 flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors[`dynamicKey_${field.id}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Field Value
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 500 kg"
                          value={field.value}
                          onChange={(e) =>
                            updateDynamicField(
                              field.id,
                              "value",
                              e.target.value,
                            )
                          }
                          disabled={isLoading}
                          className={`block w-full h-11 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 rounded-xl border-2 shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-0 ${
                            errors[`dynamicValue_${field.id}`]
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/50"
                              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 hover:border-slate-300 bg-white"
                          } ${isLoading ? "bg-slate-100 cursor-not-allowed opacity-60" : ""}`}
                        />
                        {errors[`dynamicValue_${field.id}`] && (
                          <p className="!mt-[8px] text-sm text-red-600 flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors[`dynamicValue_${field.id}`]}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDynamicField(field.id)}
                      disabled={isLoading}
                      className="mt-8 p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Remove field"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {dynamicFields.length === 0 && (
              <p className="text-sm text-slate-500 italic">
                Click &quot;Add Field&quot; to include custom information with
                your quote request.
              </p>
            )}
          </div>

          {/* Provider Selection */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 !mb-[20px]">
              <svg
                className="w-5 h-5 text-indigo-500"
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
              Select Service Providers
            </div>
            <ProviderSelector
              providers={providers}
              selectedIds={selectedProviderIds}
              onChange={setSelectedProviderIds}
              selectAll={selectAll}
              onSelectAllChange={setSelectAll}
              disabled={isLoading || providersLoading}
              error={errors.providers}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-3 !mt-[20px]">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            size="md"
            className="!p-[12px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={
              isLoading ||
              providersLoading ||
              (selectedProviderIds.length === 0 && !selectAll)
            }
            size="md"
            className="!p-[12px]"
          >
            {isLoading ? "Sending..." : "Send Quote Request"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
