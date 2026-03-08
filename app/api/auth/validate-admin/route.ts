import { verifyAndRefreshAdmin } from "@/lib/middleware/admin/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const admin = verifyAndRefreshAdmin(req, res);

  if (!admin) {
    return NextResponse.json(
      { message: "Unauthorized", isAdmin: false },
      { status: 401 }
    );
  }

  // Set refreshed cookie in response
  res.headers.set("Set-Cookie", res.headers.get("Set-Cookie") || "");
  return NextResponse.json({ isAdmin: true });
}
