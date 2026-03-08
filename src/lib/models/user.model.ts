import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { ProviderRole } from '../types/auth.types';

export interface IUser extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: ProviderRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
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
    role: {
      type: String,
      enum: {
        values: ['admin', 'view_edit', 'view_only'],
        message: 'Role must be admin, view_edit, or view_only',
      },
      default: 'view_only',
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
UserSchema.index({ organizationId: 1 });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, isActive: 1 });

// Static method to find users by organization
UserSchema.statics.findByOrganization = function (organizationId: Types.ObjectId | string) {
  return this.find({ organizationId, isActive: true }).sort({ name: 1 });
};

// Static method to find user by email with password
UserSchema.statics.findByEmailWithPassword = function (email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// Instance method to check if user is admin
UserSchema.methods.isAdmin = function (): boolean {
  return this.role === 'admin';
};

// Instance method to check if user can edit
UserSchema.methods.canEdit = function (): boolean {
  return this.role === 'admin' || this.role === 'view_edit';
};

// Instance method to deactivate (soft delete)
UserSchema.methods.deactivate = async function () {
  this.isActive = false;
  return this.save();
};

// Don't return password in JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default UserModel;
