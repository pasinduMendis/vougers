import { Types } from 'mongoose';
import { connectDB } from '../db/connection';
import QuoteRequestModel, { IQuoteRequest } from '../models/quote-request.model';
import QuoteModel from '../models/quote.model';
import OrganizationModel from '../models/organization.model';
import {
  CreateQuoteRequestPayload,
  QuoteRequestResponse,
  QuoteResponse,
  CreateQuoteRequestResponse,
  QuoteRequestWithQuotes,
  QuoteRequestFilters,
} from '../types/quote.types';
import { paginatedResponse, DEFAULT_PAGE, DEFAULT_LIMIT } from '../types/api.types';

/**
 * Create a new quote request and send to providers
 */
export async function createQuoteRequest(
  clientId: string,
  payload: CreateQuoteRequestPayload
): Promise<{ success: boolean; data?: CreateQuoteRequestResponse; error?: string }> {
  await connectDB();

  const clientObjectId = new Types.ObjectId(clientId);

  // Determine target providers
  let targetProviderIds: Types.ObjectId[];

  if (payload.serviceProviderIds && payload.serviceProviderIds.length > 0) {
    // Use specified providers - validate they exist and are active
    const validProviders = await OrganizationModel.find({
      _id: { $in: payload.serviceProviderIds },
      isActive: true,
    }).select('_id');

    if (validProviders.length === 0) {
      return {
        success: false,
        error: 'No valid active providers found from the provided IDs',
      };
    }

    targetProviderIds = validProviders.map((p) => p._id as Types.ObjectId);
  } else {
    // Send to all active providers
    const allProviders = await OrganizationModel.find({ isActive: true }).select('_id');

    if (allProviders.length === 0) {
      return {
        success: false,
        error: 'No active service providers available',
      };
    }

    targetProviderIds = allProviders.map((p) => p._id as Types.ObjectId);
  }

  // Create the quote request
  const quoteRequest = await QuoteRequestModel.create({
    clientId: clientObjectId,
    portOfLoading: payload.portOfLoading,
    portOfDischarge: payload.portOfDischarge,
    commodity: payload.commodity,
    volume: payload.volume,
    pickupAddress: payload.pickupAddress,
    extraFields: payload.extraFields,
  });

  // Create individual quotes for each provider
  const quoteDocs = targetProviderIds.map((providerId) => ({
    quoteRequestId: quoteRequest._id,
    clientId: clientObjectId,
    serviceProviderId: providerId,
    status: 'pending' as const,
  }));

  const createdQuotes = await QuoteModel.insertMany(quoteDocs);

  // Format response
  const quoteRequestResponse: QuoteRequestResponse = {
    _id: quoteRequest._id.toString(),
    clientId: quoteRequest.clientId.toString(),
    portOfLoading: quoteRequest.portOfLoading,
    portOfDischarge: quoteRequest.portOfDischarge,
    commodity: quoteRequest.commodity,
    volume: quoteRequest.volume,
    pickupAddress: quoteRequest.pickupAddress,
    extraFields: quoteRequest.extraFields,
    createdAt: quoteRequest.createdAt,
    updatedAt: quoteRequest.updatedAt,
  };

  const quotesResponse: QuoteResponse[] = createdQuotes.map((q) => ({
    _id: q._id.toString(),
    quoteRequestId: q.quoteRequestId.toString(),
    clientId: q.clientId.toString(),
    serviceProviderId: q.serviceProviderId.toString(),
    status: q.status,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));

  return {
    success: true,
    data: {
      quoteRequest: quoteRequestResponse,
      quotes: quotesResponse,
      sentToProviders: targetProviderIds.length,
    },
  };
}

/**
 * Get quote requests for a client with pagination
 */
export async function getQuoteRequestsByClient(
  clientId: string,
  filters: QuoteRequestFilters = {}
) {
  await connectDB();

  const {
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = filters;

  const clientObjectId = new Types.ObjectId(clientId);

  // If filtering by status, first find quote request IDs that have quotes with that status
  let quoteRequestIdsWithStatus: Types.ObjectId[] | null = null;
  if (status) {
    const quotesWithStatus = await QuoteModel.find({
      clientId: clientObjectId,
      status: status,
    }).distinct('quoteRequestId');
    quoteRequestIdsWithStatus = quotesWithStatus as Types.ObjectId[];
  }

  const query: Record<string, unknown> = {
    clientId: clientObjectId,
    isDeleted: { $ne: true },
  };

  // Filter by quote request IDs if status filter is applied
  if (quoteRequestIdsWithStatus !== null) {
    query._id = { $in: quoteRequestIdsWithStatus };
  }

  // Search in ports and commodity
  if (search) {
    query.$or = [
      { portOfLoading: { $regex: search, $options: 'i' } },
      { portOfDischarge: { $regex: search, $options: 'i' } },
      { commodity: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [quoteRequests, total] = await Promise.all([
    QuoteRequestModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
    QuoteRequestModel.countDocuments(query),
  ]);

  const data: QuoteRequestResponse[] = quoteRequests.map((qr) => ({
    _id: qr._id.toString(),
    clientId: qr.clientId.toString(),
    portOfLoading: qr.portOfLoading,
    portOfDischarge: qr.portOfDischarge,
    commodity: qr.commodity,
    volume: qr.volume,
    pickupAddress: qr.pickupAddress,
    extraFields: qr.extraFields,
    createdAt: qr.createdAt,
    updatedAt: qr.updatedAt,
  }));

  return paginatedResponse(data, page, limit, total);
}

/**
 * Get a single quote request with all associated quotes
 */
export async function getQuoteRequestById(
  quoteRequestId: string,
  clientId: string
): Promise<{ success: boolean; data?: QuoteRequestWithQuotes; error?: string }> {
  await connectDB();

  // Find the quote request (exclude deleted)
  const quoteRequest = await QuoteRequestModel.findOne({
    _id: quoteRequestId,
    clientId: new Types.ObjectId(clientId),
    isDeleted: { $ne: true },
  }).lean();

  if (!quoteRequest) {
    return {
      success: false,
      error: 'Quote request not found',
    };
  }

  // Get all quotes for this request with provider info
  const quotes = await QuoteModel.find({
    quoteRequestId: new Types.ObjectId(quoteRequestId),
  })
    .populate('serviceProviderId', 'name slug')
    .sort({ createdAt: 1 })
    .lean();

  const quoteRequestResponse: QuoteRequestResponse = {
    _id: quoteRequest._id.toString(),
    clientId: quoteRequest.clientId.toString(),
    portOfLoading: quoteRequest.portOfLoading,
    portOfDischarge: quoteRequest.portOfDischarge,
    commodity: quoteRequest.commodity,
    volume: quoteRequest.volume,
    pickupAddress: quoteRequest.pickupAddress,
    extraFields: quoteRequest.extraFields,
    createdAt: quoteRequest.createdAt,
    updatedAt: quoteRequest.updatedAt,
  };

  const quotesResponse: QuoteResponse[] = quotes.map((q) => {
    const provider = q.serviceProviderId as unknown as {
      _id: Types.ObjectId;
      name: string;
      slug: string;
    };

    return {
      _id: q._id.toString(),
      quoteRequestId: q.quoteRequestId.toString(),
      clientId: q.clientId.toString(),
      serviceProviderId: provider._id.toString(),
      provider: {
        _id: provider._id.toString(),
        name: provider.name,
        slug: provider.slug,
      },
      freightCost: q.freightCost,
      transitDays: q.transitDays,
      pricedAt: q.pricedAt,
      pricedBy: q.pricedBy?.toString(),
      status: q.status,
      negotiationRequested: q.negotiationRequested,
      negotiationMessage: q.negotiationMessage,
      negotiationRequestedAt: q.negotiationRequestedAt,
      priceHistory: q.priceHistory?.map((h) => ({
        freightCost: h.freightCost,
        transitDays: h.transitDays,
        pricedAt: h.pricedAt,
        pricedBy: h.pricedBy.toString(),
      })),
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };
  });

  return {
    success: true,
    data: {
      ...quoteRequestResponse,
      quotes: quotesResponse,
    },
  };
}

/**
 * Cancel (soft delete) a quote request
 * Only allowed if no quotes have been approved
 */
export async function cancelQuoteRequest(
  quoteRequestId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  const clientObjectId = new Types.ObjectId(clientId);
  const quoteRequestObjectId = new Types.ObjectId(quoteRequestId);

  // Find the quote request and verify ownership
  const quoteRequest = await QuoteRequestModel.findOne({
    _id: quoteRequestObjectId,
    clientId: clientObjectId,
    isDeleted: { $ne: true },
  });

  if (!quoteRequest) {
    return {
      success: false,
      error: 'Quote request not found',
    };
  }

  // Check if any quotes have been approved
  const approvedQuote = await QuoteModel.findOne({
    quoteRequestId: quoteRequestObjectId,
    status: 'approved',
  });

  if (approvedQuote) {
    return {
      success: false,
      error: 'Cannot cancel a quote request that has an approved quote',
    };
  }

  // Soft delete the quote request
  const updateResult = await QuoteRequestModel.findOneAndUpdate(
    { _id: quoteRequestObjectId },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!updateResult) {
    return {
      success: false,
      error: 'Failed to cancel quote request',
    };
  }

  return {
    success: true,
  };
}
