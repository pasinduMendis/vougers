import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET, NODE_ENV } from "@/envValues";
import { COOKIE_ACTIVE_DURATION_HOURS } from "@/product-variables/product-variables";

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { message: "Server configuration error" },
      { status: 500 }
    );
  }

  const { email, password } = await req.json();

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, {
      expiresIn: `${COOKIE_ACTIVE_DURATION_HOURS}h`,
    });

    const cookie = serialize("client_token", token, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: COOKIE_ACTIVE_DURATION_HOURS * 60 * 60, // seconds
    });

    const response = NextResponse.json(
      { message: "Login successful" },
      { status: 200 }
    );
    response.headers.set("Set-Cookie", cookie);
    return response;
  }

  return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
}
