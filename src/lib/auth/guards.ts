import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import {
  TokenPayload,
  ClientTokenPayload,
  ProviderTokenPayload,
  ProviderRole,
  isClientToken,
  isProviderToken,
} from '../types/auth.types';
import { errorResponse } from '../types/api.types';
import { getCurrentUser } from '../middleware/auth.middleware';
import { hasPermission, Permission } from '../../constants/roles';

/**
 * Guard result type
 */
export type GuardResult<T> =
  | { success: true; payload: T }
  | { success: false; response: NextResponse };

/**
 * Guard that requires any authenticated user
 */
export async function guardAuth(): Promise<GuardResult<TokenPayload>> {
  const result = await getCurrentUser();

  if (!result.authenticated || !result.payload) {
    return {
      success: false,
      response: NextResponse.json(
        errorResponse('Unauthorized', result.error || 'Authentication required'),
        { status: 401 }
      ),
    };
  }

  return { success: true, payload: result.payload };
}

/**
 * Guard that requires a client user
 */
export async function guardClient(): Promise<GuardResult<ClientTokenPayload>> {
  const result = await guardAuth();

  if (!result.success) {
    return result;
  }

  if (!isClientToken(result.payload)) {
    return {
      success: false,
      response: NextResponse.json(
        errorResponse('Forbidden', 'Client access required'),
        { status: 403 }
      ),
    };
  }

  return { success: true, payload: result.payload };
}

/**
 * Guard that requires a provider user
 */
export async function guardProvider(): Promise<GuardResult<ProviderTokenPayload>> {
  const result = await guardAuth();

  if (!result.success) {
    return result;
  }

  if (!isProviderToken(result.payload)) {
    return {
      success: false,
      response: NextResponse.json(
        errorResponse('Forbidden', 'Provider access required'),
        { status: 403 }
      ),
    };
  }

  return { success: true, payload: result.payload };
}

/**
 * Guard that requires a provider with specific role(s)
 */
export async function guardProviderRole(
  ...roles: ProviderRole[]
): Promise<GuardResult<ProviderTokenPayload>> {
  const result = await guardProvider();

  if (!result.success) {
    return result;
  }

  if (!roles.includes(result.payload.role)) {
    return {
      success: false,
      response: NextResponse.json(
        errorResponse('Forbidden', `Required role: ${roles.join(' or ')}`),
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Guard that requires a provider with a specific permission
 */
export async function guardPermission(
  permission: Permission
): Promise<GuardResult<ProviderTokenPayload>> {
  const result = await guardProvider();

  if (!result.success) {
    return result;
  }

  if (!hasPermission(result.payload.role, permission)) {
    return {
      success: false,
      response: NextResponse.json(
        errorResponse('Forbidden', `Permission required: ${permission}`),
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Guard that requires admin role
 */
export async function guardAdmin(): Promise<GuardResult<ProviderTokenPayload>> {
  return guardProviderRole('admin');
}

/**
 * Guard that requires editor role (admin or view_edit)
 */
export async function guardEditor(): Promise<GuardResult<ProviderTokenPayload>> {
  return guardProviderRole('admin', 'view_edit');
}

/**
 * Guard for client or provider (returns the appropriate payload)
 */
export async function guardClientOrProvider(): Promise<
  | { success: true; type: 'client'; payload: ClientTokenPayload }
  | { success: true; type: 'provider'; payload: ProviderTokenPayload }
  | { success: false; response: NextResponse }
> {
  const result = await guardAuth();

  if (!result.success) {
    return result;
  }

  if (isClientToken(result.payload)) {
    return { success: true, type: 'client', payload: result.payload };
  }

  if (isProviderToken(result.payload)) {
    return { success: true, type: 'provider', payload: result.payload };
  }

  return {
    success: false,
    response: NextResponse.json(
      errorResponse('Invalid token', 'Unknown user type'),
      { status: 400 }
    ),
  };
}

/**
 * Helper to get client ID as ObjectId
 */
export function getClientId(payload: ClientTokenPayload): Types.ObjectId {
  return new Types.ObjectId(payload.sub);
}

/**
 * Helper to get provider user ID as ObjectId
 */
export function getUserId(payload: ProviderTokenPayload): Types.ObjectId {
  return new Types.ObjectId(payload.sub);
}

/**
 * Helper to get organization ID as ObjectId
 */
export function getOrgId(payload: ProviderTokenPayload): Types.ObjectId {
  return new Types.ObjectId(payload.organizationId);
}
