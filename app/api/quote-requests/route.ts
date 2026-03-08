import { NextRequest, NextResponse } from 'next/server';
import { guardClient, getClientId } from '@/src/lib/auth/guards';
import { validateCreateQuoteRequest } from '@/src/lib/validators/quote-request.validator';
import {
  createQuoteRequest,
  getQuoteRequestsByClient,
} from '@/src/lib/services/quote-request.service';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
} from '@/src/lib/types/api.types';

/**
 * POST /api/quote-requests
 * Create a new quote request (sends to providers)
 * Only accessible by authenticated clients
 */
export async function POST(request: NextRequest) {
  try {
    // Require client authentication
    const authResult = await guardClient();
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();

    // Validate request body
    const validation = validateCreateQuoteRequest(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.errors },
        { status: 400 }
      );
    }

    // Create the quote request
    const clientId = getClientId(authResult.payload);
    const result = await createQuoteRequest(clientId.toString(), validation.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to create quote request', result.error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.data, 'Quote request created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create quote request error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to create quote request'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/quote-requests
 * List quote requests for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    // Require client authentication
    const authResult = await guardClient();
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);

    // Parse pagination params
    const { page, limit } = parsePaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Parse other filters
    const status = searchParams.get('status') as 'pending' | 'priced' | 'approved' | 'rejected' | 'completed' | null;
    const filters = {
      status: status || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      page,
      limit,
    };

    // Get quote requests
    const clientId = getClientId(authResult.payload);
    const result = await getQuoteRequestsByClient(clientId.toString(), filters);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Get quote requests error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch quote requests'),
      { status: 500 }
    );
  }
}
