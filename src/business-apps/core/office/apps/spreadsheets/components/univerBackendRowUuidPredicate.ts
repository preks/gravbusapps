/**
 * 2a: Single authoritative resolver for the backend row UUID predicate.
 *
 * Background: hosts historically wired two independent predicate slots — `isUuidForRowRemap`
 * (used by emit dispatch) and a separate local that resolve created via the same fallback. If a
 * host overrode one but not the other, resolve and emit could silently disagree on which row id
 * counts as "backend persisted", drifting identity remap decisions.
 *
 * This resolver collapses both into a single source of truth:
 *   1. `isBackendRowUuid` (new, preferred name)
 *   2. `isUuidForRowRemap` (deprecated alias, still honored for one release)
 *   3. `isSpreadsheetBackendRowUuid` default
 *
 * When BOTH the new and old slots are provided AND not referentially equal, the resolver warns
 * once per process so the host can migrate cleanly. The new name always wins on conflict.
 */
import { isSpreadsheetBackendRowUuid } from '../utils/spreadsheetRowIdentity'

export interface BackendRowUuidPredicateSlots {
  isBackendRowUuid?: (value: string) => boolean
  isUuidForRowRemap?: (value: string) => boolean
}

let conflictWarningEmitted = false

export function resolveBackendRowUuidPredicate(slots: BackendRowUuidPredicateSlots): (value: string) => boolean {
  const next = slots.isBackendRowUuid
  const legacy = slots.isUuidForRowRemap
  if (next && legacy && next !== legacy && !conflictWarningEmitted) {
    conflictWarningEmitted = true
    console.warn(
      '[SPREADSHEET_PERSIST] backend_row_uuid_predicate_conflict: both `isBackendRowUuid` and the deprecated `isUuidForRowRemap` were provided and are not referentially equal. The new predicate wins; please remove the legacy slot.'
    )
  }
  return next ?? legacy ?? isSpreadsheetBackendRowUuid
}

/**
 * Reads host predicates from `propsRef.current` so conflict detection compares the actual
 * callbacks the grid received — not internal bootstrap wrapper functions (which are never
 * referentially equal).
 */
export function resolveBackendRowUuidPredicateFromGridProps(propsRef: {
  current: BackendRowUuidPredicateSlots
}): (value: string) => boolean {
  const { isBackendRowUuid, isUuidForRowRemap } = propsRef.current
  return resolveBackendRowUuidPredicate({ isBackendRowUuid, isUuidForRowRemap })
}

/** @internal test-only reset for the one-shot conflict warning latch. */
export function __resetBackendRowUuidPredicateWarningForTests(): void {
  conflictWarningEmitted = false
}
