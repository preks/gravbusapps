import { PillType } from '@/components/pill/Pill'

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

export type StatusBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'offline'
  | 'outline'

export interface StatusDisplayConfig {
  label: string
  type: PillType
  color?: string
  badgeVariant?: StatusBadgeVariant
}

const STATUS_COLORS: Record<string, StatusBadgeVariant> = {
  DRAFT: 'offline',
  CREATED: 'offline',
  PREPARED: 'offline',
  CANCELLED: 'offline',
  DISCARDED: 'offline',
  Open: 'offline',

  IN_TRANSIT: 'info',
  ASSIGNED: 'info',
  IN_REVISION: 'info',
  PENDING: 'info',
  VERIFIED: 'info',
  BOOKED: 'info',
  TRANSFERRED: 'info',
  IN_APPROVAL: 'info',
  VERIFICATION_REQUIRED: 'info',

  CLOSED: 'success',
  PAID: 'success',
  APPROVED: 'success',

  ACTION_REQUIRED: 'warning',
  TASK: 'warning',
  REJECTED: 'warning',
  RETURNED: 'warning'
}

type StatusKey = keyof typeof ExpenseStatus | 'IN_APPROVAL' | 'VERIFICATION_REQUIRED' | 'Open'

type StatusLabelRow = { fluentKey: string; fallback: string; defaultType: PillType }

const BASE_STATUS_MAP: Record<StatusKey, StatusLabelRow> = {
  IN_APPROVAL: { fluentKey: 'expense-status-in-approval', fallback: 'In Approval', defaultType: 'task' },
  VERIFICATION_REQUIRED: {
    fluentKey: 'expense-status-verification-required',
    fallback: 'Verification Required',
    defaultType: 'waiting'
  },
  PREPARED: { fluentKey: 'expense-status-prepared', fallback: 'Prepared', defaultType: 'draft' },
  CREATED: { fluentKey: 'expense-status-draft', fallback: 'Draft', defaultType: 'draft' },
  ASSIGNED: { fluentKey: 'expense-status-assigned', fallback: 'Assigned', defaultType: 'waiting' },
  PENDING: { fluentKey: 'expense-status-in-approval', fallback: 'In Approval', defaultType: 'task' },
  APPROVED: { fluentKey: 'expense-status-approved', fallback: 'Approved', defaultType: 'completed' },
  RETURNED: { fluentKey: 'expense-status-returned', fallback: 'Returned', defaultType: 'waiting' },
  REJECTED: {
    fluentKey: 'expense-status-revision-required',
    fallback: 'Revision Required',
    defaultType: 'error'
  },
  VERIFIED: { fluentKey: 'expense-status-verified', fallback: 'Verified', defaultType: 'waiting' },
  BOOKED: { fluentKey: 'expense-status-booked', fallback: 'Booked', defaultType: 'waiting' },
  PAID: { fluentKey: 'expense-status-paid', fallback: 'Paid', defaultType: 'completed' },
  CLOSED: { fluentKey: 'expense-status-closed', fallback: 'Closed', defaultType: 'completed' },
  DISCARDED: { fluentKey: 'expense-status-discarded', fallback: 'Discarded', defaultType: 'error' },
  TRANSFERRED: { fluentKey: 'expense-status-transferred', fallback: 'Transferred', defaultType: 'completed' },
  Open: { fluentKey: 'expense-status-flow-open', fallback: 'Open', defaultType: 'draft' }
} as const

function resolveStatusLabel(fluentKey: string, fallback: string, t?: (key: string) => string): string {
  if (t) {
    return t(fluentKey)
  }
  return fallback
}

type EntityKind = 'item' | 'plan' | 'request' | 'advance'

const ENTITY_OVERRIDES: Partial<Record<EntityKind, Partial<Record<StatusKey, PillType>>>> = {
  item: {
    PENDING: 'waiting',
    APPROVED: 'waiting',
    VERIFIED: 'waiting',
    BOOKED: 'waiting',
    TRANSFERRED: 'waiting',
    REJECTED: 'task'
  },
  plan: {
    REJECTED: 'task'
  }
}

type LabelOverrideMap = Partial<Record<StatusKey, { fluentKey: string; fallback: string }>>

const ITEM_LABEL_OVERRIDES: LabelOverrideMap = {
  APPROVED: { fluentKey: 'expense-status-in-transit', fallback: 'In Transit' },
  VERIFIED: { fluentKey: 'expense-status-in-transit', fallback: 'In Transit' },
  BOOKED: { fluentKey: 'expense-status-in-transit', fallback: 'In Transit' },
  TRANSFERRED: { fluentKey: 'expense-status-in-transit', fallback: 'In Transit' }
}

