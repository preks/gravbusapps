// Shared status constants and helpers for Manager Expenses analytics and tables

// Canonicalization map for statuses coming from various sources
export const EXPENSE_STATUS_NORMALIZE: Record<string, string> = {
  IN_APPROVAL: 'PENDING'
}

export const normalizeStatus = (status: string = 'Unknown'): string => {
  const raw = status
  return EXPENSE_STATUS_NORMALIZE[raw] ?? raw
}

// Exclusion sets to align analytics with list screens
export const EXCLUDE_ITEM_STATUSES = new Set<string>(['DISCARDED'])
export const EXCLUDE_REQUEST_STATUSES = new Set<string>(['REJECTED', 'DISCARDED', 'CREATED'])
export const EXCLUDE_PLAN_STATUSES = new Set<string>(['DISCARDED', 'REJECTED'])
export const EXCLUDE_ADV_PAYMENT_STATUSES = new Set<string>(['CREATED', 'RETURNED', 'REJECTED', 'DISCARDED'])

/** Statuses excluded from Plans tab when no explicit status filter is selected. */
export const PLAN_TAB_HIDDEN_STATUSES: readonly string[] = ['CREATED']
