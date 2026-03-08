import { QuoteStatus } from '../types/quote.types';
import { UserType } from '../types/auth.types';
import { isValidTransition, ALL_QUOTE_STATUSES } from '../../constants/statuses';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export interface PriceQuoteData {
  freightCost: number;
  transitDays: number;
}

export interface UpdateStatusData {
  status: QuoteStatus;
}

/**
 * Validate price quote payload
 */
export function validatePriceQuote(body: unknown): ValidationResult<PriceQuoteData> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;

  // Freight cost - required, must be positive number
  if (data.freightCost === undefined || data.freightCost === null) {
    errors.freightCost = 'Freight cost is required';
  } else if (typeof data.freightCost !== 'number') {
    errors.freightCost = 'Freight cost must be a number';
  } else if (data.freightCost < 0) {
    errors.freightCost = 'Freight cost cannot be negative';
  } else if (data.freightCost > 10000000) {
    errors.freightCost = 'Freight cost exceeds maximum allowed value';
  }

  // Transit days - required, must be positive integer
  if (data.transitDays === undefined || data.transitDays === null) {
    errors.transitDays = 'Transit days is required';
  } else if (typeof data.transitDays !== 'number') {
    errors.transitDays = 'Transit days must be a number';
  } else if (!Number.isInteger(data.transitDays)) {
    errors.transitDays = 'Transit days must be a whole number';
  } else if (data.transitDays < 1) {
    errors.transitDays = 'Transit days must be at least 1';
  } else if (data.transitDays > 365) {
    errors.transitDays = 'Transit days cannot exceed 365';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      freightCost: data.freightCost as number,
      transitDays: data.transitDays as number,
    },
  };
}

/**
 * Validate status update payload
 */
export function validateStatusUpdate(body: unknown): ValidationResult<UpdateStatusData> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;

  // Status - required, must be valid status
  if (!data.status || typeof data.status !== 'string') {
    errors.status = 'Status is required';
  } else if (!ALL_QUOTE_STATUSES.includes(data.status as QuoteStatus)) {
    errors.status = `Invalid status. Must be one of: ${ALL_QUOTE_STATUSES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      status: data.status as QuoteStatus,
    },
  };
}

/**
 * Validate status transition
 */
export function validateStatusTransition(
  currentStatus: QuoteStatus,
  newStatus: QuoteStatus,
  actorType: UserType
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    return { valid: false, error: 'Quote is already in this status' };
  }

  if (!isValidTransition(currentStatus, newStatus, actorType)) {
    return {
      valid: false,
      error: `Cannot change status from '${currentStatus}' to '${newStatus}' as ${actorType}`,
    };
  }

  return { valid: true };
}
