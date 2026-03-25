import { NextRequest, NextResponse } from 'next/server';
import { guardClientOrProvider, getClientId, getOrgId } from '@/src/lib/auth/guards';
import { getUnreadCount } from '@/src/lib/services/notification.service';
import { errorResponse, successResponse } from '@/src/lib/types/api.types';

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(request: NextRequest) {
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

    const count = await getUnreadCount(recipientId, recipientType);

    return NextResponse.json(
      successResponse({ count }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get unread count error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to get unread count'),
      { status: 500 }
    );
  }
}
