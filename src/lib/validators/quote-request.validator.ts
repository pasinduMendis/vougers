import { Types } from 'mongoose';
import { CreateQuoteRequestPayload } from '../types/quote.types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * Validate create quote request payload
 */
export function validateCreateQuoteRequest(
  body: unknown
): ValidationResult<CreateQuoteRequestPayload> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;

  // Port of loading - required
  if (!data.portOfLoading || typeof data.portOfLoading !== 'string') {
    errors.portOfLoading = 'Port of loading is required';
  } else if (data.portOfLoading.trim().length < 2) {
    errors.portOfLoading = 'Port of loading must be at least 2 characters';
  } else if (data.portOfLoading.trim().length > 200) {
    errors.portOfLoading = 'Port of loading must not exceed 200 characters';
  }

  // Port of discharge - required
  if (!data.portOfDischarge || typeof data.portOfDischarge !== 'string') {
    errors.portOfDischarge = 'Port of discharge is required';
  } else if (data.portOfDischarge.trim().length < 2) {
    errors.portOfDischarge = 'Port of discharge must be at least 2 characters';
  } else if (data.portOfDischarge.trim().length > 200) {
    errors.portOfDischarge = 'Port of discharge must not exceed 200 characters';
  }

  // Commodity - optional
  if (data.commodity !== undefined && data.commodity !== null) {
    if (typeof data.commodity !== 'string') {
      errors.commodity = 'Commodity must be a string';
    } else if (data.commodity.trim().length > 200) {
      errors.commodity = 'Commodity must not exceed 200 characters';
    }
  }

  // Volume - optional
  if (data.volume !== undefined && data.volume !== null) {
    if (typeof data.volume !== 'string') {
      errors.volume = 'Volume must be a string';
    } else if (data.volume.trim().length > 100) {
      errors.volume = 'Volume must not exceed 100 characters';
    }
  }

  // Pickup address - optional
  if (data.pickupAddress !== undefined && data.pickupAddress !== null) {
    if (typeof data.pickupAddress !== 'string') {
      errors.pickupAddress = 'Pickup address must be a string';
    } else if (data.pickupAddress.trim().length > 500) {
      errors.pickupAddress = 'Pickup address must not exceed 500 characters';
    }
  }

  // Service provider IDs - optional array of valid ObjectIds
  if (data.serviceProviderIds !== undefined && data.serviceProviderIds !== null) {
    if (!Array.isArray(data.serviceProviderIds)) {
      errors.serviceProviderIds = 'Service provider IDs must be an array';
    } else {
      const invalidIds = data.serviceProviderIds.filter(
        (id) => typeof id !== 'string' || !Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        errors.serviceProviderIds = 'Invalid service provider ID(s)';
      }
    }
  }

  // Extra fields - optional object
  if (data.extraFields !== undefined && data.extraFields !== null) {
    if (typeof data.extraFields !== 'object' || Array.isArray(data.extraFields)) {
      errors.extraFields = 'Extra fields must be an object';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Build validated payload
  const payload: CreateQuoteRequestPayload = {
    portOfLoading: (data.portOfLoading as string).trim(),
    portOfDischarge: (data.portOfDischarge as string).trim(),
  };

  if (data.commodity && typeof data.commodity === 'string') {
    payload.commodity = data.commodity.trim();
  }

  if (data.volume && typeof data.volume === 'string') {
    payload.volume = data.volume.trim();
  }

  if (data.pickupAddress && typeof data.pickupAddress === 'string') {
    payload.pickupAddress = data.pickupAddress.trim();
  }

  if (Array.isArray(data.serviceProviderIds) && data.serviceProviderIds.length > 0) {
    payload.serviceProviderIds = data.serviceProviderIds as string[];
  }

  if (data.extraFields && typeof data.extraFields === 'object') {
    payload.extraFields = data.extraFields as Record<string, unknown>;
  }

  return { success: true, data: payload };
}
