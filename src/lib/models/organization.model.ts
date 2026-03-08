import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema<IOrganization> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [100, 'Slug cannot exceed 100 characters'],
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
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ isActive: 1 });

// Generate slug from name
OrganizationSchema.pre('validate', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// Static method to find active organizations
OrganizationSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Instance method to deactivate
OrganizationSchema.methods.deactivate = async function () {
  this.isActive = false;
  return this.save();
};

const OrganizationModel: Model<IOrganization> =
  (mongoose.models.Organization as Model<IOrganization>) ||
  mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default OrganizationModel;
