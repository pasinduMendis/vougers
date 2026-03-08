import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST(_req: NextRequest) {
  const cookie = serialize("admin_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: -1, // Expire immediately
  });

  const response = NextResponse.json(
    { message: "Logged out" },
    { status: 200 }
  );
  response.headers.set("Set-Cookie", cookie);
  return response;
}
