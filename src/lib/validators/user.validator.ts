import { ProviderRole } from '../types/auth.types';
import { ALL_PROVIDER_ROLES } from '../../constants/roles';
import { validatePasswordStrength } from '../auth/password';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: ProviderRole;
}

export interface UpdateUserData {
  name?: string;
  role?: ProviderRole;
  isActive?: boolean;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate create user data
 */
export function validateCreateUser(body: unknown): ValidationResult<CreateUserData> {
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

  // Role validation
  if (!data.role || typeof data.role !== 'string') {
    errors.role = 'Role is required';
  } else if (!ALL_PROVIDER_ROLES.includes(data.role as ProviderRole)) {
    errors.role = `Invalid role. Must be one of: ${ALL_PROVIDER_ROLES.join(', ')}`;
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
      role: data.role as ProviderRole,
    },
  };
}

/**
 * Validate update user data
 */
export function validateUpdateUser(body: unknown): ValidationResult<UpdateUserData> {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { success: false, errors: { _form: 'Invalid request body' } };
  }

  const data = body as Record<string, unknown>;
  const updateData: UpdateUserData = {};

  // At least one field must be provided
  const hasUpdates =
    data.name !== undefined ||
    data.role !== undefined ||
    data.isActive !== undefined;

  if (!hasUpdates) {
    return {
      success: false,
      errors: { _form: 'At least one field must be provided for update' },
    };
  }

  // Name validation (optional)
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.name = 'Name must be a string';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Name must not exceed 100 characters';
    } else {
      updateData.name = data.name.trim();
    }
  }

  // Role validation (optional)
  if (data.role !== undefined) {
    if (typeof data.role !== 'string') {
      errors.role = 'Role must be a string';
    } else if (!ALL_PROVIDER_ROLES.includes(data.role as ProviderRole)) {
      errors.role = `Invalid role. Must be one of: ${ALL_PROVIDER_ROLES.join(', ')}`;
    } else {
      updateData.role = data.role as ProviderRole;
    }
  }

  // isActive validation (optional)
  if (data.isActive !== undefined) {
    if (typeof data.isActive !== 'boolean') {
      errors.isActive = 'isActive must be a boolean';
    } else {
      updateData.isActive = data.isActive;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: updateData };
}
