import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/middleware/auth.middleware';
import { getClientById, getProviderById } from '@/src/lib/services/auth.service';
import { isClientToken, isProviderToken } from '@/src/lib/types/auth.types';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

export async function GET() {
  try {
    // Get current user from token
    const authResult = await getCurrentUser();

    if (!authResult.authenticated || !authResult.payload) {
      return NextResponse.json(
        errorResponse('Unauthorized', authResult.error || 'Not authenticated'),
        { status: 401 }
      );
    }

    const payload = authResult.payload;

    // Fetch full user details based on type
    if (isClientToken(payload)) {
      const client = await getClientById(payload.sub);

      if (!client) {
        return NextResponse.json(
          errorResponse('Not found', 'User not found or inactive'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        successResponse({
          type: 'client',
          user: client,
        }),
        { status: 200 }
      );
    }

    if (isProviderToken(payload)) {
      const provider = await getProviderById(payload.sub);

      if (!provider) {
        return NextResponse.json(
          errorResponse('Not found', 'User not found or inactive'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        successResponse({
          type: 'provider',
          user: provider,
        }),
        { status: 200 }
      );
    }

    return NextResponse.json(
      errorResponse('Invalid token', 'Unknown user type'),
      { status: 400 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
