import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { guardClient, getClientId } from '@/src/lib/auth/guards';
import { getQuoteRequestById, cancelQuoteRequest } from '@/src/lib/services/quote-request.service';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quote-requests/[id]
 * Get a quote request with all provider quotes
 * Only accessible by the client who owns the quote request
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require client authentication
    const authResult = await guardClient();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Quote request ID is invalid'),
        { status: 400 }
      );
    }

    // Get the quote request with quotes
    const clientId = getClientId(authResult.payload);
    const result = await getQuoteRequestById(id, clientId.toString());

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Not found', result.error || 'Quote request not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(result.data),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get quote request error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to fetch quote request'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quote-requests/[id]
 * Cancel (soft delete) a quote request
 * Only allowed if no quotes have been approved
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require client authentication
    const authResult = await guardClient();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Quote request ID is invalid'),
        { status: 400 }
      );
    }

    // Cancel the quote request
    const clientId = getClientId(authResult.payload);
    const result = await cancelQuoteRequest(id, clientId.toString());

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Cannot cancel', result.error || 'Failed to cancel quote request'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(null, 'Quote request cancelled successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancel quote request error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to cancel quote request'),
      { status: 500 }
    );
  }
}
