import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import {
  guardClientOrProvider,
  getClientId,
  getOrgId,
} from '@/src/lib/auth/guards';
import { canChangeQuoteStatus } from '@/src/lib/middleware/rbac.middleware';
import {
  updateQuoteStatus,
  clientOwnsQuote,
  providerOwnsQuote,
  getQuoteById,
} from '@/src/lib/services/quote.service';
import {
  validateStatusUpdate,
  validateStatusTransition,
} from '@/src/lib/validators/quote.validator';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/quotes/[id]/status
 * Update quote status
 * - Clients: can approve/reject priced quotes
 * - Providers (admin/view_edit): can mark approved quotes as completed
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // First check basic auth
    const authResult = await guardClientOrProvider();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        errorResponse('Invalid ID', 'Quote ID is invalid'),
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateStatusUpdate(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: validation.errors },
        { status: 400 }
      );
    }

    const newStatus = validation.data.status;

    // Get current quote to check current status
    const quote = await getQuoteById(id);
    if (!quote) {
      return NextResponse.json(
        errorResponse('Not found', 'Quote not found'),
        { status: 404 }
      );
    }

    let actorId: string;
    const actorType = authResult.type;

    if (actorType === 'client') {
      // Check client owns the quote
      const clientId = getClientId(authResult.payload);
      actorId = clientId.toString();

      const owns = await clientOwnsQuote(id, actorId);
      if (!owns) {
        return NextResponse.json(
          errorResponse('Not found', 'Quote not found'),
          { status: 404 }
        );
      }
    } else {
      // Check provider permission for status changes
      const permResult = await canChangeQuoteStatus();
      if (!permResult.authorized || !permResult.payload) {
        return permResult.response!;
      }

      // Check provider owns the quote
      const orgId = getOrgId(permResult.payload);
      actorId = orgId.toString();

      const owns = await providerOwnsQuote(id, actorId);
      if (!owns) {
        return NextResponse.json(
          errorResponse('Not found', 'Quote not found'),
          { status: 404 }
        );
      }
    }

    // Validate status transition
    const transitionResult = validateStatusTransition(
      quote.status,
      newStatus,
      actorType
    );
    if (!transitionResult.valid) {
      return NextResponse.json(
        errorResponse('Invalid transition', transitionResult.error),
        { status: 400 }
      );
    }

    // Update the status
    const result = await updateQuoteStatus(id, newStatus, actorType, actorId);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to update status', result.error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        {
          _id: result.data!._id.toString(),
          status: result.data!.status,
          updatedAt: result.data!.updatedAt,
        },
        `Quote status updated to '${newStatus}'`
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update quote status error:', error);
    return NextResponse.json(
      errorResponse('Internal server error', 'Failed to update quote status'),
      { status: 500 }
    );
  }
}
