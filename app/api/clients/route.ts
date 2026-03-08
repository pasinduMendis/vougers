import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { guardProvider } from '@/src/lib/auth/guards';
import { connectDB } from '@/src/lib/db/connection';
import ClientModel from '@/src/lib/models/client.model';
import QuoteModel from '@/src/lib/models/quote.model';
import {
  errorResponse,
  parsePaginationParams,
} from '@/src/lib/types/api.types';

/**
 * GET /api/clients
 * List all clients for the provider
 * Providers can see clients who have quote requests with quotes assigned to their organization
 */
export async function GET(request: NextRequest) {
  try {
    // Require provider authentication
    const authResult = await guardProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    // Parse pagination params
    const { page, limit } = parsePaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const search = searchParams.get('search') || '';

    // Get organization ID from token
    const orgId = new Types.ObjectId(authResult.payload.organizationId);

    // Get client IDs that have quotes with this provider
    const clientIdsWithQuotes = await QuoteModel.distinct('clientId', {
      serviceProviderId: orgId,
    });

    // Build client query
    const clientQuery: Record<string, unknown> = {
      _id: { $in: clientIdsWithQuotes },
      isActive: true,
    };

    if (search) {
      clientQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await ClientModel.countDocuments(clientQuery);

    const clients = await ClientModel.find(clientQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch clients'),
      { status: 500 }
    );
  }
}
