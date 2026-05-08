export type BadgeStatusVariant = 'default' | 'success' | 'destructive' | 'pending' | 'warning' | 'outline'

const STATUS_VARIANT_MAP: Record<string, BadgeStatusVariant> = {
  APPROVED: 'success',
  REJECTED: 'destructive',
  PENDING: 'pending',
  PLANNED: 'warning',
  CANCELLED: 'outline',
  IN_CANCELLATION: 'warning'
}

export const statusVariant = (status: string): BadgeStatusVariant =>
  STATUS_VARIANT_MAP[status.toUpperCase()] ?? 'default'
