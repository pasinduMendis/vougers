import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuote extends Document {
  clientId: string;
  portOfLoading: string;
  portOfDischarge: string;
  transitDays?: number;
  commodity?: string;
  volume?: string;
  freightCost?: number;
  pickupAddress?: string;
  extraFields?: Record<string, any>;
  status:string;
}

const quoteSchema: Schema<IQuote> = new Schema(
  {
    clientId: { type: String, required: true },
    portOfLoading: { type: String, required: true },
    portOfDischarge: { type: String, required: true },
    transitDays: Number,
    commodity: String,
    volume: String,
    freightCost: Number,
    pickupAddress: String,
    status: String,
    extraFields: {
      type: Schema.Types.Mixed,
      default: {},
    }
  },
  { timestamps: true }
);

const Quote: Model<IQuote> =
  mongoose.models.Quote || mongoose.model<IQuote>("Quote", quoteSchema);

export default Quote;