const REQUEST_LABEL_OVERRIDES: LabelOverrideMap = {
  APPROVED: { fluentKey: 'expense-status-verification-required', fallback: 'Verification Required' },
  VERIFIED: { fluentKey: 'expense-status-booking-required', fallback: 'Booking Required' },
  BOOKED: { fluentKey: 'expense-status-transfer-required', fallback: 'Transfer Required' }
}

const ADVANCE_LABEL_OVERRIDES: LabelOverrideMap = {
  BOOKED: { fluentKey: 'expense-status-transfer-required', fallback: 'Transfer Required' },
  TRANSFERRED: { fluentKey: 'expense-status-payment-required', fallback: 'Payment Required' }
}

const ENTITY_LABEL_OVERRIDES: Partial<Record<EntityKind, LabelOverrideMap>> = {
  item: ITEM_LABEL_OVERRIDES,
  request: REQUEST_LABEL_OVERRIDES,
  advance: ADVANCE_LABEL_OVERRIDES
}

export const getEntityStatusDisplay = (
  entity: EntityKind,
  status: string,
  t?: (key: string) => string
): StatusDisplayConfig => {
  if (!status) {
    return { label: '', type: 'draft', badgeVariant: STATUS_COLORS.DRAFT }
  }

  const normalized = String(status)
  const base = BASE_STATUS_MAP[normalized as keyof typeof BASE_STATUS_MAP]

  if (!base) {
    return { label: status, type: 'draft', badgeVariant: STATUS_COLORS.DRAFT }
  }

  const overrideType = ENTITY_OVERRIDES[entity]?.[normalized as StatusKey]
  const type = overrideType ?? base.defaultType
  const labelOverride = ENTITY_LABEL_OVERRIDES[entity]?.[normalized as StatusKey]
  const { fluentKey, fallback } = labelOverride ?? base
  const label = resolveStatusLabel(fluentKey, fallback, t)
  const badgeVariant = STATUS_COLORS[normalized] ?? 'outline'
  return { label, type, badgeVariant }
}

export const getExpenseItemStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('item', status)

export function getExpenseItemStatusDisplayT(t: (key: string) => string, status: string): StatusDisplayConfig {
  return getEntityStatusDisplay('item', status, t)
}

export function getExpensePlanStatusDisplayT(t: (key: string) => string, status: string): StatusDisplayConfig {
  return getEntityStatusDisplay('plan', status, t)
}

export function getExpenseRequestStatusDisplayT(t: (key: string) => string, status: string): StatusDisplayConfig {
  return getEntityStatusDisplay('request', status, t)
}

export function getAdvancePaymentStatusDisplayT(t: (key: string) => string, status: string): StatusDisplayConfig {
  return getEntityStatusDisplay('advance', status, t)
}

export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('plan', status)

export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('request', status)

export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('advance', status)

function statusCodeToParenFluentKey(status: string): string {
  if (status === 'Open') {
    return 'expense-status-flow-open'
  }
  return `expense-status-${status.toLowerCase().replace(/_/g, '-')}`
}

/** When main and parenthetical status text are the same (e.g. both translate identically), omit the parens. */
export function statusFilterMainWithOptionalParen(mainLabel: string, parenLabel: string): string {
  if (mainLabel.trim().toLowerCase() === parenLabel.trim().toLowerCase()) {
    return mainLabel
  }
  return `${mainLabel} (${parenLabel})`
}

function buildEntityStatusFilterLabel(entity: EntityKind, status: string, t?: (key: string) => string): string {
  const statusConfig = getEntityStatusDisplay(entity, status, t)
  if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
    return statusConfig.label
  }
  const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
  if (t) {
    const parenKey = statusCodeToParenFluentKey(status)
    const parenLabel = resolveStatusLabel(parenKey, formattedStatus, t)
    return statusFilterMainWithOptionalParen(statusConfig.label, parenLabel)
  }
  return statusFilterMainWithOptionalParen(statusConfig.label, formattedStatus)
}

export function getExpenseRequestStatusFilterLabel(status: string, t?: (key: string) => string): string {
  return buildEntityStatusFilterLabel('request', status, t)
}

export function getAdvancePaymentStatusFilterLabel(status: string, t?: (key: string) => string): string {
  return buildEntityStatusFilterLabel('advance', status, t)
}

export function getExpensePlanStatusFilterLabel(status: string, t?: (key: string) => string): string {
  return buildEntityStatusFilterLabel('plan', status, t)
}
