import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Minimal middleware - just pass through all requests
 * Auth protection is handled client-side via useAuth hook
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match API routes for potential future use
    '/api/:path*',
  ],
};
