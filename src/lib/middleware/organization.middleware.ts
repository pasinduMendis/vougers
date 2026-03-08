import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { ProviderTokenPayload, isProviderToken } from '../types/auth.types';
import { errorResponse } from '../types/api.types';
import { getCurrentUser } from './auth.middleware';

/**
 * Result of organization check
 */
export interface OrgCheckResult {
  authorized: boolean;
  organizationId?: Types.ObjectId;
  payload?: ProviderTokenPayload;
  response?: NextResponse;
}

/**
 * Get and validate organization ID from current provider user
 * This ensures providers can only access data within their organization
 */
export async function getOrganizationContext(): Promise<OrgCheckResult> {
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

  // Validate organization ID is a valid ObjectId
  if (!Types.ObjectId.isValid(authResult.payload.organizationId)) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Invalid token', 'Invalid organization ID in token'),
        { status: 400 }
      ),
    };
  }

  return {
    authorized: true,
    organizationId: new Types.ObjectId(authResult.payload.organizationId),
    payload: authResult.payload,
  };
}

/**
 * Check if a resource belongs to the current user's organization
 */
export async function belongsToOrganization(
  resourceOrgId: Types.ObjectId | string
): Promise<boolean> {
  const context = await getOrganizationContext();

  if (!context.authorized || !context.organizationId) {
    return false;
  }

  const resourceOrgObjectId =
    typeof resourceOrgId === 'string'
      ? new Types.ObjectId(resourceOrgId)
      : resourceOrgId;

  return context.organizationId.equals(resourceOrgObjectId);
}

/**
 * Create a query filter that restricts results to the current organization
 * Use this to automatically filter database queries by organization
 */
export async function createOrgFilter(): Promise<{
  success: boolean;
  filter?: { serviceProviderId: Types.ObjectId };
  response?: NextResponse;
}> {
  const context = await getOrganizationContext();

  if (!context.authorized || !context.organizationId) {
    return {
      success: false,
      response: context.response,
    };
  }

  return {
    success: true,
    filter: {
      serviceProviderId: context.organizationId,
    },
  };
}

/**
 * Verify access to a specific organization
 * Use when you need to check access to a particular org ID
 */
export async function verifyOrgAccess(
  targetOrgId: string | Types.ObjectId
): Promise<OrgCheckResult> {
  const context = await getOrganizationContext();

  if (!context.authorized) {
    return context;
  }

  const targetObjectId =
    typeof targetOrgId === 'string'
      ? new Types.ObjectId(targetOrgId)
      : targetOrgId;

  if (!context.organizationId?.equals(targetObjectId)) {
    return {
      authorized: false,
      response: NextResponse.json(
        errorResponse('Forbidden', 'Access denied to this organization'),
        { status: 403 }
      ),
    };
  }

  return context;
}
