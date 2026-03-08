import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoDB";
import Quote, { IQuote } from "@/lib/schema/quote.schema";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body: Partial<IQuote> = await req.json();

    const quote = await Quote.create(body);

    return NextResponse.json(
      { success: true, data: quote },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
