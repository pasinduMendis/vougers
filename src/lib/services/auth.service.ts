import { connectDB } from '../db/connection';
import ClientModel from '../models/client.model';
import UserModel from '../models/user.model';
import OrganizationModel from '../models/organization.model';
import { hashPassword, comparePassword } from '../auth/password';
import { signClientToken, signProviderToken } from '../auth/jwt';
import {
  RegisterClientData,
  RegisterProviderData,
  LoginData,
} from '../validators/auth.validator';

export interface AuthServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  token?: string;
}

export interface ClientInfo {
  id: string;
  name: string;
  email: string;
  companyName: string;
  companyAddress: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

/**
 * Check if an email is already in use by any user type
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  await connectDB();

  const normalizedEmail = email.toLowerCase().trim();

  // Check both Client and User collections
  const [existingClient, existingUser] = await Promise.all([
    ClientModel.findOne({ email: normalizedEmail }),
    UserModel.findOne({ email: normalizedEmail }),
  ]);

  return !!(existingClient || existingUser);
}

/**
 * Register a new client
 */
export async function registerClient(
  data: RegisterClientData
): Promise<AuthServiceResult<ClientInfo>> {
  await connectDB();

  // Check if email is already taken
  if (await isEmailTaken(data.email)) {
    return {
      success: false,
      error: 'Email is already registered',
    };
  }

  // Hash the password
  const hashedPassword = await hashPassword(data.password);

  // Create the client
  const client = await ClientModel.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    companyName: data.companyName,
    companyAddress: data.companyAddress,
    isActive: true,
  });

  return {
    success: true,
    data: {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      companyName: client.companyName,
      companyAddress: client.companyAddress,
    },
  };
}

/**
 * Register a new provider (creates organization and admin user)
 */
export async function registerProvider(
  data: RegisterProviderData
): Promise<AuthServiceResult<ProviderInfo>> {
  await connectDB();

  // Check if email is already taken
  if (await isEmailTaken(data.email)) {
    return {
      success: false,
      error: 'Email is already registered',
    };
  }

  // Hash the password
  const hashedPassword = await hashPassword(data.password);

  // Create the organization
  const organization = await OrganizationModel.create({
    name: data.organizationName,
    isActive: true,
  });

  // Create the admin user for this organization
  const user = await UserModel.create({
    organizationId: organization._id,
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: 'admin',
    isActive: true,
  });

  return {
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: organization._id.toString(),
      organizationName: organization.name,
    },
  };
}

/**
 * Login a user (client or provider)
 */
export async function login(
  data: LoginData
): Promise<AuthServiceResult<ClientInfo | ProviderInfo>> {
  await connectDB();

  const normalizedEmail = data.email.toLowerCase().trim();

  // First, try to find a client with this email
  const client = await ClientModel.findOne({
    email: normalizedEmail,
    isActive: true,
  }).select('+password');

  if (client) {
    // Verify password
    const isValidPassword = await comparePassword(data.password, client.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Generate client token
    const token = signClientToken({
      sub: client._id.toString(),
      email: client.email,
    });

    return {
      success: true,
      token,
      data: {
        id: client._id.toString(),
        name: client.name,
        email: client.email,
        companyName: client.companyName,
        companyAddress: client.companyAddress,
      } as ClientInfo,
    };
  }

  // Try to find a provider user with this email
  const user = await UserModel.findOne({
    email: normalizedEmail,
    isActive: true,
  }).select('+password');

  if (user) {
    // Verify password
    const isValidPassword = await comparePassword(data.password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Get the organization
    const organization = await OrganizationModel.findById(user.organizationId);
    if (!organization || !organization.isActive) {
      return {
        success: false,
        error: 'Organization is not active',
      };
    }

    // Generate provider token
    const token = signProviderToken({
      sub: user._id.toString(),
      organizationId: organization._id.toString(),
      role: user.role,
      email: user.email,
    });

    return {
      success: true,
      token,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id.toString(),
        organizationName: organization.name,
      } as ProviderInfo,
    };
  }

  // No user found with this email
  return {
    success: false,
    error: 'Invalid email or password',
  };
}

/**
 * Get client info by ID
 */
export async function getClientById(clientId: string): Promise<ClientInfo | null> {
  await connectDB();

  const client = await ClientModel.findOne({
    _id: clientId,
    isActive: true,
  });

  if (!client) {
    return null;
  }

  return {
    id: client._id.toString(),
    name: client.name,
    email: client.email,
    companyName: client.companyName,
    companyAddress: client.companyAddress,
  };
}

/**
 * Get provider user info by ID
 */
export async function getProviderById(userId: string): Promise<ProviderInfo | null> {
  await connectDB();

  const user = await UserModel.findOne({
    _id: userId,
    isActive: true,
  });

  if (!user) {
    return null;
  }

  const organization = await OrganizationModel.findById(user.organizationId);
  if (!organization || !organization.isActive) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: organization._id.toString(),
    organizationName: organization.name,
  };
}
