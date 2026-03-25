import { Types } from 'mongoose';

// Quote status type
export type QuoteStatus = 'pending' | 'priced' | 'approved' | 'rejected' | 'completed' | 'lost' | 'missed';

// Create quote request payload (from client)
export interface CreateQuoteRequestPayload {
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  pickupAddress?: string;
  serviceProviderIds?: string[];  // Empty = all active providers
  extraFields?: Record<string, unknown>;
}

// Price quote payload (from provider)
export interface PriceQuotePayload {
  freightCost: number;
  transitDays: number;
}

// Negotiation request payload (from client)
export interface NegotiationRequestPayload {
  message?: string;
}

// Update quote status payload
export interface UpdateQuoteStatusPayload {
  status: QuoteStatus;
}

// Supplier details payload (from client after approval)
export interface SupplierDetailsPayload {
  supplierDetails: string;
}

// Agent details payload (from provider after client submits supplier details)
export interface AgentDetailsPayload {
  agentDetails: string;
}

// Price history entry
export interface PriceHistoryEntry {
  freightCost: number;
  transitDays: number;
  pricedAt: Date;
  pricedBy: string;
}

// Quote filters for listing
export interface QuoteFilters {
  status?: QuoteStatus;
  clientId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Quote request filters
export interface QuoteRequestFilters {
  status?: QuoteStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Provider info in quote response
export interface ProviderInfo {
  _id: string;
  name: string;
  slug: string;
}

// Quote response (for API)
export interface QuoteResponse {
  _id: string;
  quoteRequestId: string;
  clientId: string;
  serviceProviderId: string;
  provider?: ProviderInfo;
  freightCost?: number;
  transitDays?: number;
  pricedAt?: Date;
  pricedBy?: string;
  status: QuoteStatus;
  // Negotiation fields
  negotiationRequested?: boolean;
  negotiationMessage?: string;
  negotiationRequestedAt?: Date;
  priceHistory?: PriceHistoryEntry[];
  // Supplier details (added by client after approval)
  supplierDetails?: string;
  supplierDetailsAddedAt?: Date;
  // Agent details (added by provider after client submits supplier details)
  agentDetails?: string;
  agentDetailsAddedAt?: Date;
  agentDetailsAddedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Quote request response (for API)
export interface QuoteRequestResponse {
  _id: string;
  clientId: string;
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  pickupAddress?: string;
  extraFields?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Status summary (populated in list view)
  displayStatus?: QuoteStatus;
  totalQuotes?: number;
  pricedCount?: number;
}

// Quote request with quotes (detailed view)
export interface QuoteRequestWithQuotes extends QuoteRequestResponse {
  quotes: QuoteResponse[];
}

// Create quote request response
export interface CreateQuoteRequestResponse {
  quoteRequest: QuoteRequestResponse;
  quotes: QuoteResponse[];
  sentToProviders: number;
}

// Document interfaces (for mongoose)
export interface IQuoteRequest {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  pickupAddress?: string;
  extraFields?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuote {
  _id: Types.ObjectId;
  quoteRequestId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
  freightCost?: number;
  transitDays?: number;
  pricedAt?: Date;
  pricedBy?: Types.ObjectId;
  status: QuoteStatus;
  negotiationRequested?: boolean;
  negotiationMessage?: string;
  negotiationRequestedAt?: Date;
  priceHistory?: Array<{
    freightCost: number;
    transitDays: number;
    pricedAt: Date;
    pricedBy: Types.ObjectId;
  }>;
  // Supplier details (added by client after approval)
  supplierDetails?: string;
  supplierDetailsAddedAt?: Date;
  // Agent details (added by provider after client submits supplier details)
  agentDetails?: string;
  agentDetailsAddedAt?: Date;
  agentDetailsAddedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
