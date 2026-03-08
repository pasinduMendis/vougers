'use client';

import Link from 'next/link';
import { QuoteRequestForm } from '@/components/forms/QuoteRequestForm';

export default function NewQuoteRequestPage() {
  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-4 sm:px-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/client/quotes"
          className="text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          My Quotes
        </Link>
        <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 font-medium">New Quote Request</span>
      </nav>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">New Quote Request</h1>
        </div>
        <p className="text-slate-600 ml-0 sm:ml-[52px]">
          Fill in your shipment details and select service providers to request competitive quotes.
        </p>
      </div>

      {/* Form */}
      <QuoteRequestForm />
    </div>
  );
}
