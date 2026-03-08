import mongoose, { Document, Model, Schema } from "mongoose";

export interface IServiceProvider extends Document {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyAddress: string;
  type: "sp";
  createdAt?: Date;
  updatedAt?: Date;
}

const ServiceProviderSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    companyName: { type: String, required: true },
    companyAddress: { type: String, required: true },
    type: { type: String, default: "sp" },
  },
  { timestamps: true }
);

const ServiceProviderModel: Model<IServiceProvider> =
  (mongoose.models.ServiceProvider as Model<IServiceProvider>) ||
  mongoose.model<IServiceProvider>("ServiceProvider", ServiceProviderSchema);

export default ServiceProviderModel;
