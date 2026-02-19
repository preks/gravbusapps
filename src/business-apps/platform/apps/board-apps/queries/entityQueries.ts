/**
 * Entity Query Registry - types, utilities, and re-exports.
 *
 * The actual registry data lives in ./entityRegistry.ts to keep
 * each file focused and under 300 lines.
 */

import { ENTITY_REGISTRY } from './entityRegistry'

export { ENTITY_REGISTRY }

export interface EntityFieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'email' | 'url' | 'boolean'
  defaultVisible: boolean
  /** GraphQL path to extract value from response (dot-separated) */
  path: string
  /** Custom extractor for complex fields like communication arrays */
  extractor?: 'employeeEmail' | 'employeePhone'
}

export interface EntityQueryDef {
  displayName: string
  description: string
  query: string
  entityKey: string
  aggregateKey: string
  boolExpType: string
  orderByType: string
  fields: EntityFieldDef[]
}

/**
 * Resolve a dot-separated path against a nested object.
 * Supports numeric indices for arrays (e.g. "workingCondition.0.hireDate").
 */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    if (Array.isArray(current)) {
      const idx = Number(part)
      current = Number.isNaN(idx) ? undefined : current[idx]
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }
  return current
}

/**
 * Extract email from Employee communication array.
 */
function extractEmployeeEmail(communications: unknown): string | undefined {
  if (!Array.isArray(communications)) return undefined
  const entry = communications.find((c: Record<string, unknown>) => {
    const channel = c.channel as Record<string, unknown> | undefined
    const code = channel?.code as string | undefined
    const val = channel?.value as string | undefined
    return (code === 'e-mail' || val === 'Email' || val === 'E-Mail') && c.value
  })
  return entry?.value as string | undefined
}

/**
 * Extract phone from Employee communication array.
 */
function extractEmployeePhone(communications: unknown): string | undefined {
  if (!Array.isArray(communications)) return undefined
  const entry = communications.find((c: Record<string, unknown>) => {
    const channel = c.channel as Record<string, unknown> | undefined
    const code = channel?.code as string | undefined
    const val = channel?.value as string | undefined
    return (code === 'phone' || code === 'mobile' || val === 'Phone' || val === 'Mobile') && c.value
  })
  return entry?.value as string | undefined
}

/**
 * Flatten a raw GraphQL record into a board-friendly flat object
 * using the entity field definitions.
 */
export function flattenEntityRecord(
  record: Record<string, unknown>,
  fields: EntityFieldDef[]
): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.extractor === 'employeeEmail') {
      flat[field.key] = extractEmployeeEmail(record.communication)
    } else if (field.extractor === 'employeePhone') {
      flat[field.key] = extractEmployeePhone(record.communication)
    } else {
      const value = resolvePath(record, field.path)
      if (value !== undefined) {
        flat[field.key] = value
      }
    }
  }
  return flat
}

export function getEntityDef(entityType: string): EntityQueryDef | undefined {
  return ENTITY_REGISTRY[entityType]
}

export function getEntityTypes(): string[] {
  return Object.keys(ENTITY_REGISTRY)
}
