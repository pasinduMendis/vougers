import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { guardProvider, getOrgId, getUserId } from '@/src/lib/auth/guards';
import { canPriceQuotes } from '@/src/lib/middleware/rbac.middleware';
import { priceQuote, providerOwnsQuote } from '@/src/lib/services/quote.service';
import { validatePriceQuote } from '@/src/lib/validators/quote.validator';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/quotes/[id]/price
 * Set price on a quote (provider action)
 * Only accessible by providers with admin or view_edit role
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check provider authentication and permission
    const permResult = await canPriceQuotes();
    if (!permResult.authorized || !permResult.payload) {
      return permResult.response!;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Quote ID is invalid'),
        { status: 400 }
      );
    }

    // Check if provider owns this quote
    const orgId = getOrgId(permResult.payload);
    const owns = await providerOwnsQuote(id, orgId.toString());
    if (!owns) {
      return NextResponse.json(
        errorResponse('Not found', 'Quote not found'),
        { status: 404 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validatePriceQuote(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.errors },
        { status: 400 }
      );
    }

    // Price the quote
    const userId = getUserId(permResult.payload);
    const result = await priceQuote(
      id,
      orgId.toString(),
      userId.toString(),
      validation.data
    );

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to price quote', result.error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        {
          _id: result.data!._id.toString(),
          freightCost: result.data!.freightCost,
          transitDays: result.data!.transitDays,
          pricedAt: result.data!.pricedAt,
          status: result.data!.status,
        },
        'Quote priced successfully'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Price quote error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to price quote'),
      { status: 500 }
    );
  }
}
