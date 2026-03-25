import { NextRequest, NextResponse } from 'next/server';
import { guardClientOrProvider, getClientId, getOrgId } from '@/src/lib/auth/guards';
import { getNotifications } from '@/src/lib/services/notification.service';
import { errorResponse } from '@/src/lib/types/api.types';

// GET /api/notifications - Get notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authResult = await guardClientOrProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

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

    const result = await getNotifications(recipientId, recipientType, {
      page,
      limit,
      unreadOnly,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch notifications'),
      { status: 500 }
    );
  }
}
