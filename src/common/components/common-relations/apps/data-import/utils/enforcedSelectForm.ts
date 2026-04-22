/**
 * Enforced-select form helpers
 *
 * Pure helpers that bridge `ImportConfig.enforcedSelects` with a
 * `react-hook-form` instance. They own no fetches, no options, and no
 * cascade state — those concerns are handled inside `CatalogSelect`
 * (via `parentField` / `requireSourceForEnable`).
 *
 * Exports:
 *  - `buildEnforcedSelectDefaults(configs)`: seed map for `useForm`
 *    (`defaultParentEntryRef` pre-fills hidden chain roots).
 *  - `allEnforcedRequiredSatisfied(configs, values)`: whether every
 *    visible required select has a non-empty value.
 *  - `buildEnforcedSelectMap(configs, values)`: `{ [targetField]: value }`
 *    map of every non-hidden, non-empty selection for the conversion
 *    request.
 */

import type { EnforcedSelectConfig } from '@/common/components/common-relations/apps/data-import/types'

export type EnforcedSelectValues = Record<string, string>

export function buildEnforcedSelectDefaults(configs: EnforcedSelectConfig[] | undefined): EnforcedSelectValues {
  const defaults: EnforcedSelectValues = {}
  if (!configs) return defaults
  for (const cfg of configs) {
    defaults[cfg.id] = cfg.defaultParentEntryRef ?? ''
  }
  return defaults
}

export function allEnforcedRequiredSatisfied(
  configs: EnforcedSelectConfig[] | undefined,
  values: EnforcedSelectValues
): boolean {
  if (!configs) return true
  for (const cfg of configs) {
    if (!cfg.required) continue
    const value = values[cfg.id]
    if (!value) return false
  }
  return true
}

export function buildEnforcedSelectMap(
  configs: EnforcedSelectConfig[] | undefined,
  values: EnforcedSelectValues
): Record<string, string> | undefined {
  if (!configs) return undefined
  const enforced: Record<string, string> = {}
  for (const cfg of configs) {
    if (cfg.hidden || !cfg.targetField) continue
    const value = values[cfg.id]
    if (value) {
      enforced[cfg.targetField] = value
    }
  }
  return Object.keys(enforced).length > 0 ? enforced : undefined
}
