import { verifyAndRefreshClient } from "@/lib/middleware/client/client-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const admin = verifyAndRefreshClient(req, res);

  if (!admin) {
    return NextResponse.json(
      { message: "Unauthorized", isUser: false },
      { status: 401 }
    );
  }

  // Set refreshed cookie in response
  res.headers.set("Set-Cookie", res.headers.get("Set-Cookie") || "");
  return NextResponse.json({ isUser: true,userRole:"general" });
}
