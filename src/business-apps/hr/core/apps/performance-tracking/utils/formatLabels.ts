type TranslateFn = (key: string, vars?: Record<string, unknown>) => string

const REVIEWER_TYPE_I18N: Record<string, string> = {
  SELF_EVALUATION_PARTICIPANT_TYPE: 'reviewer-type-self',
  PEER_EVALUATION_PARTICIPANT_TYPE: 'reviewer-type-peer',
  MANAGER_EVALUATION_PARTICIPANT_TYPE: 'reviewer-type-manager'
}

const REVIEWER_TYPE_MAP: Record<string, string> = {
  SELF_EVALUATION_PARTICIPANT_TYPE: 'Self',
  PEER_EVALUATION_PARTICIPANT_TYPE: 'Peer',
  MANAGER_EVALUATION_PARTICIPANT_TYPE: 'Manager'
}

const REVIEWER_STATUS_I18N: Record<string, string> = {
  COMPLETED_REVIEWER_STATUS: 'status-completed',
  IN_PROGRESS_REVIEWER_STATUS: 'status-in-progress',
  PENDING_APPROVAL_REVIEWER_STATUS: 'status-pending',
  APPROVED_REVIEWER_STATUS: 'status-approved',
  PENDING_REVIEWER_STATUS: 'status-pending',
  ASSIGNED_REVIEWER_STATUS: 'status-assigned'
}

const REVIEWER_STATUS_MAP: Record<string, string> = {
  COMPLETED_REVIEWER_STATUS: 'Completed',
  IN_PROGRESS_REVIEWER_STATUS: 'In Progress',
  PENDING_APPROVAL_REVIEWER_STATUS: 'Pending',
  APPROVED_REVIEWER_STATUS: 'Approved',
  PENDING_REVIEWER_STATUS: 'Pending',
  ASSIGNED_REVIEWER_STATUS: 'Assigned'
}

const STATUS_REF_I18N: Record<string, string> = {
  COMPLETED: 'status-completed',
  IN_PROGRESS: 'status-in-progress',
  PENDING: 'status-pending',
  APPROVED: 'status-approved',
  ASSIGNED: 'status-assigned'
}

export function formatReviewerType(raw: string | null, t?: TranslateFn): string {
  if (!raw) return t ? t('reviewer-type-unknown') : 'Unknown'
  if (t) {
    const key = REVIEWER_TYPE_I18N[raw]
    if (key) return t(key)
  }
  return REVIEWER_TYPE_MAP[raw] ?? humanizeFallback(raw)
}

export function formatReviewerStatus(raw: string | null, t?: TranslateFn): string {
  if (!raw) return t ? t('status-unknown') : 'Unknown'
  if (t) {
    const key = REVIEWER_STATUS_I18N[raw]
    if (key) return t(key)
  }
  return REVIEWER_STATUS_MAP[raw] ?? humanizeFallback(raw)
}

export function formatStatusRef(raw: string | null, t?: TranslateFn): string {
  if (!raw) return t ? t('status-unknown') : 'Unknown'
  const parts = raw.split(':')
  const token = parts[parts.length - 1] ?? raw
  if (t) {
    const key = STATUS_REF_I18N[token]
    if (key) return t(key)
  }
  return humanizeFallback(token)
}

function humanizeFallback(raw: string): string {
  const stripped = raw
    .replace(/_PARTICIPANT_TYPE$/i, '')
    .replace(/_REVIEWER_STATUS$/i, '')
    .replace(/_STATUS$/i, '')
    .replace(/_TYPE$/i, '')
  const words = stripped.split('_').filter(Boolean)
  if (words.length === 0) return raw
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ')
}

export function formatDate(raw: string | null, fallback = '—'): string {
  if (!raw) return fallback
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function getStatusBadgeVariant(status: string | null): 'success' | 'info' | 'secondary' | 'warning' {
  const normalized = (status ?? '').toUpperCase()
  if (normalized.includes('COMPLETED') || normalized.includes('DONE')) return 'success'
  if (normalized.includes('IN_PROGRESS') || normalized.includes('ACTIVE')) return 'info'
  if (normalized.includes('APPROVED')) return 'info'
  if (normalized.includes('PENDING') || normalized.includes('ASSIGNED') || normalized.includes('DRAFT'))
    return 'warning'
  return 'secondary'
}
