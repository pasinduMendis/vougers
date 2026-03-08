import { NextRequest, NextResponse } from "next/server";
import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV } from "@/envValues";
import { COOKIE_ACTIVE_DURATION_HOURS } from "@/product-variables/product-variables";

export function verifyAndRefreshClient(
  req: NextRequest,
  res?: NextResponse
): { email: string } | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies.client_token;

  if (!JWT_SECRET) {
    return null;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };

    // Re-sign token and update cookie with new expiration
    const refreshedToken = jwt.sign({ email: decoded.email }, JWT_SECRET, {
      expiresIn: `${COOKIE_ACTIVE_DURATION_HOURS}h`,
    });

    const newCookie = serialize("client_token", refreshedToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * COOKIE_ACTIVE_DURATION_HOURS,
    });

    // If response object is provided, set cookie header
    if (res) {
      res.headers.set("Set-Cookie", newCookie);
    }

    return { email: decoded.email };
  } catch (err) {
    return null;
  }
}
