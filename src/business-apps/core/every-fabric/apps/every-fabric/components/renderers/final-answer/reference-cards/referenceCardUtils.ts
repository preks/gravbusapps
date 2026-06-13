import { PROTOCOL_REDIRECTS } from '@/business-apps/platform/apps/every-ai/components/links/constants'
import type { EntityReference } from '../../../../types/enterpriseAgent'

/**
 * Shared helpers for the entity reference cards. Card components consume the
 * loosely-typed results of the platform's by-id GraphQL hooks, so every
 * accessor here treats its input as `unknown` and extracts defensively — a
 * missing or unexpectedly-shaped field never throws, it just renders nothing.
 */

export interface ReferenceCardProps {
  reference: EntityReference
  accessToken: string
}

/**
 * Resolve a reference protocol to the effective entity type, applying the same
 * relation -> parent redirects the inline `EntityLink` resolver uses (e.g.
 * `account_contact` -> `contact`). Keeps card dispatch consistent with chips.
 */
export function resolveEffectiveType(type: string): string {
  return PROTOCOL_REDIRECTS[type] ?? type
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : undefined
}

/** Read a `CatalogEntry`-like value (`{ value }`) or a plain string. */
export function catalogValue(input: unknown): string | undefined {
  if (!input) return undefined
  if (typeof input === 'string') return input.trim() || undefined
  const value = asRecord(input)?.value
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** Read a non-empty string field off an unknown object. */
export function getStr(input: unknown, key: string): string | undefined {
  const value = asRecord(input)?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** Read a numeric field off an unknown object. */
export function getNum(input: unknown, key: string): number | undefined {
  const value = asRecord(input)?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Read a nested object/array field off an unknown object. */
export function getField(input: unknown, key: string): unknown {
  return asRecord(input)?.[key]
}

/** Best-effort human name for an employee-shaped record. */
export function personName(person: unknown): string | undefined {
  const full = getStr(person, 'fullName') ?? getStr(person, 'displayName')
  if (full) return full
  const first = getStr(person, 'firstName') ?? ''
  const last = getStr(person, 'lastName') ?? ''
  const joined = `${first} ${last}`.trim()
  return joined || undefined
}

/** Read a string off the optional, backend-provided `reference.data` bag. */
export function dataStr(data: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = data?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Small, human-friendly context label derived from the backend `intent` hint.
 * Returns `undefined` for intents that should not surface a label (e.g. the
 * answer's own subject, where the name already carries the meaning).
 */
const INTENT_LABELS: Record<string, string> = {
  manager: 'Manager',
  reports_to: 'Reports to',
  team_member: 'Team member',
  owner: 'Owner'
}

export function intentLabel(intent?: string): string | undefined {
  if (!intent) return undefined
  return INTENT_LABELS[intent]
}

/** Whether a reference should be visually highlighted / sorted first. */
export function isEmphasized(reference: EntityReference): boolean {
  return reference.emphasis === 'answer_focus' || reference.emphasis === 'primary'
}

/** Compact currency-ish amount label, e.g. `EUR 12,500`. */
export function formatAmount(amount: number | undefined, currency: string | undefined): string | undefined {
  if (amount === undefined) return undefined
  const formatted = amount.toLocaleString()
  return currency ? `${currency} ${formatted}` : formatted
}

/** `2026-06-12T...` -> `Jun 12, 2026`; passthrough on parse failure. */
export function formatDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Compact "time ago" for recency facts (e.g. `Updated`). Falls back to the
 * short absolute date for anything older than ~a month, and passes the raw
 * value through on parse failure so we never render `Invalid Date`.
 */
export function relativeOrShortDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return formatDate(value)
}

/** `Jun 12, 14:30` style label for meeting time ranges. */
export function formatDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** `14:30` style clock label, used for a meeting's end time after the start. */
export function formatClock(value: string | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Pluralised count chip, e.g. `3 sheets`, `1 page`. Hidden for falsy counts. */
export function countChip(count: number | undefined, singular: string, plural = `${singular}s`): string | undefined {
  if (!count || count < 1) return undefined
  return `${count} ${count === 1 ? singular : plural}`
}

/** Title-case a snake/kebab status token, e.g. `pending_approval` -> `Pending Approval`. */
export function humanizeToken(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Strip HTML tags and collapse whitespace into a short plain-text preview,
 * for content entities (documents/notes) whose `content` is rich HTML.
 */
export function plainTextPreview(value: string | undefined, maxLength = 160): string | undefined {
  if (!value) return undefined
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return undefined
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

/**
 * Extract a communication-channel value (email / phone / mobile) from a CRM
 * `communicationChannels` array. Each entry is shaped
 * `{ value, communicationChannel: { value | code } }`; we match the channel
 * type loosely (case-insensitive substring) so backend label drift never
 * breaks the lookup. Returns the first matching channel's value.
 */
export function commChannelValue(channels: unknown, kind: 'email' | 'phone' | 'mobile'): string | undefined {
  if (!Array.isArray(channels)) return undefined
  const matches = (channel: unknown): boolean => {
    const ref = getField(channel, 'communicationChannel')
    const label = (catalogValue(ref) ?? getStr(channel, 'communicationChannelRef') ?? '').toLowerCase()
    if (kind === 'email') return label.includes('mail')
    if (kind === 'mobile') return label.includes('mobile') || label.includes('cell')
    return label.includes('phone') || label.includes('tel')
  }
  for (const channel of channels) {
    if (matches(channel)) {
      const value = getStr(channel, 'value')
      if (value) return value
    }
  }
  return undefined
}
