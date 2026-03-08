import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../auth/jwt';
import { getAuthCookie } from '../auth/session';
import {
  TokenPayload,
  ClientTokenPayload,
  ProviderTokenPayload,
  isClientToken,
  isProviderToken,
} from '../types/auth.types';
import { errorResponse } from '../types/api.types';

/**
 * Result of authentication check
 */
export interface AuthResult {
  authenticated: boolean;
  payload: TokenPayload | null;
  error?: string;
}

/**
 * Get current user from auth cookie (for Route Handlers)
 */
export async function getCurrentUser(): Promise<AuthResult> {
  const token = await getAuthCookie();

  if (!token) {
    return {
      authenticated: false,
      payload: null,
      error: 'No authentication token provided',
    };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return {
      authenticated: false,
      payload: null,
      error: 'Invalid or expired token',
    };
  }

  return {
    authenticated: true,
    payload,
  };
}

/**
 * Get client user from auth cookie
 * Returns null if not authenticated or not a client
 */
export async function getClientUser(): Promise<ClientTokenPayload | null> {
  const { authenticated, payload } = await getCurrentUser();

  if (!authenticated || !payload || !isClientToken(payload)) {
    return null;
  }

  return payload;
}

/**
 * Get provider user from auth cookie
 * Returns null if not authenticated or not a provider
 */
export async function getProviderUser(): Promise<ProviderTokenPayload | null> {
  const { authenticated, payload } = await getCurrentUser();

  if (!authenticated || !payload || !isProviderToken(payload)) {
    return null;
  }

  return payload;
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(): Promise<
  { success: true; payload: TokenPayload } | { success: false; response: NextResponse }
> {
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

  return {
    success: true,
    payload: result.payload,
  };
}

/**
 * Require client authentication
 */
export async function requireClient(): Promise<
  { success: true; payload: ClientTokenPayload } | { success: false; response: NextResponse }
> {
  const result = await requireAuth();

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

  return {
    success: true,
    payload: result.payload,
  };
}

/**
 * Require provider authentication
 */
export async function requireProvider(): Promise<
  { success: true; payload: ProviderTokenPayload } | { success: false; response: NextResponse }
> {
  const result = await requireAuth();

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

  return {
    success: true,
    payload: result.payload,
  };
}

/**
 * Higher-order function to wrap a route handler with authentication
 */
export function withAuth<T extends TokenPayload>(
  handler: (payload: T, request: NextRequest) => Promise<NextResponse>,
  requireType?: 'client' | 'provider'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    let authResult;

    if (requireType === 'client') {
      authResult = await requireClient();
    } else if (requireType === 'provider') {
      authResult = await requireProvider();
    } else {
      authResult = await requireAuth();
    }

    if (!authResult.success) {
      return authResult.response;
    }

    return handler(authResult.payload as T, request);
  };
}
