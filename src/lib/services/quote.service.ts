import { Types, PipelineStage } from 'mongoose';
import { connectDB } from '../db/connection';
import QuoteModel, { IQuote } from '../models/quote.model';
import OrganizationModel from '../models/organization.model';
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
import {
  emitQuotePriced,
  emitQuoteRepriced,
  emitQuoteStatusChanged,
  emitQuoteStatusChangedToProviders,
  emitNegotiationRejected,
} from './socket.service';
import {
  notifyQuotePriced,
  notifyQuoteRepriced,
  notifyQuoteApproved,
  notifyQuoteRejected,
  notifyQuoteCompleted,
  notifyQuoteLost,
  notifyQuoteMissed,
  notifyNegotiationRejected,
  notifySupplierDetailsAdded,
  notifyAgentDetailsAdded,
} from './notification.service';
import QuoteRequestModel from '../models/quote-request.model';
import ClientModel from '../models/client.model';

// Helper to format currency for notifications
function formatCurrencySimple(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

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
        negotiationRequested: 1,
        negotiationMessage: 1,
        negotiationRequestedAt: 1,
        priceHistory: 1,
        supplierDetails: 1,
        supplierDetailsAddedAt: 1,
        agentDetails: 1,
        agentDetailsAddedAt: 1,
        agentDetailsAddedBy: 1,
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
    negotiationRequested: q.negotiationRequested,
    negotiationMessage: q.negotiationMessage,
    negotiationRequestedAt: q.negotiationRequestedAt,
    priceHistory: q.priceHistory,
    supplierDetails: q.supplierDetails,
    supplierDetailsAddedAt: q.supplierDetailsAddedAt,
    agentDetails: q.agentDetails,
    agentDetailsAddedAt: q.agentDetailsAddedAt,
    agentDetailsAddedBy: q.agentDetailsAddedBy?.toString(),
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
        supplierDetails: 1,
        supplierDetailsAddedAt: 1,
        agentDetails: 1,
        agentDetailsAddedAt: 1,
        agentDetailsAddedBy: 1,
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
    supplierDetails: q.supplierDetails,
    supplierDetailsAddedAt: q.supplierDetailsAddedAt,
    agentDetails: q.agentDetails,
    agentDetailsAddedAt: q.agentDetailsAddedAt,
    agentDetailsAddedBy: q.agentDetailsAddedBy?.toString(),
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

  // Store previous values before updating (for reprice event)
  const previousFreightCost = isReprice ? quote.priceHistory?.[quote.priceHistory.length - 1]?.freightCost : undefined;
  const previousTransitDays = isReprice ? quote.priceHistory?.[quote.priceHistory.length - 1]?.transitDays : undefined;

  // Clear negotiation flag after re-pricing
  if (isReprice) {
    quote.negotiationRequested = false;
    // Keep the message for history purposes
  }

  await quote.save();

  // Get provider name for the event payload
  const provider = await OrganizationModel.findById(organizationId).select('name').lean();
  const providerName = provider?.name || 'Unknown Provider';

  // Emit socket event
  const eventPayload = {
    quoteId: quote._id.toString(),
    quoteRequestId: quote.quoteRequestId.toString(),
    clientId: quote.clientId.toString(),
    serviceProviderId: organizationId,
    providerName,
    freightCost: payload.freightCost,
    transitDays: payload.transitDays,
    pricedAt: quote.pricedAt || new Date(),
  };

  if (isReprice && previousFreightCost !== undefined && previousTransitDays !== undefined) {
    emitQuoteRepriced({
      ...eventPayload,
      previousFreightCost,
      previousTransitDays,
    });
  } else {
    emitQuotePriced(eventPayload);
  }

  // Get quote request for route info
  const quoteRequest = await QuoteRequestModel.findById(quote.quoteRequestId)
    .select('portOfLoading portOfDischarge')
    .lean();
  const route = quoteRequest
    ? `${quoteRequest.portOfLoading} → ${quoteRequest.portOfDischarge}`
    : 'Unknown Route';

  // Create notification for client
  if (isReprice) {
    notifyQuoteRepriced({
      clientId: quote.clientId.toString(),
      quoteId: quote._id.toString(),
      quoteRequestId: quote.quoteRequestId.toString(),
      providerName,
      route,
      price: formatCurrencySimple(payload.freightCost),
    }).catch((err) => console.error('Failed to create reprice notification:', err));
  } else {
    notifyQuotePriced({
      clientId: quote.clientId.toString(),
      quoteId: quote._id.toString(),
      quoteRequestId: quote.quoteRequestId.toString(),
      providerName,
      route,
      price: formatCurrencySimple(payload.freightCost),
    }).catch((err) => console.error('Failed to create price notification:', err));
  }

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
): Promise<{ success: boolean; data?: IQuote; error?: string; autoLostCount?: number; autoMissedCount?: number }> {
  await connectDB();

  const quote = await QuoteModel.findById(quoteId);

  if (!quote) {
    return { success: false, error: 'Quote not found' };
  }

  // Store old status for event
  const oldStatus = quote.status;

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

  // Auto-update other quotes when client approves one
  // - priced quotes become 'lost' (provider priced but wasn't chosen)
  // - pending quotes become 'missed' (provider didn't price in time)
  let autoLostCount = 0;
  let autoMissedCount = 0;
  const affectedProviderIds: string[] = [];
  let lostQuotesData: { _id: Types.ObjectId; serviceProviderId: Types.ObjectId }[] = [];
  let missedQuotesData: { _id: Types.ObjectId; serviceProviderId: Types.ObjectId }[] = [];

  if (actorType === 'client' && newStatus === 'approved') {
    // Get provider IDs of quotes that will be marked as lost
    lostQuotesData = await QuoteModel.find({
      quoteRequestId: quote.quoteRequestId,
      _id: { $ne: quote._id },
      status: 'priced',
    }).select('_id serviceProviderId').lean();

    // Get provider IDs of quotes that will be marked as missed
    missedQuotesData = await QuoteModel.find({
      quoteRequestId: quote.quoteRequestId,
      _id: { $ne: quote._id },
      status: 'pending',
    }).select('_id serviceProviderId').lean();

    // Collect all affected provider IDs
    lostQuotesData.forEach(q => affectedProviderIds.push(q.serviceProviderId.toString()));
    missedQuotesData.forEach(q => affectedProviderIds.push(q.serviceProviderId.toString()));

    // Mark priced quotes as 'lost'
    const lostResult = await QuoteModel.updateMany(
      {
        quoteRequestId: quote.quoteRequestId,
        _id: { $ne: quote._id },
        status: 'priced',
      },
      { status: 'lost' }
    );
    autoLostCount = lostResult.modifiedCount;

    // Mark pending quotes as 'missed'
    const missedResult = await QuoteModel.updateMany(
      {
        quoteRequestId: quote.quoteRequestId,
        _id: { $ne: quote._id },
        status: 'pending',
      },
      { status: 'missed' }
    );
    autoMissedCount = missedResult.modifiedCount;
  }

  // Emit socket event for status change
  const statusChangePayload = {
    quoteId: quote._id.toString(),
    quoteRequestId: quote.quoteRequestId.toString(),
    clientId: quote.clientId.toString(),
    serviceProviderId: quote.serviceProviderId.toString(),
    oldStatus,
    newStatus,
    autoLostCount,
    autoMissedCount,
  };

  emitQuoteStatusChanged(statusChangePayload);

  // If quote was approved, notify all affected providers about their lost/missed status
  if (newStatus === 'approved' && affectedProviderIds.length > 0) {
    emitQuoteStatusChangedToProviders(affectedProviderIds, {
      ...statusChangePayload,
      newStatus: 'lost', // They'll see their quote as lost or missed
    });
  }

  // Get quote request for route info
  const quoteRequestForNotif = await QuoteRequestModel.findById(quote.quoteRequestId)
    .select('portOfLoading portOfDischarge')
    .lean();
  const routeForNotif = quoteRequestForNotif
    ? `${quoteRequestForNotif.portOfLoading} → ${quoteRequestForNotif.portOfDischarge}`
    : 'Unknown Route';

  // Create notifications based on status change
  if (actorType === 'client' && newStatus === 'approved') {
    // Notify the winning provider
    notifyQuoteApproved({
      providerId: quote.serviceProviderId.toString(),
      quoteId: quote._id.toString(),
      quoteRequestId: quote.quoteRequestId.toString(),
      clientName: 'Client', // Will be populated from client lookup
      route: routeForNotif,
    }).catch((err) => console.error('Failed to create approval notification:', err));

    // Notify lost providers
    for (const lostQuote of lostQuotesData) {
      notifyQuoteLost({
        providerId: lostQuote.serviceProviderId.toString(),
        quoteId: lostQuote._id.toString(),
        quoteRequestId: quote.quoteRequestId.toString(),
        route: routeForNotif,
      }).catch((err) => console.error('Failed to create lost notification:', err));
    }

    // Notify missed providers
    for (const missedQuote of missedQuotesData) {
      notifyQuoteMissed({
        providerId: missedQuote.serviceProviderId.toString(),
        quoteId: missedQuote._id.toString(),
        quoteRequestId: quote.quoteRequestId.toString(),
        route: routeForNotif,
      }).catch((err) => console.error('Failed to create missed notification:', err));
    }
  } else if (actorType === 'client' && newStatus === 'rejected') {
    // Notify provider that their quote was rejected
    notifyQuoteRejected({
      providerId: quote.serviceProviderId.toString(),
      quoteId: quote._id.toString(),
      quoteRequestId: quote.quoteRequestId.toString(),
      clientName: 'Client',
      route: routeForNotif,
    }).catch((err) => console.error('Failed to create rejection notification:', err));
  } else if (actorType === 'provider' && newStatus === 'completed') {
    // Notify client that shipment is completed
    notifyQuoteCompleted({
      clientId: quote.clientId.toString(),
      quoteId: quote._id.toString(),
      quoteRequestId: quote.quoteRequestId.toString(),
      route: routeForNotif,
    }).catch((err) => console.error('Failed to create completion notification:', err));
  }

  return { success: true, data: quote, autoLostCount, autoMissedCount };
}

