"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = "default", padding = "none", children, ...props },
    ref,
  ) => {
    const variants = {
      default: "bg-white rounded-2xl",
      bordered:
        "bg-white rounded-2xl border border-slate-200 shadow-sm !p-[16px] !my-[8px]",
      elevated: "bg-white rounded-2xl shadow-lg shadow-slate-200/50",
    };

    const paddings = {
      none: "",
      sm: "p-4",
      md: "p-5 sm:p-6",
      lg: "p-6 sm:p-8",
    };

    return (
      <div
        ref={ref}
        className={cn(variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100",
        className,
      )}
      {...props}
    />
  ),
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg sm:text-xl font-semibold text-slate-900",
        className,
      )}
      {...props}
    />
  ),
);

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-slate-600 mt-1", className)}
      {...props}
    />
  ),
);

CardDescription.displayName = "CardDescription";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-5 sm:px-6 py-5 sm:py-6", className)}
      {...props}
    />
  ),
);

CardContent.displayName = "CardContent";

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-5 sm:px-6 py-4 bg-slate-50/50 border-t border-slate-100 rounded-b-2xl",
        className,
      )}
      {...props}
    />
  ),
);

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
