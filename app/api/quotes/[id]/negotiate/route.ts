import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/src/lib/db/connection';
import QuoteModel from '@/src/lib/models/quote.model';
import { guardClient, getClientId } from '@/src/lib/auth/guards';
import { clientOwnsQuote } from '@/src/lib/services/quote.service';
import { Types } from 'mongoose';
import { errorResponse, successResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/quotes/[id]/negotiate - Client requests price negotiation
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check client authentication
    const authResult = await guardClient();
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { message } = body;

    await connectDB();

    // Verify the client owns this quote
    const clientId = getClientId(authResult.payload);
    const owns = await clientOwnsQuote(id, clientId.toString());
    if (!owns) {
      return NextResponse.json(
        errorResponse('Not found', 'Quote not found'),
        { status: 404 }
      );
    }

    // Find the quote
    const quote = await QuoteModel.findById(id);

    if (!quote) {
      return NextResponse.json(
        errorResponse('Not found', 'Quote not found'),
        { status: 404 }
      );
    }

    // Can only negotiate priced quotes
    if (quote.status !== 'priced') {
      return NextResponse.json(
        errorResponse('Invalid status', 'Can only negotiate quotes that have been priced'),
        { status: 400 }
      );
    }

    // Check if negotiation already requested
    if (quote.negotiationRequested) {
      return NextResponse.json(
        errorResponse('Already requested', 'Negotiation already requested for this quote'),
        { status: 400 }
      );
    }

    // Update quote with negotiation request
    quote.negotiationRequested = true;
    quote.negotiationMessage = message || undefined;
    quote.negotiationRequestedAt = new Date();

    console.log('Saving negotiation request:', {
      quoteId: id,
      negotiationRequested: quote.negotiationRequested,
      negotiationMessage: quote.negotiationMessage,
      negotiationRequestedAt: quote.negotiationRequestedAt,
    });

    const savedQuote = await quote.save();
    console.log('Saved quote:', savedQuote._id, 'negotiationRequested:', savedQuote.negotiationRequested);

    // Return updated quote with populated provider
    const updatedQuote = await QuoteModel.findById(id)
      .populate('serviceProviderId', 'name slug')
      .lean();

    const provider = updatedQuote?.serviceProviderId as unknown as {
      _id: Types.ObjectId;
      name: string;
      slug: string;
    } | undefined;

    return NextResponse.json(
      successResponse(
        {
          _id: updatedQuote?._id?.toString(),
          quoteRequestId: updatedQuote?.quoteRequestId?.toString(),
          clientId: updatedQuote?.clientId?.toString(),
          serviceProviderId: provider?._id?.toString(),
          provider: provider ? {
            _id: provider._id.toString(),
            name: provider.name,
            slug: provider.slug,
          } : undefined,
          freightCost: updatedQuote?.freightCost,
          transitDays: updatedQuote?.transitDays,
          pricedAt: updatedQuote?.pricedAt,
          status: updatedQuote?.status,
          negotiationRequested: updatedQuote?.negotiationRequested,
          negotiationMessage: updatedQuote?.negotiationMessage,
          negotiationRequestedAt: updatedQuote?.negotiationRequestedAt,
          createdAt: updatedQuote?.createdAt,
          updatedAt: updatedQuote?.updatedAt,
        },
        'Negotiation requested successfully'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Negotiate quote error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to request negotiation'),
      { status: 500 }
    );
  }
}
