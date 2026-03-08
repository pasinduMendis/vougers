import { Types } from 'mongoose';
import { connectDB } from '../db/connection';
import UserModel, { IUser } from '../models/user.model';
import ClientModel from '../models/client.model';
import { hashPassword } from '../auth/password';
import { ProviderRole } from '../types/auth.types';
import { paginatedResponse, DEFAULT_PAGE, DEFAULT_LIMIT } from '../types/api.types';

export interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: ProviderRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: ProviderRole;
}

export interface UpdateUserData {
  name?: string;
  role?: ProviderRole;
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: ProviderRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Check if email is already taken (across Users and Clients)
 */
async function isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  const userQuery: Record<string, unknown> = { email: normalizedEmail };
  if (excludeUserId) {
    userQuery._id = { $ne: new Types.ObjectId(excludeUserId) };
  }

  const [existingUser, existingClient] = await Promise.all([
    UserModel.findOne(userQuery),
    ClientModel.findOne({ email: normalizedEmail }),
  ]);

  return !!(existingUser || existingClient);
}

/**
 * Get users by organization with pagination
 */
export async function getUsersByOrganization(
  organizationId: string,
  filters: UserFilters = {}
) {
  await connectDB();

  const {
    search,
    role,
    isActive,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = filters;

  const query: Record<string, unknown> = {
    organizationId: new Types.ObjectId(organizationId),
  };

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    UserModel.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  const data: UserInfo[] = users.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  return paginatedResponse(data, page, limit, total);
}

/**
 * Get a single user by ID
 */
export async function getUserById(
  userId: string,
  organizationId: string
): Promise<{ success: boolean; data?: UserInfo; error?: string }> {
  await connectDB();

  const user = await UserModel.findOne({
    _id: userId,
    organizationId: new Types.ObjectId(organizationId),
  }).lean();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  return {
    success: true,
    data: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Create a new user in an organization
 */
export async function createUser(
  organizationId: string,
  data: CreateUserData
): Promise<{ success: boolean; data?: UserInfo; error?: string }> {
  await connectDB();

  // Check if email is taken
  if (await isEmailTaken(data.email)) {
    return { success: false, error: 'Email is already registered' };
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user
  const user = await UserModel.create({
    organizationId: new Types.ObjectId(organizationId),
    name: data.name,
    email: data.email.toLowerCase().trim(),
    password: hashedPassword,
    role: data.role,
    isActive: true,
  });

  return {
    success: true,
    data: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Update a user
 */
export async function updateUser(
  userId: string,
  organizationId: string,
  data: UpdateUserData
): Promise<{ success: boolean; data?: UserInfo; error?: string }> {
  await connectDB();

  const user = await UserModel.findOne({
    _id: userId,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Update fields
  if (data.name !== undefined) {
    user.name = data.name;
  }

  if (data.role !== undefined) {
    user.role = data.role;
  }

  if (data.isActive !== undefined) {
    user.isActive = data.isActive;
  }

  await user.save();

  return {
    success: true,
    data: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(
  userId: string,
  organizationId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  // Prevent self-deactivation
  if (userId === requestingUserId) {
    return { success: false, error: 'Cannot deactivate your own account' };
  }

  const user = await UserModel.findOne({
    _id: userId,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.isActive) {
    return { success: false, error: 'User is already deactivated' };
  }

  user.isActive = false;
  await user.save();

  return { success: true };
}

/**
 * Count users by organization
 */
export async function countUsersByOrganization(
  organizationId: string,
  activeOnly: boolean = true
): Promise<number> {
  await connectDB();

  const query: Record<string, unknown> = {
    organizationId: new Types.ObjectId(organizationId),
  };

  if (activeOnly) {
    query.isActive = true;
  }

  return UserModel.countDocuments(query);
}