/**
 * Reject negotiation request (provider action)
 * Clears negotiation request while keeping current price
 */
export async function rejectNegotiation(
  quoteId: string,
  organizationId: string
): Promise<{ success: boolean; data?: IQuote; error?: string }> {
  await connectDB();

  const quote = await QuoteModel.findOne({
    _id: quoteId,
    serviceProviderId: new Types.ObjectId(organizationId),
  });

  if (!quote) {
    return { success: false, error: 'Quote not found' };
  }

  // Can only reject negotiation if there's a pending negotiation request
  if (!quote.negotiationRequested) {
    return { success: false, error: 'No negotiation request to reject' };
  }

  // Must be a priced quote to have negotiation
  if (quote.status !== 'priced') {
    return { success: false, error: 'Quote must be in priced status' };
  }

  // Clear negotiation flags but keep the price
  quote.negotiationRequested = false;
  quote.negotiationRejectedAt = new Date();
  // Keep negotiationMessage for history/audit purposes

  await quote.save();

  // Get provider name for the event payload
  const provider = await OrganizationModel.findById(organizationId).select('name').lean();
  const providerName = provider?.name || 'Unknown Provider';

  // Emit socket event to notify client
  emitNegotiationRejected({
    quoteId: quote._id.toString(),
    quoteRequestId: quote.quoteRequestId.toString(),
    clientId: quote.clientId.toString(),
    serviceProviderId: organizationId,
    providerName,
    freightCost: quote.freightCost || 0,
    transitDays: quote.transitDays || 0,
    rejectedAt: quote.negotiationRejectedAt,
  });

  // Get quote request for route info and create notification
  const quoteRequestForNotif = await QuoteRequestModel.findById(quote.quoteRequestId)
    .select('portOfLoading portOfDischarge')
    .lean();
  const routeForNotif = quoteRequestForNotif
    ? `${quoteRequestForNotif.portOfLoading} → ${quoteRequestForNotif.portOfDischarge}`
    : 'Unknown Route';

  notifyNegotiationRejected({
    clientId: quote.clientId.toString(),
    quoteId: quote._id.toString(),
    quoteRequestId: quote.quoteRequestId.toString(),
    providerName,
    route: routeForNotif,
  }).catch((err) => console.error('Failed to create negotiation rejected notification:', err));

  return { success: true, data: quote };
}

