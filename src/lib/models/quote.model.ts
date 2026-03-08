import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { QuoteStatus } from '../types/quote.types';

// Price history entry for tracking negotiation changes
export interface PriceHistoryEntry {
  freightCost: number;
  transitDays: number;
  pricedAt: Date;
  pricedBy: Types.ObjectId;
}

export interface IQuote extends Document {
  _id: Types.ObjectId;
  quoteRequestId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
  freightCost?: number;
  transitDays?: number;
  pricedAt?: Date;
  pricedBy?: Types.ObjectId;
  status: QuoteStatus;
  // Negotiation fields
  negotiationRequested?: boolean;
  negotiationMessage?: string;
  negotiationRequestedAt?: Date;
  priceHistory?: PriceHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema: Schema<IQuote> = new Schema(
  {
    quoteRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'QuoteRequest',
      required: [true, 'Quote request ID is required'],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Service provider ID is required'],
      index: true,
    },
    freightCost: {
      type: Number,
      min: [0, 'Freight cost cannot be negative'],
    },
    transitDays: {
      type: Number,
      min: [1, 'Transit days must be at least 1'],
    },
    pricedAt: {
      type: Date,
    },
    pricedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'priced', 'approved', 'rejected', 'completed'],
        message: 'Invalid status value',
      },
      default: 'pending',
      index: true,
    },
    // Negotiation fields
    negotiationRequested: {
      type: Boolean,
      default: false,
    },
    negotiationMessage: {
      type: String,
      maxlength: [500, 'Negotiation message cannot exceed 500 characters'],
    },
    negotiationRequestedAt: {
      type: Date,
    },
    priceHistory: [
      {
        freightCost: { type: Number, required: true },
        transitDays: { type: Number, required: true },
        pricedAt: { type: Date, required: true },
        pricedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
QuoteSchema.index({ quoteRequestId: 1 });
QuoteSchema.index({ clientId: 1, status: 1 });
QuoteSchema.index({ serviceProviderId: 1, status: 1 });
QuoteSchema.index({ createdAt: -1 });
QuoteSchema.index({ serviceProviderId: 1, createdAt: -1 });

// Static method to find quotes by quote request
QuoteSchema.statics.findByQuoteRequest = function (quoteRequestId: Types.ObjectId | string) {
  return this.find({ quoteRequestId })
    .populate('serviceProviderId', 'name slug')
    .sort({ createdAt: 1 });
};

// Static method to find quotes by client
QuoteSchema.statics.findByClient = function (
  clientId: Types.ObjectId | string,
  options: { status?: QuoteStatus; page?: number; limit?: number; sort?: Record<string, 1 | -1> } = {}
) {
  const { status, page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { clientId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('serviceProviderId', 'name slug')
    .populate('quoteRequestId', 'portOfLoading portOfDischarge commodity volume')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to find quotes by service provider
QuoteSchema.statics.findByProvider = function (
  serviceProviderId: Types.ObjectId | string,
  options: { status?: QuoteStatus; page?: number; limit?: number; sort?: Record<string, 1 | -1> } = {}
) {
  const { status, page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { serviceProviderId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('clientId', 'name companyName')
    .populate('quoteRequestId', 'portOfLoading portOfDischarge commodity volume pickupAddress')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to count quotes by provider
QuoteSchema.statics.countByProvider = function (
  serviceProviderId: Types.ObjectId | string,
  status?: QuoteStatus
) {
  const query: Record<string, unknown> = { serviceProviderId };
  if (status) {
    query.status = status;
  }
  return this.countDocuments(query);
};

// Static method to count quotes by client
QuoteSchema.statics.countByClient = function (
  clientId: Types.ObjectId | string,
  status?: QuoteStatus
) {
  const query: Record<string, unknown> = { clientId };
  if (status) {
    query.status = status;
  }
  return this.countDocuments(query);
};

// Instance method to price the quote
QuoteSchema.methods.setPrice = async function (
  freightCost: number,
  transitDays: number,
  pricedBy: Types.ObjectId
) {
  this.freightCost = freightCost;
  this.transitDays = transitDays;
  this.pricedAt = new Date();
  this.pricedBy = pricedBy;
  this.status = 'priced';
  return this.save();
};

// Instance method to update status
QuoteSchema.methods.updateStatus = async function (newStatus: QuoteStatus) {
  this.status = newStatus;
  return this.save();
};

const QuoteModel: Model<IQuote> =
  (mongoose.models.Quote as Model<IQuote>) ||
  mongoose.model<IQuote>('Quote', QuoteSchema);

export default QuoteModel;
