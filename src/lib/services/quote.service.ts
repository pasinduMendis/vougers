import { Types, PipelineStage } from 'mongoose';
import { connectDB } from '../db/connection';
import QuoteModel, { IQuote } from '../models/quote.model';
import {
  QuoteStatus,
  QuoteFilters,
  QuoteResponse,
  PriceQuotePayload,
} from '../types/quote.types';
import {
  paginatedResponse,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from '../types/api.types';
import { isValidTransition } from '../../constants/statuses';
import { UserType } from '../types/auth.types';

/**
 * Get quotes for a client with pagination
 */
export async function getQuotesByClient(
  clientId: string,
  filters: QuoteFilters = {}
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

  const query: Record<string, unknown> = {
    clientId: new Types.ObjectId(clientId),
  };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Build aggregation pipeline for search across related documents
  const pipeline: PipelineStage[] = [
    { $match: query },
    {
      $lookup: {
        from: 'quoterequests',
        localField: 'quoteRequestId',
        foreignField: '_id',
        as: 'quoteRequest',
      },
    },
    { $unwind: '$quoteRequest' },
    // Exclude quotes from deleted quote requests
    { $match: { 'quoteRequest.isDeleted': { $ne: true } } },
    {
      $lookup: {
        from: 'organizations',
        localField: 'serviceProviderId',
        foreignField: '_id',
        as: 'provider',
      },
    },
    { $unwind: '$provider' },
  ];

  // Add search filter if provided
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'quoteRequest.portOfLoading': { $regex: search, $options: 'i' } },
          { 'quoteRequest.portOfDischarge': { $regex: search, $options: 'i' } },
          { 'quoteRequest.commodity': { $regex: search, $options: 'i' } },
          { 'provider.name': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  // Get total count
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await QuoteModel.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Add sorting and pagination
  pipeline.push(
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        quoteRequestId: 1,
        clientId: 1,
        serviceProviderId: 1,
        freightCost: 1,
        transitDays: 1,
        pricedAt: 1,
        pricedBy: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        provider: {
          _id: '$provider._id',
          name: '$provider.name',
          slug: '$provider.slug',
        },
        quoteRequest: {
          portOfLoading: '$quoteRequest.portOfLoading',
          portOfDischarge: '$quoteRequest.portOfDischarge',
          commodity: '$quoteRequest.commodity',
          volume: '$quoteRequest.volume',
        },
      },
    }
  );

  const quotes = await QuoteModel.aggregate(pipeline);

  const data = quotes.map((q) => ({
    _id: q._id.toString(),
    quoteRequestId: q.quoteRequestId.toString(),
    clientId: q.clientId.toString(),
    serviceProviderId: q.serviceProviderId.toString(),
    provider: q.provider
      ? {
          _id: q.provider._id.toString(),
          name: q.provider.name,
          slug: q.provider.slug,
        }
      : undefined,
    quoteRequest: q.quoteRequest,
    freightCost: q.freightCost,
    transitDays: q.transitDays,
    pricedAt: q.pricedAt,
    pricedBy: q.pricedBy?.toString(),
    status: q.status,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));

  return paginatedResponse(data, page, limit, total);
}

/**
 * Get quotes for a provider with pagination
 */
