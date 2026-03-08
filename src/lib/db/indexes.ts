import mongoose from 'mongoose';
import OrganizationModel from '../models/organization.model';
import UserModel from '../models/user.model';
import ClientModel from '../models/client.model';
import QuoteRequestModel from '../models/quote-request.model';
import QuoteModel from '../models/quote.model';

/**
 * Ensures all database indexes are created.
 * Call this on application startup.
 */
export async function ensureIndexes(): Promise<void> {
  try {
    console.log('Ensuring database indexes...');

    // Wait for all models to sync their indexes
    await Promise.all([
      OrganizationModel.syncIndexes(),
      UserModel.syncIndexes(),
      ClientModel.syncIndexes(),
      QuoteRequestModel.syncIndexes(),
      QuoteModel.syncIndexes(),
    ]);

    console.log('Database indexes ensured successfully');
  } catch (error) {
    console.error('Error ensuring database indexes:', error);
    throw error;
  }
}

/**
 * Lists all indexes in the database for debugging
 */
export async function listAllIndexes(): Promise<Record<string, unknown[]>> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }

  const collections = await db.listCollections().toArray();
  const indexes: Record<string, unknown[]> = {};

  for (const collection of collections) {
    const collectionIndexes = await db.collection(collection.name).indexes();
    indexes[collection.name] = collectionIndexes;
  }

  return indexes;
}

/**
 * Index definitions for reference:
 *
 * Organization:
 * - { slug: 1 } - unique
 * - { isActive: 1 }
 *
 * User:
 * - { organizationId: 1 }
 * - { email: 1 } - unique
 * - { organizationId: 1, isActive: 1 }
 *
 * Client:
 * - { email: 1 } - unique
 *
 * QuoteRequest:
 * - { clientId: 1, createdAt: -1 }
 *
 * Quote:
 * - { quoteRequestId: 1 }
 * - { clientId: 1, status: 1 }
 * - { serviceProviderId: 1, status: 1 }
 * - { createdAt: -1 }
 * - { serviceProviderId: 1, createdAt: -1 }
 */

export default ensureIndexes;
