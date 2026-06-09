import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

/** Human relative time, e.g. "in 2 hours" / "3 days ago". Empty when no date. */
export function relativeFromNow(value?: string | Date | null): string {
  if (!value) return ''
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.fromNow() : ''
}

/** True when the given timestamp is in the past. */
export function isPast(value?: string | Date | null): boolean {
  if (!value) return false
  const parsed = dayjs(value)
  return parsed.isValid() && parsed.isBefore(dayjs())
}

/** Initials for an avatar fallback, derived from a display name. */
export function initialsFromName(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return `${first}${last}`.toUpperCase() || '?'
}
