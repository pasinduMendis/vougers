import { NextRequest, NextResponse } from 'next/server';
import { guardClientOrProvider, getClientId, getOrgId } from '@/src/lib/auth/guards';
import { markAsRead } from '@/src/lib/services/notification.service';
import { Types } from 'mongoose';
import { errorResponse, successResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id]/read - Mark a notification as read
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await guardClientOrProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate notification ID
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Notification ID is invalid'),
        { status: 400 }
      );
    }

    // Determine recipient based on user type
    let recipientId: string;
    let recipientType: 'client' | 'provider';

    if (authResult.type === 'client') {
      recipientId = getClientId(authResult.payload).toString();
      recipientType = 'client';
    } else {
      recipientId = getOrgId(authResult.payload).toString();
      recipientType = 'provider';
    }

    const result = await markAsRead(id, recipientId, recipientType);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Not found', result.error || 'Notification not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(null, 'Notification marked as read'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to mark notification as read'),
      { status: 500 }
    );
  }
}
