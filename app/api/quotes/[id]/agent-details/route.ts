import { NextRequest, NextResponse } from 'next/server';
import { guardProvider, getOrgId, getUserId } from '@/src/lib/auth/guards';
import { addAgentDetails } from '@/src/lib/services/quote.service';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate provider
    const authResult = await guardProvider();
    if (!authResult.success) return authResult.response;

    const { id: quoteId } = await params;
    const organizationId = getOrgId(authResult.payload);
    const userId = getUserId(authResult.payload);

    if (!organizationId) {
      return NextResponse.json(
        errorResponse('Organization ID not found'),
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID not found'),
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const { agentDetails } = body;

    if (!agentDetails || typeof agentDetails !== 'string') {
      return NextResponse.json(
        errorResponse('Agent details are required'),
        { status: 400 }
      );
    }

    if (agentDetails.length > 2000) {
      return NextResponse.json(
        errorResponse('Agent details cannot exceed 2000 characters'),
        { status: 400 }
      );
    }

    // Add agent details
    const result = await addAgentDetails(
      quoteId,
      organizationId.toString(),
      userId.toString(),
      agentDetails
    );

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error || 'Failed to add agent details'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({
        _id: result.data!._id.toString(),
        agentDetails: result.data!.agentDetails,
        agentDetailsAddedAt: result.data!.agentDetailsAddedAt,
        status: result.data!.status,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error adding agent details:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}