/**
 * Add supplier details to an approved quote (client action)
 */
export async function addSupplierDetails(
  quoteId: string,
  clientId: string,
  supplierDetails: string
): Promise<{ success: boolean; data?: IQuote; error?: string }> {
  await connectDB();

  const quote = await QuoteModel.findOne({
    _id: quoteId,
    clientId: new Types.ObjectId(clientId),
  });

  if (!quote) {
    return { success: false, error: 'Quote not found' };
  }

  // Can only add supplier details to approved quotes
  if (quote.status !== 'approved') {
    return { success: false, error: 'Supplier details can only be added to approved quotes' };
  }

  // Update supplier details
  quote.supplierDetails = supplierDetails;
  quote.supplierDetailsAddedAt = new Date();

  await quote.save();

  // Get client name for notification
  const client = await ClientModel.findById(clientId).select('name').lean();
  const clientName = client?.name || 'Client';

  // Get quote request for route info
  const quoteRequest = await QuoteRequestModel.findById(quote.quoteRequestId)
    .select('portOfLoading portOfDischarge')
    .lean();
  const route = quoteRequest
    ? `${quoteRequest.portOfLoading} → ${quoteRequest.portOfDischarge}`
    : 'Unknown Route';

  // Notify the provider
  notifySupplierDetailsAdded({
    providerId: quote.serviceProviderId.toString(),
    quoteId: quote._id.toString(),
    quoteRequestId: quote.quoteRequestId.toString(),
    clientName,
    route,
  }).catch((err) => console.error('Failed to create supplier details notification:', err));

  return { success: true, data: quote };
}

