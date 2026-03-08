import { validatePasswordStrength } from '../auth/password';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterClientData {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyAddress: string;
}

export interface RegisterProviderData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate login request data
 */
export function validateLoginData(body: unknown): ValidationResult<LoginData> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: (data.email as string).toLowerCase().trim(),
      password: data.password as string,
    },
  };
}

/**
 * Validate client registration data
 */
export function validateRegisterClientData(
  body: unknown
): ValidationResult<RegisterClientData> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Name must not exceed 100 characters';
  }

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required';
  } else {
    const passwordErrors = validatePasswordStrength(data.password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors[0];
    }
  }

  // Company name validation
  if (!data.companyName || typeof data.companyName !== 'string') {
    errors.companyName = 'Company name is required';
  } else if (data.companyName.trim().length < 2) {
    errors.companyName = 'Company name must be at least 2 characters';
  } else if (data.companyName.trim().length > 200) {
    errors.companyName = 'Company name must not exceed 200 characters';
  }

  // Company address validation
  if (!data.companyAddress || typeof data.companyAddress !== 'string') {
    errors.companyAddress = 'Company address is required';
  } else if (data.companyAddress.trim().length < 5) {
    errors.companyAddress = 'Company address must be at least 5 characters';
  } else if (data.companyAddress.trim().length > 500) {
    errors.companyAddress = 'Company address must not exceed 500 characters';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: (data.name as string).trim(),
      email: (data.email as string).toLowerCase().trim(),
      password: data.password as string,
      companyName: (data.companyName as string).trim(),
      companyAddress: (data.companyAddress as string).trim(),
    },
  };
}

/**
 * Validate provider registration data
 */
export function validateRegisterProviderData(
  body: unknown
): ValidationResult<RegisterProviderData> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Name must not exceed 100 characters';
  }

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required';
  } else {
    const passwordErrors = validatePasswordStrength(data.password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors[0];
    }
  }

  // Organization name validation
  if (!data.organizationName || typeof data.organizationName !== 'string') {
    errors.organizationName = 'Organization name is required';
  } else if (data.organizationName.trim().length < 2) {
    errors.organizationName = 'Organization name must be at least 2 characters';
  } else if (data.organizationName.trim().length > 100) {
    errors.organizationName = 'Organization name must not exceed 100 characters';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: (data.name as string).trim(),
      email: (data.email as string).toLowerCase().trim(),
      password: data.password as string,
      organizationName: (data.organizationName as string).trim(),
    },
  };
}
