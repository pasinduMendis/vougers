import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IQuoteRequest extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  portOfLoading: string;
  portOfDischarge: string;
  commodity?: string;
  volume?: string;
  pickupAddress?: string;
  extraFields?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteRequestSchema: Schema<IQuoteRequest> = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    portOfLoading: {
      type: String,
      required: [true, 'Port of loading is required'],
      trim: true,
      maxlength: [200, 'Port of loading cannot exceed 200 characters'],
    },
    portOfDischarge: {
      type: String,
      required: [true, 'Port of discharge is required'],
      trim: true,
      maxlength: [200, 'Port of discharge cannot exceed 200 characters'],
    },
    commodity: {
      type: String,
      trim: true,
      maxlength: [200, 'Commodity cannot exceed 200 characters'],
    },
    volume: {
      type: String,
      trim: true,
      maxlength: [100, 'Volume cannot exceed 100 characters'],
    },
    pickupAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Pickup address cannot exceed 500 characters'],
    },
    extraFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
QuoteRequestSchema.index({ clientId: 1, createdAt: -1 });

// Static method to find quote requests by client
QuoteRequestSchema.statics.findByClient = function (
  clientId: Types.ObjectId | string,
  options: { page?: number; limit?: number; sort?: Record<string, 1 | -1> } = {}
) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  const skip = (page - 1) * limit;

  return this.find({ clientId, isDeleted: { $ne: true } })
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to count quote requests by client
QuoteRequestSchema.statics.countByClient = function (clientId: Types.ObjectId | string) {
  return this.countDocuments({ clientId, isDeleted: { $ne: true } });
};

// Virtual to get associated quotes
QuoteRequestSchema.virtual('quotes', {
  ref: 'Quote',
  localField: '_id',
  foreignField: 'quoteRequestId',
});

// Enable virtuals in JSON
QuoteRequestSchema.set('toJSON', { virtuals: true });
QuoteRequestSchema.set('toObject', { virtuals: true });

const QuoteRequestModel: Model<IQuoteRequest> =
  (mongoose.models.QuoteRequest as Model<IQuoteRequest>) ||
  mongoose.model<IQuoteRequest>('QuoteRequest', QuoteRequestSchema);

export default QuoteRequestModel;
