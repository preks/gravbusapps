import { AnalyticsContact } from '../types/analytics-context'

export type Nullable<T> = T | null | undefined

export function limitArray<T>(items: Nullable<T[]>, limit: number): T[] {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }
  return items.slice(0, Math.max(0, limit))
}

export function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc
    }
    if (Array.isArray(value) && value.length === 0) {
      return acc
    }
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0
    ) {
      return acc
    }
    acc[key] = value
    return acc
  }, {})
}

export function isEmptyObject(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  )
}

export function normalizePhone(value: Nullable<string>): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function normalizeEmail(value: Nullable<string>): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildContactFromOwner(
  owner?: Nullable<{ id?: string; displayName?: string; employeePosition?: { jobPosition?: { name?: string } } }>
): AnalyticsContact | null {
  if (!owner?.id) return null
  const jobTitle = owner.employeePosition?.jobPosition?.name
  return {
    id: owner.id,
    name: owner.displayName || undefined,
    relation: 'ownerEmployee',
    role: jobTitle || undefined,
    type: 'employee'
  }
}

export function buildContactFromAccountOwner(
  owner?: Nullable<{ id?: string; displayName?: string; employeePosition?: { jobPosition?: { name?: string } } }>
): AnalyticsContact | null {
  if (!owner?.id) return null
  const jobTitle = owner.employeePosition?.jobPosition?.name
  return {
    id: owner.id,
    name: owner.displayName || undefined,
    relation: 'accountOwner',
    role: jobTitle || undefined,
    type: 'employee'
  }
}
