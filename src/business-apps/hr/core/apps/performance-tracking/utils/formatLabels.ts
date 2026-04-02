const REVIEWER_TYPE_MAP: Record<string, string> = {
  SELF_EVALUATION_PARTICIPANT_TYPE: 'Self',
  PEER_EVALUATION_PARTICIPANT_TYPE: 'Peer',
  MANAGER_EVALUATION_PARTICIPANT_TYPE: 'Manager'
}

const REVIEWER_STATUS_MAP: Record<string, string> = {
  COMPLETED_REVIEWER_STATUS: 'Completed',
  IN_PROGRESS_REVIEWER_STATUS: 'In Progress',
  PENDING_APPROVAL_REVIEWER_STATUS: 'Pending Approval',
  APPROVED_REVIEWER_STATUS: 'Approved',
  PENDING_REVIEWER_STATUS: 'Pending',
  ASSIGNED_REVIEWER_STATUS: 'Assigned'
}

/**
 * Humanize a reviewer type value like "SELF_EVALUATION_PARTICIPANT_TYPE" → "Self".
 */
export function formatReviewerType(raw: string | null): string {
  if (!raw) return 'Unknown'
  return REVIEWER_TYPE_MAP[raw] ?? humanizeFallback(raw)
}

/**
 * Humanize a reviewer status value like "COMPLETED_REVIEWER_STATUS" → "Completed".
 */
export function formatReviewerStatus(raw: string | null): string {
  if (!raw) return 'Unknown'
  return REVIEWER_STATUS_MAP[raw] ?? humanizeFallback(raw)
}

/**
 * Humanize a statusRef value like "EvaluationStatus:v1:IN_PROGRESS" → "In progress".
 */
export function formatStatusRef(raw: string | null): string {
  if (!raw) return 'Unknown'
  const parts = raw.split(':')
  const token = parts[parts.length - 1] ?? raw
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
