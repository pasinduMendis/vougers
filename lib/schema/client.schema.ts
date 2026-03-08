import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClient extends Document {
  name: string;
  email: string;
  password: string;
  type: "client";
  companyName: string;
  companyAddress: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    type: { type: String, default: "client" },
    companyName: { type: String, required: true },
    companyAddress: { type: String, required: true },
  },
  { timestamps: true }
);

const ClientModel: Model<IClient> =
  (mongoose.models.Client as Model<IClient>) ||
  mongoose.model<IClient>("Client", ClientSchema);

export default ClientModel;
