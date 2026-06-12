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