export async function getQuotesByProvider(
  organizationId: string,
  filters: QuoteFilters = {}
) {
  await connectDB();

  const {
    status,
    clientId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = filters;

  // Base query without status filter (for counting all statuses)
  const baseQuery: Record<string, unknown> = {
    serviceProviderId: new Types.ObjectId(organizationId),
  };

  if (clientId) {
    baseQuery.clientId = new Types.ObjectId(clientId);
  }

  // Query with status filter (for fetching data)
  const query: Record<string, unknown> = { ...baseQuery };
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Build base pipeline for status counts (without status filter)
  const basePipeline: PipelineStage[] = [
    { $match: baseQuery },
    {
      $lookup: {
        from: 'quoterequests',
        localField: 'quoteRequestId',
        foreignField: '_id',
        as: 'quoteRequest',
      },
    },
    { $unwind: { path: '$quoteRequest', preserveNullAndEmptyArrays: true } },
    { $match: { 'quoteRequest.isDeleted': { $ne: true } } },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
  ];

  // Add search filter if provided
  if (search) {
    basePipeline.push({
      $match: {
        $or: [
          { 'quoteRequest.portOfLoading': { $regex: search, $options: 'i' } },
          { 'quoteRequest.portOfDischarge': { $regex: search, $options: 'i' } },
          { 'quoteRequest.commodity': { $regex: search, $options: 'i' } },
          { 'client.name': { $regex: search, $options: 'i' } },
          { 'client.companyName': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  // Get status counts
  const countsPipeline: PipelineStage[] = [
    ...basePipeline,
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ];
  const countsResult = await QuoteModel.aggregate(countsPipeline);

  const statusCounts: Record<string, number> = {};
  let totalCount = 0;
  countsResult.forEach((item) => {
    statusCounts[item._id] = item.count;
    totalCount += item.count;
  });

  // Build main pipeline with status filter
  const pipeline: PipelineStage[] = [
    { $match: query },
    {
      $lookup: {
        from: 'quoterequests',
        localField: 'quoteRequestId',
        foreignField: '_id',
        as: 'quoteRequest',
      },
    },
    { $unwind: { path: '$quoteRequest', preserveNullAndEmptyArrays: true } },
    { $match: { 'quoteRequest.isDeleted': { $ne: true } } },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'quoteRequest.portOfLoading': { $regex: search, $options: 'i' } },
          { 'quoteRequest.portOfDischarge': { $regex: search, $options: 'i' } },
          { 'quoteRequest.commodity': { $regex: search, $options: 'i' } },
          { 'client.name': { $regex: search, $options: 'i' } },
          { 'client.companyName': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  // Get total count for current status filter
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await QuoteModel.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Add sorting and pagination
  pipeline.push(
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        quoteRequestId: 1,
        clientId: 1,
        serviceProviderId: 1,
        freightCost: 1,
        transitDays: 1,
        pricedAt: 1,
        pricedBy: 1,
        status: 1,
        negotiationRequested: 1,
        negotiationMessage: 1,
        negotiationRequestedAt: 1,
        priceHistory: 1,
        createdAt: 1,
        updatedAt: 1,
        client: {
          _id: '$client._id',
          name: '$client.name',
          companyName: '$client.companyName',
        },
        quoteRequest: {
          portOfLoading: '$quoteRequest.portOfLoading',
          portOfDischarge: '$quoteRequest.portOfDischarge',
          commodity: '$quoteRequest.commodity',
          volume: '$quoteRequest.volume',
          pickupAddress: '$quoteRequest.pickupAddress',
          extraFields: '$quoteRequest.extraFields',
        },
      },
    }
  );

  const quotes = await QuoteModel.aggregate(pipeline);

  const data = quotes.map((q) => ({
    _id: q._id.toString(),
    quoteRequestId: q.quoteRequestId.toString(),
    clientId: q.clientId.toString(),
    serviceProviderId: q.serviceProviderId.toString(),
    client: q.client
      ? {
          _id: q.client._id.toString(),
          name: q.client.name,
          companyName: q.client.companyName,
        }
      : undefined,
    quoteRequest: q.quoteRequest,
    freightCost: q.freightCost,
    transitDays: q.transitDays,
    pricedAt: q.pricedAt,
    pricedBy: q.pricedBy?.toString(),
    status: q.status,
    negotiationRequested: q.negotiationRequested,
    negotiationMessage: q.negotiationMessage,
    negotiationRequestedAt: q.negotiationRequestedAt,
    priceHistory: q.priceHistory,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));

  return {
    ...paginatedResponse(data, page, limit, total),
    statusCounts,
    totalCount,
  };
}

/**
 * Get a single quote by ID
 */
export async function getQuoteById(
  quoteId: string
): Promise<IQuote | null> {
  await connectDB();

  return QuoteModel.findById(quoteId)
    .populate('serviceProviderId', 'name slug')
    .populate('clientId', 'name companyName')
    .populate('quoteRequestId', 'portOfLoading portOfDischarge commodity volume pickupAddress');
}

/**
 * Check if a client owns a quote
 */
export async function clientOwnsQuote(
  quoteId: string,
  clientId: string
): Promise<boolean> {
  await connectDB();

  const quote = await QuoteModel.findOne({
    _id: quoteId,
    clientId: new Types.ObjectId(clientId),
  });

  return !!quote;
}

/**
 * Check if a quote belongs to a provider's organization
 */
export async function providerOwnsQuote(
  quoteId: string,
  organizationId: string
): Promise<boolean> {
  await connectDB();

  const quote = await QuoteModel.findOne({
    _id: quoteId,
    serviceProviderId: new Types.ObjectId(organizationId),
  });

  return !!quote;
}

/**
 * Price a quote (provider action)
 * Handles both initial pricing and re-pricing after negotiation
 */
export async function priceQuote(
  quoteId: string,
  organizationId: string,
  userId: string,
  payload: PriceQuotePayload
): Promise<{ success: boolean; data?: IQuote; error?: string; isReprice?: boolean }> {
  await connectDB();

  const quote = await QuoteModel.findOne({
    _id: quoteId,
    serviceProviderId: new Types.ObjectId(organizationId),
  });

  if (!quote) {
    return { success: false, error: 'Quote not found' };
  }

  // Allow pricing if pending OR if negotiation was requested on a priced quote
  const isReprice = quote.status === 'priced' && quote.negotiationRequested;

  if (quote.status !== 'pending' && !isReprice) {
    return { success: false, error: 'Quote has already been priced' };
  }

  // If re-pricing, save current price to history
  if (isReprice && quote.freightCost !== undefined && quote.transitDays !== undefined) {
    if (!quote.priceHistory) {
      quote.priceHistory = [];
    }
    quote.priceHistory.push({
      freightCost: quote.freightCost,
      transitDays: quote.transitDays,
      pricedAt: quote.pricedAt || new Date(),
      pricedBy: quote.pricedBy || new Types.ObjectId(userId),
    });
  }

  // Set new price
  quote.freightCost = payload.freightCost;
  quote.transitDays = payload.transitDays;
  quote.pricedAt = new Date();
  quote.pricedBy = new Types.ObjectId(userId);
  quote.status = 'priced';

  // Clear negotiation flag after re-pricing
  if (isReprice) {
    quote.negotiationRequested = false;
    // Keep the message for history purposes
  }

  await quote.save();

  return { success: true, data: quote, isReprice };
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(
  quoteId: string,
  newStatus: QuoteStatus,
  actorType: UserType,
  actorId: string
): Promise<{ success: boolean; data?: IQuote; error?: string; autoRejectedCount?: number }> {
  await connectDB();

  const quote = await QuoteModel.findById(quoteId);

  if (!quote) {
    return { success: false, error: 'Quote not found' };
  }

  // Verify ownership
  if (actorType === 'client') {
    if (!quote.clientId.equals(new Types.ObjectId(actorId))) {
      return { success: false, error: 'Unauthorized' };
    }
  } else if (!quote.serviceProviderId.equals(new Types.ObjectId(actorId))) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate transition
  if (!isValidTransition(quote.status, newStatus, actorType)) {
    return {
      success: false,
      error: `Invalid status transition from '${quote.status}' to '${newStatus}'`,
    };
  }

  quote.status = newStatus;
  await quote.save();

  // Auto-reject other priced quotes when client approves one
  let autoRejectedCount = 0;
  if (actorType === 'client' && newStatus === 'approved') {
    const result = await QuoteModel.updateMany(
      {
        quoteRequestId: quote.quoteRequestId,
        _id: { $ne: quote._id },
        status: 'priced',
      },
      { status: 'rejected' }
    );
    autoRejectedCount = result.modifiedCount;
  }

  return { success: true, data: quote, autoRejectedCount };
}
