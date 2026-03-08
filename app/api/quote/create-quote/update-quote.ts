import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoDB";
import Quote, { IQuote } from "@/lib/schema/quote.schema";

interface Params {
  params: {
    id: string;
  };
}

export async function PUT(req: Request, { params }: Params) {
  try {
    await connectDB();
    const body: Partial<IQuote> = await req.json();

    const updatedQuote = await Quote.findByIdAndUpdate(
      params.id,
      body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedQuote) {
      return NextResponse.json(
        { success: false, message: "Quote not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedQuote });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// Optional PATCH (partial update)
export async function PATCH(req: Request, { params }: Params) {
  try {
    await connectDB();
    const body: Partial<IQuote> = await req.json();

    const updatedQuote = await Quote.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updatedQuote });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
