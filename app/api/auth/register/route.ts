import { NextResponse } from 'next/server';
import {
  validateRegisterClientData,
  validateRegisterProviderData,
} from '@/src/lib/validators/auth.validator';
import {
  registerClient,
  registerProvider,
} from '@/src/lib/services/auth.service';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

interface RegisterRequestBody {
  type: 'client' | 'provider';
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as RegisterRequestBody;

    // Validate type field
    if (!body.type || (body.type !== 'client' && body.type !== 'provider')) {
      return NextResponse.json(
        errorResponse('Validation error', 'Type must be either "client" or "provider"'),
        { status: 400 }
      );
    }

    if (body.type === 'client') {
      // Validate client registration data
      const validation = validateRegisterClientData(body);
      if (!validation.success || !validation.data) {
        return NextResponse.json(
          { success: false, error: 'Validation error', details: validation.errors },
          { status: 400 }
        );
      }

      // Register the client
      const result = await registerClient(validation.data);
      if (!result.success) {
        return NextResponse.json(
          errorResponse('Registration failed', result.error),
          { status: 409 }
        );
      }

      return NextResponse.json(
        successResponse(
          { user: result.data, type: 'client' },
          'Client registration successful'
        ),
        { status: 201 }
      );
    } else {
      // Validate provider registration data
      const validation = validateRegisterProviderData(body);
      if (!validation.success || !validation.data) {
        return NextResponse.json(
          { success: false, error: 'Validation error', details: validation.errors },
          { status: 400 }
        );
      }

      // Register the provider
      const result = await registerProvider(validation.data);
      if (!result.success) {
        return NextResponse.json(
          errorResponse('Registration failed', result.error),
          { status: 409 }
        );
      }

      return NextResponse.json(
        successResponse(
          { user: result.data, type: 'provider' },
          'Provider registration successful'
        ),
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
