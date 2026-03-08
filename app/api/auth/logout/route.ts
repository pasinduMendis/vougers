import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/src/lib/auth/session';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

export async function POST() {
  try {
    // Clear the auth cookie
    await clearAuthCookie();

    return NextResponse.json(
      successResponse(null, 'Logged out successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
