import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Get cookie options based on environment
 */
function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Use 'lax' to allow cookie on same-site navigations
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

/**
 * Set the auth token cookie (for use in Route Handlers)
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const options = getCookieOptions();

  cookieStore.set(AUTH_COOKIE_NAME, token, options);
}

/**
 * Clear the auth token cookie (for use in Route Handlers)
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0, // Expire immediately
  });
}

/**
 * Get the auth token from cookies (for use in Route Handlers)
 */
export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Get the auth token from a NextRequest (for use in middleware)
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Create a Set-Cookie header string for the auth token
 * Use this when you need to return the cookie in a Response
 */
export function createAuthCookieHeader(token: string): string {
  const options = getCookieOptions();
  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`,
  ];

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Create a Set-Cookie header string to clear the auth cookie
 */
export function createClearCookieHeader(): string {
  return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=lax`;
}

export { AUTH_COOKIE_NAME };
