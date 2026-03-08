import { NextRequest, NextResponse } from 'next/server';
import {
  guardClientOrProvider,
  getClientId,
  getOrgId,
} from '@/src/lib/auth/guards';
import {
  getQuotesByClient,
  getQuotesByProvider,
} from '@/src/lib/services/quote.service';
import {
  errorResponse,
  parsePaginationParams,
} from '@/src/lib/types/api.types';
import { QuoteStatus } from '@/src/lib/types/quote.types';

/**
 * GET /api/quotes
 * List quotes for the authenticated user
 * - Clients see quotes for their requests
 * - Providers see quotes assigned to their organization
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication (client or provider)
    const authResult = await guardClientOrProvider();
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
    const status = searchParams.get('status') as QuoteStatus | null;
    const clientId = searchParams.get('clientId') || undefined;
    const filters = {
      status: status || undefined,
      clientId,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      page,
      limit,
    };

    // Get quotes based on user type
    if (authResult.type === 'client') {
      const clientId = getClientId(authResult.payload);
      const result = await getQuotesByClient(clientId.toString(), filters);
      return NextResponse.json(result, { status: 200 });
    } else {
      const orgId = getOrgId(authResult.payload);
      const result = await getQuotesByProvider(orgId.toString(), filters);
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    console.error('Get quotes error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch quotes'),
      { status: 500 }
    );
  }
}
