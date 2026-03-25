import { Types } from 'mongoose';
import { connectDB } from '../db/connection';
import NotificationModel, {
  INotification,
  NotificationType,
  RecipientType,
} from '../models/notification.model';
import {
  paginatedResponse,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from '../types/api.types';
import { SOCKET_EVENTS, NotificationPayload } from '../types/socket.types';
import { emitToClient, emitToProvider } from './socket.service';

// Notification content templates
const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  { title: string; message: (data: Record<string, string>) => string }
> = {
  quote_priced: {
    title: 'Quote Priced',
    message: (data) =>
      `${data.providerName} has priced your quote for ${data.route} at ${data.price}`,
  },
  quote_repriced: {
    title: 'Price Revised',
    message: (data) =>
      `${data.providerName} has revised their price for ${data.route} to ${data.price}`,
  },
  quote_approved: {
    title: 'Quote Approved',
    message: (data) =>
      `${data.clientName} has approved your quote for ${data.route}`,
  },
  quote_rejected: {
    title: 'Quote Rejected',
    message: (data) =>
      `${data.clientName} has rejected your quote for ${data.route}`,
  },
  quote_completed: {
    title: 'Shipment Completed',
    message: (data) =>
      `Your shipment for ${data.route} has been marked as completed`,
  },
  quote_lost: {
    title: 'Quote Lost',
    message: (data) =>
      `Another provider was selected for the ${data.route} shipment`,
  },
  quote_missed: {
    title: 'Quote Missed',
    message: (data) =>
      `You missed the opportunity to price the ${data.route} shipment`,
  },
  negotiation_requested: {
    title: 'Negotiation Requested',
    message: (data) =>
      `${data.clientName} has requested a price revision for ${data.route}`,
  },
  negotiation_rejected: {
    title: 'Negotiation Declined',
    message: (data) =>
      `${data.providerName} has declined your negotiation request for ${data.route}`,
  },
  new_quote_request: {
    title: 'New Quote Request',
    message: (data) =>
      `${data.clientName} has requested a quote for ${data.route}`,
  },
  supplier_details_added: {
    title: 'Supplier Details Added',
    message: (data) =>
      `${data.clientName} has added supplier details for ${data.route}`,
  },
  agent_details_added: {
    title: 'Shipment Completed',
    message: (data) =>
      `${data.providerName} has added agent details and completed the shipment for ${data.route}`,
  },
};

interface CreateNotificationParams {
  recipientId: string;
  recipientType: RecipientType;
  type: NotificationType;
  data: Record<string, string>;
  quoteId?: string;
  quoteRequestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification and emit it via socket
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<INotification> {
  await connectDB();

  const { recipientId, recipientType, type, data, quoteId, quoteRequestId, metadata } =
    params;

  const template = NOTIFICATION_TEMPLATES[type];
  const title = template.title;
  const message = template.message(data);

  const notification = await NotificationModel.create({
    recipientId: new Types.ObjectId(recipientId),
    recipientType,
    type,
    title,
    message,
    quoteId: quoteId ? new Types.ObjectId(quoteId) : undefined,
    quoteRequestId: quoteRequestId ? new Types.ObjectId(quoteRequestId) : undefined,
    metadata,
  });

  // Emit socket event
  const payload: NotificationPayload = {
    _id: notification._id.toString(),
    recipientId: notification.recipientId.toString(),
    recipientType: notification.recipientType,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    quoteId: notification.quoteId?.toString(),
    quoteRequestId: notification.quoteRequestId?.toString(),
    read: notification.read,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
  };

  // Emit to the correct room based on recipient type
  if (recipientType === 'client') {
    emitToClient(recipientId, SOCKET_EVENTS.NOTIFICATION_NEW, payload);
  } else {
    emitToProvider(recipientId, SOCKET_EVENTS.NOTIFICATION_NEW, payload);
  }

  return notification;
}

/**
 * Get notifications for a recipient with pagination
 */
export async function getNotifications(
  recipientId: string,
  recipientType: RecipientType,
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) {
  await connectDB();

  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, unreadOnly = false } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    recipientId: new Types.ObjectId(recipientId),
    recipientType,
  };

  if (unreadOnly) {
    query.read = false;
  }

  const [notifications, total] = await Promise.all([
    NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NotificationModel.countDocuments(query),
  ]);

  const data = notifications.map((n) => ({
    _id: n._id.toString(),
    recipientId: n.recipientId.toString(),
    recipientType: n.recipientType,
    type: n.type,
    title: n.title,
    message: n.message,
    quoteId: n.quoteId?.toString(),
    quoteRequestId: n.quoteRequestId?.toString(),
    read: n.read,
    readAt: n.readAt,
    metadata: n.metadata,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));

  return paginatedResponse(data, page, limit, total);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
  recipientId: string,
  recipientType: RecipientType
): Promise<number> {
  await connectDB();

  return NotificationModel.countDocuments({
    recipientId: new Types.ObjectId(recipientId),
    recipientType,
    read: false,
  });
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  notificationId: string,
  recipientId: string,
  recipientType: RecipientType
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  // First check if notification exists and belongs to user
  const notification = await NotificationModel.findOne({
    _id: new Types.ObjectId(notificationId),
    recipientId: new Types.ObjectId(recipientId),
    recipientType,
  });

  if (!notification) {
    return { success: false, error: 'Notification not found' };
  }

  // If already read, return success (idempotent operation)
  if (notification.read) {
    return { success: true };
  }

  // Mark as read
  await NotificationModel.updateOne(
    { _id: notification._id },
    {
      read: true,
      readAt: new Date(),
    }
  );

  return { success: true };
}

/**
 * Mark all notifications as read for a recipient
 */
export async function markAllAsRead(
  recipientId: string,
  recipientType: RecipientType
): Promise<{ success: boolean; modifiedCount: number }> {
  await connectDB();

  const result = await NotificationModel.updateMany(
    {
      recipientId: new Types.ObjectId(recipientId),
      recipientType,
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );

  return { success: true, modifiedCount: result.modifiedCount };
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  recipientId: string,
  recipientType: RecipientType
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  const result = await NotificationModel.deleteOne({
    _id: new Types.ObjectId(notificationId),
    recipientId: new Types.ObjectId(recipientId),
    recipientType,
  });

  if (result.deletedCount === 0) {
    return { success: false, error: 'Notification not found' };
  }

  return { success: true };
}

// Helper functions for creating specific notification types

export async function notifyQuotePriced(params: {
  clientId: string;
  quoteId: string;
  quoteRequestId: string;
  providerName: string;
  route: string;
  price: string;
}) {
  return createNotification({
    recipientId: params.clientId,
    recipientType: 'client',
    type: 'quote_priced',
    data: {
      providerName: params.providerName,
      route: params.route,
      price: params.price,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyQuoteRepriced(params: {
  clientId: string;
  quoteId: string;
  quoteRequestId: string;
  providerName: string;
  route: string;
  price: string;
}) {
  return createNotification({
    recipientId: params.clientId,
    recipientType: 'client',
    type: 'quote_repriced',
    data: {
      providerName: params.providerName,
      route: params.route,
      price: params.price,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyQuoteApproved(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  clientName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'quote_approved',
    data: {
      clientName: params.clientName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyQuoteRejected(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  clientName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'quote_rejected',
    data: {
      clientName: params.clientName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyQuoteCompleted(params: {
  clientId: string;
  quoteId: string;
  quoteRequestId: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.clientId,
    recipientType: 'client',
    type: 'quote_completed',
    data: {
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyQuoteLost(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'quote_lost',
    data: {
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyQuoteMissed(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'quote_missed',
    data: {
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyNegotiationRequested(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  clientName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'negotiation_requested',
    data: {
      clientName: params.clientName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyNegotiationRejected(params: {
  clientId: string;
  quoteId: string;
  quoteRequestId: string;
  providerName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.clientId,
    recipientType: 'client',
    type: 'negotiation_rejected',
    data: {
      providerName: params.providerName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyNewQuoteRequest(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  clientName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'new_quote_request',
    data: {
      clientName: params.clientName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifySupplierDetailsAdded(params: {
  providerId: string;
  quoteId: string;
  quoteRequestId: string;
  clientName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.providerId,
    recipientType: 'provider',
    type: 'supplier_details_added',
    data: {
      clientName: params.clientName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}

export async function notifyAgentDetailsAdded(params: {
  clientId: string;
  quoteId: string;
  quoteRequestId: string;
  providerName: string;
  route: string;
}) {
  return createNotification({
    recipientId: params.clientId,
    recipientType: 'client',
    type: 'agent_details_added',
    data: {
      providerName: params.providerName,
      route: params.route,
    },
    quoteId: params.quoteId,
    quoteRequestId: params.quoteRequestId,
  });
}
