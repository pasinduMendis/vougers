import { NextRequest, NextResponse } from 'next/server';
import { guardProvider, getOrgId } from '@/src/lib/auth/guards';
import { rejectNegotiation, providerOwnsQuote } from '@/src/lib/services/quote.service';
import { Types } from 'mongoose';
import { errorResponse, successResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/quotes/[id]/reject-negotiation - Provider rejects negotiation request
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check provider authentication
    const authResult = await guardProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate quote ID
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Quote ID is invalid'),
        { status: 400 }
      );
    }

    // Verify the provider owns this quote
    const orgId = getOrgId(authResult.payload);
    const owns = await providerOwnsQuote(id, orgId.toString());
    if (!owns) {
      return NextResponse.json(
        errorResponse('Not found', 'Quote not found'),
        { status: 404 }
      );
    }

    // Reject the negotiation
    const result = await rejectNegotiation(id, orgId.toString());

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to reject negotiation', result.error || 'Unknown error'),
        { status: 400 }
      );
    }

    // Transform response
    const quote = result.data;
    return NextResponse.json(
      successResponse(
        {
          _id: quote?._id?.toString(),
          quoteRequestId: quote?.quoteRequestId?.toString(),
          clientId: quote?.clientId?.toString(),
          serviceProviderId: quote?.serviceProviderId?.toString(),
          freightCost: quote?.freightCost,
          transitDays: quote?.transitDays,
          pricedAt: quote?.pricedAt,
          status: quote?.status,
          negotiationRequested: quote?.negotiationRequested,
          negotiationMessage: quote?.negotiationMessage,
          negotiationRequestedAt: quote?.negotiationRequestedAt,
          negotiationRejectedAt: quote?.negotiationRejectedAt,
          createdAt: quote?.createdAt,
          updatedAt: quote?.updatedAt,
        },
        'Negotiation rejected successfully'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Reject negotiation error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to reject negotiation'),
      { status: 500 }
    );
  }
}
