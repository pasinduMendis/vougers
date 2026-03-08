import { NextResponse } from 'next/server';
import { validateLoginData } from '@/src/lib/validators/auth.validator';
import { login } from '@/src/lib/services/auth.service';
import { setAuthCookie } from '@/src/lib/auth/session';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate login data
    const validation = validateLoginData(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.errors },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await login(validation.data);
    if (!result.success || !result.token) {
      return NextResponse.json(
        errorResponse('Authentication failed', result.error || 'Invalid credentials'),
        { status: 401 }
      );
    }

    // Set the auth cookie
    await setAuthCookie(result.token);

    // Determine user type from the response data
    const userType = 'organizationId' in (result.data || {}) ? 'provider' : 'client';

    return NextResponse.json(
      successResponse(
        { user: result.data, type: userType },
        'Login successful'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
