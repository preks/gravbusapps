/**
 * Counter of background saves fired by PerformanceTab.
 * PerformanceTab installs a capture-phase listener that calls
 * stopImmediatePropagation() for each pending silent save,
 * preventing EmployeeRecord from seeing the completion and calling refetch().
 */
let pendingSilentSaveCount = 0

/** Call before each silent startProcess invocation. */
export function beginSilentSave(): void {
  pendingSilentSaveCount++
}

/**
 * Call from the capture-phase processCompletion handler.
 * Returns true (and consumes one slot) if this completion should be suppressed.
 */
export function tryConsumeSilentSave(): boolean {
  if (pendingSilentSaveCount > 0) {
    pendingSilentSaveCount--
    return true
  }
  return false
}
