import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { guardAdmin, getOrgId, getUserId } from '@/src/lib/auth/guards';
import {
  getUserById,
  updateUser,
  deactivateUser,
} from '@/src/lib/services/user.service';
import { validateUpdateUser } from '@/src/lib/validators/user.validator';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 * Get a single user
 * Only accessible by admin users
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin authentication
    const authResult = await guardAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'User ID is invalid'),
        { status: 400 }
      );
    }

    // Get the user
    const orgId = getOrgId(authResult.payload);
    const result = await getUserById(id, orgId.toString());

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Not found', result.error || 'User not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(result.data),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch user'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user
 * Only accessible by admin users
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin authentication
    const authResult = await guardAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'User ID is invalid'),
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = validateUpdateUser(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.errors },
        { status: 400 }
      );
    }

    // Update the user
    const orgId = getOrgId(authResult.payload);
    const result = await updateUser(id, orgId.toString(), validation.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to update user', result.error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.data, 'User updated successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to update user'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Deactivate a user (soft delete)
 * Only accessible by admin users
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin authentication
    const authResult = await guardAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'User ID is invalid'),
        { status: 400 }
      );
    }

    // Deactivate the user
    const orgId = getOrgId(authResult.payload);
    const requestingUserId = getUserId(authResult.payload);
    const result = await deactivateUser(id, orgId.toString(), requestingUserId.toString());

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to deactivate user', result.error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(null, 'User deactivated successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Deactivate user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to deactivate user'),
      { status: 500 }
    );
  }
}
