// Standard API response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paginated API response
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Sort params
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Combined list params
export interface ListParams extends PaginationParams, SortParams {
  search?: string;
}

// API error response
export interface ApiError {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, string[]>;
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
}

// Helper to create success response
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

// Helper to create error response
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
  };
}

// Helper to create paginated response
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Default pagination values
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// Parse pagination params from query
export function parsePaginationParams(params: Record<string, string | undefined>): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(params.page || String(DEFAULT_PAGE), 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.limit || String(DEFAULT_LIMIT), 10)));
  return { page, limit };
}
