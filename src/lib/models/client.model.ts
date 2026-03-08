import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IClient extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyAddress: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema<IClient> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    companyAddress: {
      type: String,
      required: [true, 'Company address is required'],
      trim: true,
      maxlength: [500, 'Company address cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ClientSchema.index({ email: 1 }, { unique: true });

// Static method to find client by email with password
ClientSchema.statics.findByEmailWithPassword = function (email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
};

// Instance method to deactivate (soft delete)
ClientSchema.methods.deactivate = async function () {
  this.isActive = false;
  return this.save();
};

// Don't return password in JSON
ClientSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const ClientModel: Model<IClient> =
  (mongoose.models.Client as Model<IClient>) ||
  mongoose.model<IClient>('Client', ClientSchema);

export default ClientModel;
