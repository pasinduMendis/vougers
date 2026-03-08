import { ProviderRole } from '../lib/types/auth.types';

// Provider roles
export const PROVIDER_ROLES = {
  ADMIN: 'admin',
  VIEW_EDIT: 'view_edit',
  VIEW_ONLY: 'view_only',
} as const;

// All provider roles array
export const ALL_PROVIDER_ROLES: ProviderRole[] = ['admin', 'view_edit', 'view_only'];

// Permission types
export type Permission =
  | 'quotes:read'
  | 'quotes:price'
  | 'quotes:status'
  | 'users:read'
  | 'users:write';

// Permissions matrix - which roles can perform which actions
export const PERMISSIONS: Record<Permission, ProviderRole[]> = {
  'quotes:read': ['admin', 'view_edit', 'view_only'],
  'quotes:price': ['admin', 'view_edit'],
  'quotes:status': ['admin', 'view_edit'],
  'users:read': ['admin'],
  'users:write': ['admin'],
} as const;

// Check if a role has a specific permission
export function hasPermission(role: ProviderRole, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

// Get all permissions for a role
export function getRolePermissions(role: ProviderRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    PERMISSIONS[permission].includes(role)
  );
}

// Role display names
export const ROLE_DISPLAY_NAMES: Record<ProviderRole, string> = {
  admin: 'Administrator',
  view_edit: 'View & Edit',
  view_only: 'View Only',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<ProviderRole, string> = {
  admin: 'Full access including user management',
  view_edit: 'Can view and price quotes, but cannot manage users',
  view_only: 'Can only view quotes, no editing capabilities',
};
