import { NextResponse } from 'next/server';
import { getActiveOrganizations } from '@/src/lib/services/organization.service';
import { guardClient } from '@/src/lib/auth/guards';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

/**
 * GET /api/providers
 * List all active service providers
 * Only accessible by authenticated clients
 */
export async function GET() {
  try {
    // Require client authentication
    const authResult = await guardClient();
    if (!authResult.success) {
      return authResult.response;
    }

    // Get all active providers
    const providers = await getActiveOrganizations();

    return NextResponse.json(
      successResponse(providers),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch providers'),
      { status: 500 }
    );
  }
}
