"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/lib/utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: "sm" | "md" | "lg";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, size = "lg", ...props }, ref) => {
    const inputId = id || props.name;

    const sizeClasses = {
      sm: "h-10 px-3 py-2 text-sm",
      md: "h-11 px-4 py-2.5 text-sm",
      lg: "h-12 sm:h-14 px-4 py-3 text-base sm:text-lg",
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm sm:text-base font-semibold text-slate-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "block w-full rounded-xl border-2 shadow-sm transition-all duration-200",
            "placeholder:text-slate-500 text-slate-900",
            "focus:outline-none focus:ring-4 focus:ring-offset-0 !px-[8px]",
            sizeClasses[size],
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/50"
              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 hover:border-slate-300 bg-white",
            props.disabled && "bg-slate-100 cursor-not-allowed opacity-60",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
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
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-slate-600">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
