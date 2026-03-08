import jwt from 'jsonwebtoken';
import {
  TokenPayload,
  ClientTokenPayload,
  ProviderTokenPayload,
  ProviderRole,
} from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = '7d'; // 7 days

if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('Please define JWT_SECRET in .env');
}

/**
 * Sign a JWT token for a client
 */
export function signClientToken(payload: {
  sub: string;
  email: string;
}): string {
  const tokenPayload: Omit<ClientTokenPayload, 'iat' | 'exp'> = {
    sub: payload.sub,
    type: 'client',
    email: payload.email,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Sign a JWT token for a provider user
 */
export function signProviderToken(payload: {
  sub: string;
  organizationId: string;
  role: ProviderRole;
  email: string;
}): string {
  const tokenPayload: Omit<ProviderTokenPayload, 'iat' | 'exp'> = {
    sub: payload.sub,
    type: 'provider',
    organizationId: payload.organizationId,
    role: payload.role,
    email: payload.email,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 * Returns null if token is invalid or expired
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    // Get secret at runtime to handle Edge Runtime
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[JWT] JWT_SECRET is not available');
      return null;
    }
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error);
    return null;
  }
}

/**
 * Decode a JWT token without verification
 * Use only when you need to read the payload without validating
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}
