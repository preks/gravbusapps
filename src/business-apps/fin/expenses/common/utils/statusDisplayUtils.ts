import { PillType } from '@/components/pill/Pill'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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

type LabelOverrideMap = Partial<Record<StatusKey, { i18nKey: string; fallback: string }>>

const ITEM_LABEL_OVERRIDES: LabelOverrideMap = {
  APPROVED: { i18nKey: 'lowcoder:expense_statuses.in_transit', fallback: 'In Transit' },
  VERIFIED: { i18nKey: 'lowcoder:expense_statuses.in_transit', fallback: 'In Transit' },
  BOOKED: { i18nKey: 'lowcoder:expense_statuses.in_transit', fallback: 'In Transit' },
  TRANSFERRED: { i18nKey: 'lowcoder:expense_statuses.in_transit', fallback: 'In Transit' }
}

const REQUEST_LABEL_OVERRIDES: LabelOverrideMap = {
  APPROVED: { i18nKey: 'lowcoder:expense_statuses.verification_required', fallback: 'Verification Required' },
  VERIFIED: { i18nKey: 'lowcoder:expense_statuses.booking_required', fallback: 'Booking Required' },
  BOOKED: { i18nKey: 'lowcoder:expense_statuses.transfer_required', fallback: 'Transfer Required' }
}

const ADVANCE_LABEL_OVERRIDES: LabelOverrideMap = {
  BOOKED: { i18nKey: 'lowcoder:expense_statuses.transfer_required', fallback: 'Transfer Required' },
  TRANSFERRED: { i18nKey: 'lowcoder:expense_statuses.payment_required', fallback: 'Payment Required' }
}

const ENTITY_LABEL_OVERRIDES: Partial<Record<EntityKind, LabelOverrideMap>> = {
  item: ITEM_LABEL_OVERRIDES,
  request: REQUEST_LABEL_OVERRIDES,
  advance: ADVANCE_LABEL_OVERRIDES
}

export const getEntityStatusDisplay = (entity: EntityKind, status: string): StatusDisplayConfig => {
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
  const { i18nKey, fallback } = labelOverride ?? base
  const label = getTranslationFromI18nKeyAndLabel(i18nKey, fallback)
  const badgeVariant = STATUS_COLORS[normalized] ?? 'outline'
  return { label, type, badgeVariant }
}

export const getExpenseItemStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('item', status)

export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('plan', status)

export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('request', status)

export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig =>
  getEntityStatusDisplay('advance', status)

function buildEntityStatusFilterLabel(entity: EntityKind, status: string): string {
  const statusConfig = getEntityStatusDisplay(entity, status)
  if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
    return statusConfig.label
  }
  const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
  const translatedStatus = getTranslationFromI18nKeyAndLabel(
    `lowcoder:expense_statuses.${status.toLowerCase()}`,
    formattedStatus
  )
  return `${statusConfig.label} (${translatedStatus})`
}

export function getExpenseRequestStatusFilterLabel(status: string): string {
  return buildEntityStatusFilterLabel('request', status)
}

export function getAdvancePaymentStatusFilterLabel(status: string): string {
  return buildEntityStatusFilterLabel('advance', status)
}

export function getExpensePlanStatusFilterLabel(status: string): string {
  return buildEntityStatusFilterLabel('plan', status)
}
