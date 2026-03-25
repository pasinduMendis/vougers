import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Notification types based on quote events
export type NotificationType =
  | 'quote_priced'
  | 'quote_repriced'
  | 'quote_approved'
  | 'quote_rejected'
  | 'quote_completed'
  | 'quote_lost'
  | 'quote_missed'
  | 'negotiation_requested'
  | 'negotiation_rejected'
  | 'new_quote_request'
  | 'supplier_details_added'
  | 'agent_details_added';

export type RecipientType = 'client' | 'provider';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId; // Client ID or Organization ID (for provider)
  recipientType: RecipientType;
  type: NotificationType;
  title: string;
  message: string;
  // Related entities
  quoteId?: Types.ObjectId;
  quoteRequestId?: Types.ObjectId;
  // Read status
  read: boolean;
  readAt?: Date;
  // Additional metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    recipientType: {
      type: String,
      enum: {
        values: ['client', 'provider'],
        message: 'Invalid recipient type',
      },
      required: [true, 'Recipient type is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: [
          'quote_priced',
          'quote_repriced',
          'quote_approved',
          'quote_rejected',
          'quote_completed',
          'quote_lost',
          'quote_missed',
          'negotiation_requested',
          'negotiation_rejected',
          'new_quote_request',
          'supplier_details_added',
          'agent_details_added',
        ],
        message: 'Invalid notification type',
      },
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'Quote',
      index: true,
    },
    quoteRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'QuoteRequest',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
NotificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, recipientType: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

// Static method to get notifications for a recipient
NotificationSchema.statics.getByRecipient = function (
  recipientId: Types.ObjectId | string,
  recipientType: RecipientType,
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { recipientId, recipientType };
  if (unreadOnly) {
    query.read = false;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to count unread notifications
NotificationSchema.statics.countUnread = function (
  recipientId: Types.ObjectId | string,
  recipientType: RecipientType
) {
  return this.countDocuments({ recipientId, recipientType, read: false });
};

// Static method to mark all as read
NotificationSchema.statics.markAllRead = function (
  recipientId: Types.ObjectId | string,
  recipientType: RecipientType
) {
  return this.updateMany(
    { recipientId, recipientType, read: false },
    { read: true, readAt: new Date() }
  );
};

const NotificationModel: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);

export default NotificationModel;
