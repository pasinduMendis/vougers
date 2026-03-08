import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, getOrgId } from '@/src/lib/auth/guards';
import {
  getUsersByOrganization,
  createUser,
} from '@/src/lib/services/user.service';
import { validateCreateUser } from '@/src/lib/validators/user.validator';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
} from '@/src/lib/types/api.types';
import { ProviderRole } from '@/src/lib/types/auth.types';

/**
 * GET /api/users
 * List users in the organization
 * Only accessible by admin users
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await guardAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);

    // Parse pagination params
    const { page, limit } = parsePaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Parse filters
    const filters = {
      search: searchParams.get('search') || undefined,
      role: (searchParams.get('role') as ProviderRole) || undefined,
      isActive: searchParams.get('isActive')
        ? searchParams.get('isActive') === 'true'
        : undefined,
      page,
      limit,
    };

    // Get users
    const orgId = getOrgId(authResult.payload);
    const result = await getUsersByOrganization(orgId.toString(), filters);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch users'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user in the organization
 * Only accessible by admin users
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await guardAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();

    // Validate request body
    const validation = validateCreateUser(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.errors },
        { status: 400 }
      );
    }

    // Create the user
    const orgId = getOrgId(authResult.payload);
    const result = await createUser(orgId.toString(), validation.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to create user', result.error),
        { status: 409 }
      );
    }

    return NextResponse.json(
      successResponse(result.data, 'User created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to create user'),
      { status: 500 }
    );
  }
}
