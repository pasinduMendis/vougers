import { NextResponse } from 'next/server';
import { ProviderRole, ProviderTokenPayload, isProviderToken } from '../types/auth.types';
import { errorResponse } from '../types/api.types';
import { Permission, hasPermission, PERMISSIONS } from '../../constants/roles';
import { getCurrentUser } from './auth.middleware';

/**
 * Check if the current user has a specific permission
 */
export async function checkPermission(permission: Permission): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  const authResult = await getCurrentUser();

  if (!authResult.authenticated || !authResult.payload) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Unauthorized', 'Authentication required'),
        { status: 401 }
      ),
    };
  }

  // Only providers have roles
  if (!isProviderToken(authResult.payload)) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Forbidden', 'Provider access required'),
        { status: 403 }
      ),
    };
  }

  const { role } = authResult.payload;

  if (!hasPermission(role, permission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Forbidden', `Permission '${permission}' required`),
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    payload: authResult.payload,
  };
}

/**
 * Require specific role(s) for a provider
 */
export async function requireRole(...roles: ProviderRole[]): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  const authResult = await getCurrentUser();

  if (!authResult.authenticated || !authResult.payload) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Unauthorized', 'Authentication required'),
        { status: 401 }
      ),
    };
  }

  if (!isProviderToken(authResult.payload)) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Forbidden', 'Provider access required'),
        { status: 403 }
      ),
    };
  }

  if (!roles.includes(authResult.payload.role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Forbidden', `Role must be one of: ${roles.join(', ')}`),
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    payload: authResult.payload,
  };
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return requireRole('admin');
}

/**
 * Require at least view_edit role (admin or view_edit)
 */
export async function requireEditor(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return requireRole('admin', 'view_edit');
}

/**
 * Check if user can read quotes (any provider role)
 */
export async function canReadQuotes(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return checkPermission('quotes:read');
}

/**
 * Check if user can price quotes (admin or view_edit)
 */
export async function canPriceQuotes(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return checkPermission('quotes:price');
}

/**
 * Check if user can change quote status (admin or view_edit)
 */
export async function canChangeQuoteStatus(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return checkPermission('quotes:status');
}

/**
 * Check if user can read users (admin only)
 */
export async function canReadUsers(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return checkPermission('users:read');
}

/**
 * Check if user can write users (admin only)
 */
export async function canWriteUsers(): Promise<{
  authorized: boolean;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}> {
  return checkPermission('users:write');
}

/**
 * Get all permissions for the current user
 */
export function getPermissionsForRole(role: ProviderRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    hasPermission(role, permission)
  );
}
