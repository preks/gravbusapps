import type { BadgeProps } from '@newwork/nw-design-system'

export type StatusBadgeVariant = NonNullable<BadgeProps['variant']>

const SUCCESS = new Set(['active', 'paid', 'completed', 'complete', 'done', 'resolved', 'signed', 'won', 'approved'])
const INFO = new Set(['open', 'running', 'in_progress', 'in progress', 'new', 'sent', 'issued'])
const WARNING = new Set(['pending', 'draft', 'on_hold', 'on hold', 'blocked', 'in_review', 'in review', 'partial'])
const DESTRUCTIVE = new Set(['overdue', 'cancelled', 'canceled', 'failed', 'terminated', 'rejected', 'expired', 'lost'])

/**
 * Map an arbitrary domain status string to a design-system Badge variant.
 * Unknown statuses fall back to a neutral `secondary` badge.
 */
export function getStatusBadgeVariant(status?: string): StatusBadgeVariant {
  const normalized = status?.trim().toLowerCase()
  if (!normalized) return 'outline'
  if (SUCCESS.has(normalized)) return 'success'
  if (INFO.has(normalized)) return 'info'
  if (WARNING.has(normalized)) return 'warning'
  if (DESTRUCTIVE.has(normalized)) return 'destructive'
  return 'secondary'
}

const CLOSED_STATUSES = new Set([
  'completed',
  'complete',
  'done',
  'resolved',
  'closed',
  'cancelled',
  'canceled',
  'terminated',
  'paid',
  'expired',
  'rejected'
])

/** True when a status represents an open/active item (not closed/terminal). */
export function isOpenStatus(status?: string): boolean {
  const normalized = status?.trim().toLowerCase()
  if (!normalized) return true
  return !CLOSED_STATUSES.has(normalized)
}
