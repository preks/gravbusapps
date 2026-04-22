/**
 * Aggregates the LLM-only context that the data-import flow needs to send
 * to Flowbot's `map-from-file` endpoint when importing investments.
 *
 * The Flowbot LLM otherwise only sees database fields. Without this
 * helper it has no way to know about the dynamic `additionalProperties.*`
 * attributes that admins configure per `InvestmentGroup` /
 * `InvestmentType` / `InvestmentLiquidFundType` catalog entry, nor the
 * `requiredSubtypeKey` wrapper key that the backend uses to nest those
 * attributes in the persisted payload.
 *
 * Output is consumed strictly inside `ImportAnalyzer.analyzeImport` and
 * never surfaces in the UI — users must not be made aware of it.
 */

import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

export interface InvestmentGroupAnalyzerContext {
  /**
   * Value of `objectValue.requiredSubtypeKey` on the `InvestmentGroup`
   * root entry (e.g. `'liquidFundInvestment'`). Empty string when the
   * root entry has no `requiredSubtypeKey` or when the root cannot be
   * located — Flowbot always receives the field, so an empty string is
   * the explicit "none" signal.
   */
  requiredSubtypeKey: string
  /**
   * Full `property` paths of every dynamic `additionalProperties.*` field
   * declared on any `formFields[*].fields[*]` entry in the
   * `InvestmentGroup` catalog subtree (root + transitive descendants).
   *
   * - Filter: the `property` string must contain `.additionalProperties.`.
   * - Values are sent through verbatim (no last-segment extraction) so the
   *   LLM can reason about full dotted paths.
   * - Deduped across the whole subtree to avoid the LLM seeing the same
   *   path twice when two `InvestmentType`s expose the same attribute.
   * - Insertion-ordered for stable diffs across renders.
   */
  additionalPropertiesFields: string[]
}

const ADDITIONAL_PROPERTIES_MARKER = '.additionalProperties.'

/**
 * Tolerant `objectValue` parser. Catalog `objectValue` is `jsonb` on the
 * server and most code paths receive it as a parsed object, but a few
 * paths still pass it through as a raw JSON string — mirror the
 * tolerance used by `useInvestmentTypes`.
 */
const parseObjectValue = (objectValue: unknown): Record<string, unknown> | null => {
  if (!objectValue) return null
  if (typeof objectValue === 'string') {
    try {
      const parsed = JSON.parse(objectValue) as unknown
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  if (typeof objectValue === 'object') return objectValue as Record<string, unknown>
  return null
}

/**
 * Collect every `field.property` string from the `formFields` array shape
 * declared by the catalog. Defensive against malformed entries — anything
 * that doesn't fit the expected `{ fields: { property }[] }[]` shape is
 * silently skipped.
 */
const collectFieldPropertiesFromFormFields = (parsedObjectValue: Record<string, unknown> | null): string[] => {
  if (!parsedObjectValue) return []
  const formFields = parsedObjectValue.formFields
  if (!Array.isArray(formFields)) return []

  const properties: string[] = []
  for (const group of formFields) {
    if (!group || typeof group !== 'object') continue
    const fields = (group as { fields?: unknown }).fields
    if (!Array.isArray(fields)) continue
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue
      const property = (field as { property?: unknown }).property
      if (typeof property === 'string' && property.length > 0) {
        properties.push(property)
      }
    }
  }
  return properties
}

/**
 * Walk the InvestmentGroup catalog subtree (root + every transitive
 * descendant via `parentEntryId`) and aggregate the LLM context.
 *
 * - `requiredSubtypeKey` is read from the root only — descendants do not
 *   override it.
 * - `additionalPropertiesFields` is the deduped union of *every* matching
 *   property path across the entire subtree, regardless of which level
 *   declares it (per product requirement: send ALL additional attributes,
 *   regardless of where they live for a specific group).
 */
export function aggregateInvestmentGroupContext(
  groupId: string | undefined | null,
  allTypes: readonly CatalogEntry[] | undefined | null
): InvestmentGroupAnalyzerContext {
  const empty: InvestmentGroupAnalyzerContext = { requiredSubtypeKey: '', additionalPropertiesFields: [] }
  if (!groupId || !allTypes || allTypes.length === 0) return empty

  const root = allTypes.find(entry => entry.id === groupId)
  if (!root) return empty

  const rootObjectValue = parseObjectValue(root.objectValue)
  const rawRequiredSubtypeKey = rootObjectValue?.requiredSubtypeKey
  const requiredSubtypeKey = typeof rawRequiredSubtypeKey === 'string' ? rawRequiredSubtypeKey : ''

  const subtreeIds = new Set<string>([root.id])
  const stack: string[] = [root.id]
  while (stack.length > 0) {
    const currentId = stack.pop()!
    for (const entry of allTypes) {
      if (entry.parentEntryId === currentId && !subtreeIds.has(entry.id)) {
        subtreeIds.add(entry.id)
        stack.push(entry.id)
      }
    }
  }

  const dedupedFields = new Set<string>()
  for (const entry of allTypes) {
    if (!subtreeIds.has(entry.id)) continue
    const parsed = parseObjectValue(entry.objectValue)
    const properties = collectFieldPropertiesFromFormFields(parsed)
    for (const property of properties) {
      if (property.includes(ADDITIONAL_PROPERTIES_MARKER)) {
        dedupedFields.add(property)
      }
    }
  }

  return { requiredSubtypeKey, additionalPropertiesFields: [...dedupedFields] }
}
