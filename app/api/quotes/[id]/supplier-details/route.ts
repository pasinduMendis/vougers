import { NextRequest, NextResponse } from 'next/server';
import { guardClient, getClientId } from '@/src/lib/auth/guards';
import { addSupplierDetails } from '@/src/lib/services/quote.service';
import { successResponse, errorResponse } from '@/src/lib/types/api.types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate client
    const authResult = await guardClient();
    if (!authResult.success) return authResult.response;

    const { id: quoteId } = await params;
    const clientId = getClientId(authResult.payload);

    if (!clientId) {
      return NextResponse.json(
        errorResponse('Client ID not found'),
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const { supplierDetails } = body;

    if (!supplierDetails || typeof supplierDetails !== 'string') {
      return NextResponse.json(
        errorResponse('Supplier details are required'),
        { status: 400 }
      );
    }

    if (supplierDetails.length > 2000) {
      return NextResponse.json(
        errorResponse('Supplier details cannot exceed 2000 characters'),
        { status: 400 }
      );
    }

    // Add supplier details
    const result = await addSupplierDetails(quoteId, clientId.toString(), supplierDetails);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error || 'Failed to add supplier details'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({
        _id: result.data!._id.toString(),
        supplierDetails: result.data!.supplierDetails,
        supplierDetailsAddedAt: result.data!.supplierDetailsAddedAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error adding supplier details:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}
