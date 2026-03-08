"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/lib/utils";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="relative flex items-start">
        <div className="flex h-6 items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer !mr-[4px]",
              error && "border-red-300",
              props.disabled && "cursor-not-allowed opacity-50",
              className,
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm leading-6">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  "font-medium text-gray-900 cursor-pointer",
                  props.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {label}
              </label>
            )}
            {description && <p className="text-gray-600">{description}</p>}
            {error && <p className="text-red-600">{error}</p>}
          </div>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
