import { NextRequest, NextResponse } from 'next/server';
import { guardClientOrProvider, getClientId, getOrgId } from '@/src/lib/auth/guards';
import { markAllAsRead } from '@/src/lib/services/notification.service';
import { errorResponse, successResponse } from '@/src/lib/types/api.types';

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await guardClientOrProvider();
    if (!authResult.success) {
      return authResult.response;
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

    const result = await markAllAsRead(recipientId, recipientType);

    return NextResponse.json(
      successResponse(
        { modifiedCount: result.modifiedCount },
        `${result.modifiedCount} notification(s) marked as read`
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to mark notifications as read'),
      { status: 500 }
    );
  }
}
