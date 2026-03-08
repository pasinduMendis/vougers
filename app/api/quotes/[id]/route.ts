import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import {
  guardClientOrProvider,
  getClientId,
  getOrgId,
} from '@/src/lib/auth/guards';
import {
  getQuoteById,
  clientOwnsQuote,
  providerOwnsQuote,
} from '@/src/lib/services/quote.service';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotes/[id]
 * Get a single quote
 * - Clients can view quotes from their requests
 * - Providers can view quotes assigned to their organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication (client or provider)
    const authResult = await guardClientOrProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Quote ID is invalid'),
        { status: 400 }
      );
    }

    // Check ownership based on user type
    if (authResult.type === 'client') {
      const clientId = getClientId(authResult.payload);
      const owns = await clientOwnsQuote(id, clientId.toString());
      if (!owns) {
        return NextResponse.json(
          errorResponse('Not found', 'Quote not found'),
          { status: 404 }
        );
      }
    } else {
      const orgId = getOrgId(authResult.payload);
      const owns = await providerOwnsQuote(id, orgId.toString());
      if (!owns) {
        return NextResponse.json(
          errorResponse('Not found', 'Quote not found'),
          { status: 404 }
        );
      }
    }

    // Get the quote with populated fields
    const quote = await getQuoteById(id);

    if (!quote) {
      return NextResponse.json(
        errorResponse('Not found', 'Quote not found'),
        { status: 404 }
      );
    }

    // Format response based on populated fields
    const quoteResponse = {
      _id: quote._id.toString(),
      quoteRequestId: quote.quoteRequestId?.toString(),
      clientId: quote.clientId?.toString(),
      serviceProviderId: quote.serviceProviderId?.toString(),
      freightCost: quote.freightCost,
      transitDays: quote.transitDays,
      pricedAt: quote.pricedAt,
      pricedBy: quote.pricedBy?.toString(),
      status: quote.status,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      // Populated fields
      provider: quote.serviceProviderId && typeof quote.serviceProviderId === 'object'
        ? {
            _id: (quote.serviceProviderId as any)._id?.toString(),
            name: (quote.serviceProviderId as any).name,
            slug: (quote.serviceProviderId as any).slug,
          }
        : undefined,
      client: quote.clientId && typeof quote.clientId === 'object'
        ? {
            _id: (quote.clientId as any)._id?.toString(),
            name: (quote.clientId as any).name,
            companyName: (quote.clientId as any).companyName,
          }
        : undefined,
      quoteRequest: quote.quoteRequestId && typeof quote.quoteRequestId === 'object'
        ? {
            _id: (quote.quoteRequestId as any)._id?.toString(),
            portOfLoading: (quote.quoteRequestId as any).portOfLoading,
            portOfDischarge: (quote.quoteRequestId as any).portOfDischarge,
            commodity: (quote.quoteRequestId as any).commodity,
            volume: (quote.quoteRequestId as any).volume,
            pickupAddress: (quote.quoteRequestId as any).pickupAddress,
          }
        : undefined,
    };

    return NextResponse.json(
      successResponse(quoteResponse),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get quote error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch quote'),
      { status: 500 }
    );
  }
}
