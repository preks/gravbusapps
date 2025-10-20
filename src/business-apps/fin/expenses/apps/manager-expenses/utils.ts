import { PillType } from '@/components/pill/Pill'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Enum representing the technical statuses for expenses
 */
export enum ExpenseStatus {
  PREPARED = 'PREPARED',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED',
  REJECTED = 'REJECTED',
  VERIFIED = 'VERIFIED',
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  DISCARDED = 'DISCARDED',
  TRANSFERRED = 'TRANSFERRED'
}

/**
 * Type for status display configuration
 */
export interface StatusDisplayConfig {
  label: string
  type: PillType
}

// Consolidated status keys that can come from APIs or UI
type StatusKey = keyof typeof ExpenseStatus | 'IN_APPROVAL' | 'VERIFICATION_REQUIRED' | 'Open'

// Base i18n + default pill type for each status (shared across entities)
const BASE_STATUS_MAP: Record<StatusKey, { i18nKey: string; fallback: string; defaultType: PillType }> = {
  IN_APPROVAL: { i18nKey: 'lowcoder:expense_statuses.in_approval', fallback: 'In Approval', defaultType: 'task' },
  VERIFICATION_REQUIRED: {
    i18nKey: 'lowcoder:expense_statuses.verification_required',
    fallback: 'Verification Required',
    defaultType: 'waiting'
  },
  PREPARED: { i18nKey: 'lowcoder:expense_statuses.prepared', fallback: 'Prepared', defaultType: 'draft' },
  CREATED: { i18nKey: 'lowcoder:expense_statuses.draft', fallback: 'Draft', defaultType: 'draft' },
  ASSIGNED: { i18nKey: 'lowcoder:expense_statuses.assigned', fallback: 'Assigned', defaultType: 'waiting' },
  PENDING: { i18nKey: 'lowcoder:expense_statuses.in_approval', fallback: 'In Approval', defaultType: 'task' },
  APPROVED: { i18nKey: 'lowcoder:expense_statuses.approved', fallback: 'Approved', defaultType: 'completed' },
  RETURNED: { i18nKey: 'lowcoder:expense_statuses.returned', fallback: 'Returned', defaultType: 'waiting' },
  REJECTED: {
    i18nKey: 'lowcoder:expense_statuses.revision_required',
    fallback: 'Revision Required',
    defaultType: 'error'
  },
  VERIFIED: { i18nKey: 'lowcoder:expense_statuses.verified', fallback: 'Verified', defaultType: 'waiting' },
  BOOKED: { i18nKey: 'lowcoder:expense_statuses.booked', fallback: 'Booked', defaultType: 'waiting' },
  PAID: { i18nKey: 'lowcoder:expense_statuses.paid', fallback: 'Paid', defaultType: 'completed' },
  CLOSED: { i18nKey: 'lowcoder:expense_statuses.closed', fallback: 'Closed', defaultType: 'completed' },
  DISCARDED: { i18nKey: 'lowcoder:expense_statuses.discarded', fallback: 'Discarded', defaultType: 'error' },
  TRANSFERRED: { i18nKey: 'lowcoder:expense_statuses.transferred', fallback: 'Transferred', defaultType: 'completed' },
  Open: { i18nKey: 'translation:flow_status_open', fallback: 'Open', defaultType: 'draft' }
} as const

// Per-entity overrides only where they differ from the base
const ENTITY_OVERRIDES: {
  plan: Partial<Record<StatusKey, PillType>>
  request: Partial<Record<StatusKey, PillType>>
  advance: Partial<Record<StatusKey, PillType>>
} = {
  plan: {
    // Plan uses task for REJECTED instead of error
    REJECTED: 'task'
  },
  request: {
    // request matches base; keep here for clarity/expansion
  },
  advance: {
    // advance matches base; keep here for clarity/expansion
  }
}

/**
 * Generic status-to-display mapper with per-entity overrides.
 */
export const getEntityStatusDisplay = (entity: 'plan' | 'request' | 'advance', status: string): StatusDisplayConfig => {
  if (!status) {
    return { label: '', type: 'draft' }
  }

  // Check if status is a known key without unsafe type assertion
  const normalized = String(status)
  const base = BASE_STATUS_MAP[normalized as keyof typeof BASE_STATUS_MAP]

  if (!base) {
    return { label: status, type: 'draft' }
  }

  const overrideType = ENTITY_OVERRIDES[entity]?.[normalized as StatusKey]
  const type = overrideType || base.defaultType
  const label = getTranslationFromI18nKeyAndLabel(base.i18nKey, base.fallback)
  return { label, type }
}

/**
 * Backward-compatible wrappers (preserve existing imports in other files).
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('plan', status)

export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('request', status)

export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('advance', status)

/**
 * Type guard to check if error has a message property
 */
const isErrorWithMessage = (err: unknown): err is { message: string } => {
  return (
    err !== null &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  )
}

/**
 * Normalizes unknown error values into a user-friendly string message
 */
export const getNormalizedErrorMessage = (err: unknown): string => {
  if (typeof err === 'string') return err
  if (isErrorWithMessage(err)) {
    return err.message
  }
  return 'An unknown error occurred'
}
