import { QuoteStatus } from '../lib/types/quote.types';
import { UserType } from '../lib/types/auth.types';

// Quote status values
export const QUOTE_STATUSES = {
  PENDING: 'pending',
  PRICED: 'priced',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  LOST: 'lost',
  MISSED: 'missed',
} as const;

// All quote statuses array
export const ALL_QUOTE_STATUSES: QuoteStatus[] = [
  'pending',
  'priced',
  'approved',
  'rejected',
  'completed',
  'lost',
  'missed',
];

// Valid status transitions based on actor type
export const VALID_TRANSITIONS: Record<UserType, Record<QuoteStatus, QuoteStatus[]>> = {
  client: {
    pending: [],                    // Client waits for provider to price
    priced: ['approved', 'rejected'], // Client can approve or reject
    approved: [],                   // No further client action
    rejected: [],                   // No further client action
    completed: [],                  // Final state
    lost: [],                       // Terminal state (provider-only visibility)
    missed: [],                     // Terminal state (provider-only visibility)
  },
  provider: {
    pending: ['priced', 'rejected'], // Provider can price or reject
    priced: ['rejected'],            // Provider can reject after pricing
    approved: [],                    // Provider completes via addAgentDetails (not direct status change)
    rejected: [],                    // No action on rejected
    completed: [],                   // Final state
    lost: [],                        // Terminal state - priced but another provider chosen
    missed: [],                      // Terminal state - didn't price, another provider chosen
  },
} as const;

// Check if a status transition is valid
export function isValidTransition(
  currentStatus: QuoteStatus,
  newStatus: QuoteStatus,
  actorType: UserType
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[actorType][currentStatus];
  return allowedTransitions.includes(newStatus);
}

// Get allowed transitions for a status and actor
export function getAllowedTransitions(
  currentStatus: QuoteStatus,
  actorType: UserType
): QuoteStatus[] {
  return [...VALID_TRANSITIONS[actorType][currentStatus]];
}

// Status display names
export const STATUS_DISPLAY_NAMES: Record<QuoteStatus, string> = {
  pending: 'Pending',
  priced: 'Priced',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  lost: 'Lost',
  missed: 'Missed',
};

// Status display names for clients (maps provider-only statuses to rejected)
export const STATUS_DISPLAY_NAMES_CLIENT: Record<QuoteStatus, string> = {
  pending: 'Pending',
  priced: 'Priced',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  lost: 'Rejected',      // Clients see "rejected" instead of "lost"
  missed: 'Rejected',    // Clients see "rejected" instead of "missed"
};

// Status colors for UI
export const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: 'yellow',
  priced: 'blue',
  approved: 'green',
  rejected: 'red',
  completed: 'gray',
  lost: 'orange',
  missed: 'slate',
};

// Status descriptions
export const STATUS_DESCRIPTIONS: Record<QuoteStatus, string> = {
  pending: 'Waiting for provider to submit pricing',
  priced: 'Provider has submitted pricing, awaiting client decision',
  approved: 'Client has approved this quote',
  rejected: 'Quote has been rejected',
  completed: 'Shipment has been completed',
  lost: 'Quote was priced but client chose another provider',
  missed: 'Quote was not priced and client chose another provider',
};

// Check if status is terminal (no more transitions possible)
export function isTerminalStatus(status: QuoteStatus): boolean {
  return status === 'rejected' || status === 'completed' || status === 'lost' || status === 'missed';
}

// Check if quote is actionable by client
export function isClientActionable(status: QuoteStatus): boolean {
  return status === 'priced';
}

// Check if quote is actionable by provider
export function isProviderActionable(status: QuoteStatus): boolean {
  return status === 'pending' || status === 'priced' || status === 'approved';
}