/**
 * Add agent details to an approved quote with supplier details (provider action)
 * This completes the quote workflow and moves it to completed status
 */
export async function addAgentDetails(
  quoteId: string,
  organizationId: string,
  userId: string,
  agentDetails: string
): Promise<{ success: boolean; data?: IQuote; error?: string }> {
  await connectDB();

  // First, find the quote to validate conditions
  const existingQuote = await QuoteModel.findOne({
    _id: quoteId,
    serviceProviderId: new Types.ObjectId(organizationId),
  });

  if (!existingQuote) {
    return { success: false, error: 'Quote not found' };
  }

  // Can only add agent details to approved quotes
  if (existingQuote.status !== 'approved') {
    return { success: false, error: 'Agent details can only be added to approved quotes' };
  }

  // Client must have submitted supplier details first
  if (!existingQuote.supplierDetails) {
    return { success: false, error: 'Client must submit supplier details first' };
  }

  // Use findOneAndUpdate to ensure atomic update and get the updated document
  const updatedQuote = await QuoteModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(quoteId),
      serviceProviderId: new Types.ObjectId(organizationId),
      status: 'approved',
    },
    {
      $set: {
        agentDetails: agentDetails,
        agentDetailsAddedAt: new Date(),
        agentDetailsAddedBy: new Types.ObjectId(userId),
        status: 'completed',
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedQuote) {
    return { success: false, error: 'Failed to update quote' };
  }

  // Get provider name for notification
  const provider = await OrganizationModel.findById(organizationId).select('name').lean();
  const providerName = provider?.name || 'Provider';

  // Get quote request for route info
  const quoteRequest = await QuoteRequestModel.findById(updatedQuote.quoteRequestId)
    .select('portOfLoading portOfDischarge')
    .lean();
  const route = quoteRequest
    ? `${quoteRequest.portOfLoading} → ${quoteRequest.portOfDischarge}`
    : 'Unknown Route';

  // Notify the client that shipment is completed
  notifyAgentDetailsAdded({
    clientId: updatedQuote.clientId.toString(),
    quoteId: updatedQuote._id.toString(),
    quoteRequestId: updatedQuote.quoteRequestId.toString(),
    providerName,
    route,
  }).catch((err) => console.error('Failed to create agent details notification:', err));

  // Also emit status changed event for real-time updates
  emitQuoteStatusChanged({
    quoteId: updatedQuote._id.toString(),
    quoteRequestId: updatedQuote.quoteRequestId.toString(),
    clientId: updatedQuote.clientId.toString(),
    serviceProviderId: updatedQuote.serviceProviderId.toString(),
    oldStatus: 'approved',
    newStatus: 'completed',
    autoLostCount: 0,
    autoMissedCount: 0,
  });

  return { success: true, data: updatedQuote };
}
