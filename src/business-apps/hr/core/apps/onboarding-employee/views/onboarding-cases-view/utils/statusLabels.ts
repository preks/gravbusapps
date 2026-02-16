import type { CaseStatus } from '@/business-apps/common/apps/case-management/types'

const STATUS_KEYS: Record<CaseStatus, string> = {
  open: 'onboarding-employee-status-open',
  in_progress: 'onboarding-employee-status-in-progress',
  blocked: 'onboarding-employee-status-blocked',
  completed: 'onboarding-employee-status-completed',
  cancelled: 'onboarding-employee-status-cancelled'
}

export function getStatusLabel(
  status: string,
  t: (key: string) => string
): {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
} {
  const s = status as CaseStatus
  const variant =
    s === 'open'
      ? 'outline'
      : s === 'in_progress'
        ? 'secondary'
        : s === 'blocked'
          ? 'destructive'
          : s === 'completed'
            ? 'default'
            : 'outline'
  const key = STATUS_KEYS[s]
  const label = key ? t(key) : status
  return { label, variant }
}
