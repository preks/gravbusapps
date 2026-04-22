/**
 * Applies `defaultValueRef` fallbacks declared on `ImportConfig.enforcedSelects`
 * to an entity about to be submitted.
 *
 * Runs in the submission pipeline before any domain-specific
 * `prepareEntityForSubmission` hook, so strategies no longer need to carry
 * hardcoded domain defaults (e.g. `SalesLeadStatus:v1:OPEN`).
 *
 * Each enforced select's `targetField` is a dotted path. For `a.b.c`:
 *  - The value is considered "missing" when no leaf is set and no parent
 *    segment holds a non-empty value at that path.
 *  - When missing, the path is created and the default is written.
 *
 * Top-level keys (no dot) are handled by the same path walk.
 */

import type { EnforcedSelectConfig } from '@/common/components/common-relations/apps/data-import/types'
import { isPlainRecord } from './dottedKeys'

function readDottedPath(root: Record<string, any>, path: string): unknown {
  const segments = path.split('.')
  let cursor: any = root
  for (const segment of segments) {
    if (!isPlainRecord(cursor)) return undefined
    cursor = cursor[segment]
  }
  return cursor
}

function writeDottedPath(root: Record<string, any>, path: string, value: string): void {
  const segments = path.split('.')
  let cursor: Record<string, any> = root
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const next = cursor[segment]
    if (!isPlainRecord(next)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, any>
  }
  cursor[segments[segments.length - 1]] = value
}

function isMissingValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim().length === 0) return true
  return false
}

export function applyEnforcedSelectDefaults(
  entity: Record<string, any>,
  enforcedSelects: EnforcedSelectConfig[] | undefined
): Record<string, any> {
  if (!enforcedSelects || enforcedSelects.length === 0) return entity

  let result: Record<string, any> | null = null
  for (const select of enforcedSelects) {
    if (!select.defaultValueRef) continue
    const current = readDottedPath(result ?? entity, select.targetField)
    if (!isMissingValue(current)) continue
    result ??= { ...entity }
    writeDottedPath(result, select.targetField, select.defaultValueRef)
  }

  return result ?? entity
}
