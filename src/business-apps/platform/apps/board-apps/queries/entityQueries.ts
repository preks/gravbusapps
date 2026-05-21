/**
 * Entity Query Registry - types, utilities, and re-exports.
 *
 * The actual registry data lives in ./entityRegistry.ts and
 * ./entityRegistryCrm.ts to keep each file focused and under 300 lines.
 */

import { ENTITY_REGISTRY_CORE } from './entityRegistry'
import { ENTITY_REGISTRY_ORG } from './entityRegistryOrg'
import { ENTITY_REGISTRY_CRM } from './entityRegistryCrm'

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

export const ENTITY_REGISTRY: Record<string, EntityQueryDef> = {
  ...ENTITY_REGISTRY_CORE,
  ...ENTITY_REGISTRY_ORG,
  ...ENTITY_REGISTRY_CRM
}

export type EntityCategory = 'hr' | 'recruiting' | 'organization' | 'crm' | 'finance' | 'other'

export const ENTITY_CATEGORY_LABEL_KEYS: Record<EntityCategory, string> = {
  hr: 'entity-category-hr',
  recruiting: 'entity-category-recruiting',
  organization: 'entity-category-organization',
  crm: 'entity-category-crm',
  finance: 'entity-category-finance',
  other: 'entity-category-other'
}

// Backward-compatible alias for older callers that still import this symbol.
export const ENTITY_CATEGORY_LABELS = ENTITY_CATEGORY_LABEL_KEYS

export const ENTITY_CATEGORY_ORDER: EntityCategory[] = ['hr', 'recruiting', 'organization', 'crm', 'finance', 'other']

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
  category: EntityCategory
  query: string
  entityKey: string
  aggregateKey: string
  boolExpType: string
  orderByType: string
  fields: EntityFieldDef[]
  /** When true, queries must be scoped to the active org structure via structureId */
  needsStructureFilter?: boolean
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function dateKeyFromGraphQLValue(value: string): string {
  return value.slice(0, 10)
}

function getActiveWorkingCondition(records: unknown[]): unknown {
  if (records.length === 0) {
    return undefined
  }

  if (records.length === 1) {
    return records[0]
  }

  const targetDateKey = formatLocalDate(new Date())

  return records.find(record => {
    if (record == null || typeof record !== 'object') {
      return false
    }

    const condition = record as Record<string, unknown>
    const activeFromKey = typeof condition.activeFrom === 'string' ? dateKeyFromGraphQLValue(condition.activeFrom) : ''
    const activeToKey = typeof condition.activeTo === 'string' ? dateKeyFromGraphQLValue(condition.activeTo) : ''

    if (!activeFromKey) {
      return false
    }

    return activeFromKey <= targetDateKey && (!activeToKey || activeToKey >= targetDateKey)
  })
}

/**
 * Resolve a dot-separated path against a nested object.
 * Supports numeric indices for arrays (e.g. "workingCondition.0.hireDate")
 * and "active" for working-condition history arrays.
 */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    if (Array.isArray(current)) {
      if (part === 'active') {
        current = getActiveWorkingCondition(current)
      } else {
        const idx = Number(part)
        current = Number.isNaN(idx) ? undefined : current[idx]
      }
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

/**
 * Build the default `where` conditions for an entity type.
 * - Always adds `isDeleted: {_eq: false}` (all entities support this).
 * - For org-structure-bound entities, adds `structureId: {_eq: ...}`
 *   using the active org structure from the platform context.
 */
export function buildEntityDefaultWhere(entityType: string, structureId?: string | null): Record<string, unknown> {
  const def = getEntityDef(entityType)
  if (!def) return {}

  const where: Record<string, unknown> = {
    isDeleted: { _eq: false }
  }

  if (def.needsStructureFilter && structureId) {
    where.structureId = { _eq: structureId }
  }

  return where
}

export function getEntityTypes(): string[] {
  return Object.keys(ENTITY_REGISTRY)
}

/** Returns entities grouped by category, ordered by ENTITY_CATEGORY_ORDER */
export function getEntitiesByCategory(t: TranslateFn): Array<{
  category: EntityCategory
  label: string
  entities: Array<{ key: string; def: EntityQueryDef }>
}> {
  const grouped = new Map<EntityCategory, Array<{ key: string; def: EntityQueryDef }>>()
  for (const [key, def] of Object.entries(ENTITY_REGISTRY)) {
    const list = grouped.get(def.category) ?? []
    list.push({ key, def })
    grouped.set(def.category, list)
  }
  return ENTITY_CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(cat => ({
    category: cat,
    label: t(ENTITY_CATEGORY_LABEL_KEYS[cat]),
    entities: grouped.get(cat)!
  }))
}

/**
 * Serialize the entity registry into a compact catalog string for AI prompts.
 * Each entity is listed with its key, display name, description, category,
 * and field names/types -- so the AI can reason about available data sources.
 */
export function serializeRegistryCatalog(): string {
  return Object.entries(ENTITY_REGISTRY)
    .map(([key, def]) => {
      const fields = def.fields.map(f => `${f.key}(${f.type})`).join(', ')
      return `[${key}] "${def.displayName}" - ${def.description} (category: ${def.category})\n  Fields: ${fields}`
    })
    .join('\n')
}
