export const FALLBACK_ACTIVITY_STATUS_TEXT = 'Working on it...'

const STATUS_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const STATUS_EMAIL_RE = /[^\s@.]{1,64}@[^\s@.]{1,64}(?:\.[^\s@.]{1,64}){1,4}/
const STATUS_STACK_RE = /(?:^|\n)[ \t]{1,16}at[ \t]{1,16}\S{1,200}/
const STATUS_STRIP_PREFIX_RE = /🔄[ \t]{0,4}/
const STATUS_MAX_LEN = 200

export const isUnsafeActivityStatusText = (text: string): boolean => {
  const trimmed = text.trim()
  if (!trimmed) return true
  if (trimmed.length > STATUS_MAX_LEN) return true
  const first = trimmed.charAt(0)
  if (first === '{' || first === '[' || first === '<') return true
  if (STATUS_UUID_RE.test(trimmed)) return true
  if (STATUS_EMAIL_RE.test(trimmed)) return true
  if (STATUS_STACK_RE.test(trimmed)) return true
  const lowered = trimmed.toLowerCase()
  return (
    lowered.includes('traceback (most recent call last)') ||
    lowered.includes("client error '4") ||
    lowered.includes("client error '5")
  )
}

export const sanitizeActivityStatusText = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const stripped = raw.replace(STATUS_STRIP_PREFIX_RE, '').trim()
  if (!stripped) return null
  if (isUnsafeActivityStatusText(stripped)) return FALLBACK_ACTIVITY_STATUS_TEXT
  return stripped
}

const normalizeForCompare = (text: string): string => text.trim().toLowerCase()

export const activityLabelsEqual = (a: string, b: string): boolean => normalizeForCompare(a) === normalizeForCompare(b)

/** Trim leading/trailing hyphens in O(n) without regex (avoids ReDoS on edge-trim patterns). */
const trimEdgeHyphens = (value: string): string => {
  let start = 0
  let end = value.length
  while (start < end && value[start] === '-') start += 1
  while (end > start && value[end - 1] === '-') end -= 1
  return value.slice(start, end)
}

export const activityStepId = (label: string): string => {
  const slug = trimEdgeHyphens(
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
  ).slice(0, 80)
  return slug || 'activity-step'
}
