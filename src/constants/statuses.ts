import { QuoteStatus } from '../lib/types/quote.types';
import { UserType } from '../lib/types/auth.types';

// Quote status values
export const QUOTE_STATUSES = {
  PENDING: 'pending',
  PRICED: 'priced',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;

// All quote statuses array
export const ALL_QUOTE_STATUSES: QuoteStatus[] = [
  'pending',
  'priced',
  'approved',
  'rejected',
  'completed',
];

// Valid status transitions based on actor type
export const VALID_TRANSITIONS: Record<UserType, Record<QuoteStatus, QuoteStatus[]>> = {
  client: {
    pending: [],                    // Client waits for provider to price
    priced: ['approved', 'rejected'], // Client can approve or reject
    approved: [],                   // No further client action
    rejected: [],                   // No further client action
    completed: [],                  // Final state
  },
  provider: {
    pending: ['priced', 'rejected'], // Provider can price or reject
    priced: ['rejected'],            // Provider can reject after pricing
    approved: ['completed'],         // Provider can mark completed
    rejected: [],                    // No action on rejected
    completed: [],                   // Final state
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
};

// Status colors for UI
export const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: 'yellow',
  priced: 'blue',
  approved: 'green',
  rejected: 'red',
  completed: 'gray',
};

// Status descriptions
export const STATUS_DESCRIPTIONS: Record<QuoteStatus, string> = {
  pending: 'Waiting for provider to submit pricing',
  priced: 'Provider has submitted pricing, awaiting client decision',
  approved: 'Client has approved this quote',
  rejected: 'Quote has been rejected',
  completed: 'Shipment has been completed',
};

// Check if status is terminal (no more transitions possible)
export function isTerminalStatus(status: QuoteStatus): boolean {
  return status === 'rejected' || status === 'completed';
}

// Check if quote is actionable by client
export function isClientActionable(status: QuoteStatus): boolean {
  return status === 'priced';
}

// Check if quote is actionable by provider
export function isProviderActionable(status: QuoteStatus): boolean {
  return status === 'pending' || status === 'priced' || status === 'approved';
}
