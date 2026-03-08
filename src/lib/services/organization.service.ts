import { connectDB } from '../db/connection';
import OrganizationModel, { IOrganization } from '../models/organization.model';

export interface OrganizationInfo {
  _id: string;
  name: string;
  slug: string;
}

/**
 * Get all active organizations (service providers)
 */
export async function getActiveOrganizations(): Promise<OrganizationInfo[]> {
  await connectDB();

  const organizations = await OrganizationModel.find({ isActive: true })
    .select('name slug')
    .sort({ name: 1 })
    .lean();

  return organizations.map((org) => ({
    _id: org._id.toString(),
    name: org.name,
    slug: org.slug,
  }));
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(
  orgId: string
): Promise<OrganizationInfo | null> {
  await connectDB();

  const organization = await OrganizationModel.findOne({
    _id: orgId,
    isActive: true,
  })
    .select('name slug')
    .lean();

  if (!organization) {
    return null;
  }

  return {
    _id: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
  };
}

/**
 * Get organizations by IDs
 */
export async function getOrganizationsByIds(
  orgIds: string[]
): Promise<OrganizationInfo[]> {
  await connectDB();

  const organizations = await OrganizationModel.find({
    _id: { $in: orgIds },
    isActive: true,
  })
    .select('name slug')
    .lean();

  return organizations.map((org) => ({
    _id: org._id.toString(),
    name: org.name,
    slug: org.slug,
  }));
}

/**
 * Validate organization IDs exist and are active
 */
export async function validateOrganizationIds(
  orgIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  await connectDB();

  const validOrgs = await OrganizationModel.find({
    _id: { $in: orgIds },
    isActive: true,
  })
    .select('_id')
    .lean();

  const validIdSet = new Set(validOrgs.map((org) => org._id.toString()));
  const invalidIds = orgIds.filter((id) => !validIdSet.has(id));

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}
