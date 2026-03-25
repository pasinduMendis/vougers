import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { guardProvider, getOrgId } from '@/src/lib/auth/guards';
import { connectDB } from '@/src/lib/db/connection';
import ClientModel from '@/src/lib/models/client.model';
import QuoteModel from '@/src/lib/models/quote.model';
// Import QuoteRequestModel to ensure it's registered for populate
import '@/src/lib/models/quote-request.model';
import {
  errorResponse,
  parsePaginationParams,
} from '@/src/lib/types/api.types';

/**
 * GET /api/clients/[id]
 * Get a specific client with their quotes for this provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require provider authentication
    const authResult = await guardProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Bad Request', 'Invalid client ID'),
        { status: 400 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const orgId = getOrgId(authResult.payload);

    // Parse pagination params for quotes
    const { page, limit } = parsePaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const status = searchParams.get('status') || undefined;

    // Get the client
    const client = await ClientModel.findOne({
      _id: id,
      isActive: true,
    })
      .select('-password')
      .lean();

    if (!client) {
      return NextResponse.json(
        errorResponse('Not Found', 'Client not found'),
        { status: 404 }
      );
    }

    // Build quote query - get quotes for this client from this provider
    const clientObjectId = new Types.ObjectId(id);
    const baseQuery = {
      serviceProviderId: orgId,
      clientId: clientObjectId,
    };

    const quoteQuery: Record<string, unknown> = { ...baseQuery };

    if (status) {
      quoteQuery.status = status;
    }

    // Get status counts for all statuses (without status filter)
    const statusCountsAggregation = await QuoteModel.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts: Record<string, number> = {};
    let totalCount = 0;
    statusCountsAggregation.forEach((item: { _id: string; count: number }) => {
      statusCounts[item._id] = item.count;
      totalCount += item.count;
    });

    // Get total count for current filtered query
    const total = await QuoteModel.countDocuments(quoteQuery);

    // Get paginated quotes with populated quote request
    const quotes = await QuoteModel.find(quoteQuery)
      .populate({
        path: 'quoteRequestId',
        select: 'portOfLoading portOfDischarge commodity volume pickupAddress createdAt',
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Transform quotes to include quote request details
    const transformedQuotes = quotes.map((quote) => ({
      _id: quote._id,
      status: quote.status,
      freightCost: quote.freightCost,
      transitDays: quote.transitDays,
      pricedAt: quote.pricedAt,
      negotiationRequested: quote.negotiationRequested,
      negotiationMessage: quote.negotiationMessage,
      negotiationRequestedAt: quote.negotiationRequestedAt,
      priceHistory: quote.priceHistory,
      supplierDetails: quote.supplierDetails,
      supplierDetailsAddedAt: quote.supplierDetailsAddedAt,
      agentDetails: quote.agentDetails,
      agentDetailsAddedAt: quote.agentDetailsAddedAt,
      agentDetailsAddedBy: quote.agentDetailsAddedBy?.toString(),
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      quoteRequest: quote.quoteRequestId,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          client,
          quotes: transformedQuotes,
          statusCounts,
          totalCount,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get client error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch client'),
      { status: 500 }
    );
  }
}
