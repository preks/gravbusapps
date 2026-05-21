import type { JSONObject, JSONValue } from '@/common/types/i18nTypes'

export const isObjectRecord = (value: JSONValue | undefined): value is JSONObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const toStringValue = (value: JSONValue | undefined, fallback: string): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

export const toBooleanValue = (value: JSONValue | undefined, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

export const toStringArray = (value: JSONValue | undefined): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export const toNumberValue = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
