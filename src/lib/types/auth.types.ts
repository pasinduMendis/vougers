// User types
export type UserType = 'client' | 'provider';
export type ProviderRole = 'admin' | 'view_edit' | 'view_only';

// JWT Payload types
export interface ClientTokenPayload {
  sub: string;
  type: 'client';
  email: string;
  iat?: number;
  exp?: number;
}

export interface ProviderTokenPayload {
  sub: string;
  type: 'provider';
  organizationId: string;
  role: ProviderRole;
  email: string;
  iat?: number;
  exp?: number;
}

export type TokenPayload = ClientTokenPayload | ProviderTokenPayload;

// Auth request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterClientRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyAddress: string;
}

export interface RegisterProviderRequest {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface RegisterRequest {
  type: UserType;
  data: RegisterClientRequest | RegisterProviderRequest;
}

// Auth response types
export interface AuthUser {
  id: string;
  type: UserType;
  email: string;
  name: string;
}

export interface ClientAuthUser extends AuthUser {
  type: 'client';
  companyName: string;
  companyAddress: string;
}

export interface ProviderAuthUser extends AuthUser {
  type: 'provider';
  organizationId: string;
  organizationName: string;
  role: ProviderRole;
}

export type CurrentUser = ClientAuthUser | ProviderAuthUser;

// Type guards
export function isClientToken(payload: TokenPayload): payload is ClientTokenPayload {
  return payload.type === 'client';
}

export function isProviderToken(payload: TokenPayload): payload is ProviderTokenPayload {
  return payload.type === 'provider';
}

export function isClientUser(user: CurrentUser): user is ClientAuthUser {
  return user.type === 'client';
}

export function isProviderUser(user: CurrentUser): user is ProviderAuthUser {
  return user.type === 'provider';
}
