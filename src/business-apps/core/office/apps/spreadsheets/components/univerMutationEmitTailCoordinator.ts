/**
 * Serializes {@link HandleDetectedCellMutation} work per worksheet emit key so
 * `sheet-value-changed`, `sheet-edit-ended`, and post-commit `selection-reconcile`
 * do not race (especially when materializing sparse/new rows before HTTP batch).
 */
export type MutationEmitTailCoordinator = {
  /** Queue work after any in-flight mutation for `tailKey`. */
  enqueue: (tailKey: string, run: () => Promise<void>) => Promise<void>
  /** Wait until the current tail for `tailKey` finishes (no-op when idle). */
  awaitTail: (tailKey: string) => Promise<void>
  /** True while a tail promise is registered for `tailKey`. */
  hasPendingTail: (tailKey: string) => boolean
}

export function createMutationEmitTailCoordinator(): MutationEmitTailCoordinator {
  const emitTailByKey = new Map<string, Promise<void>>()

  const enqueue: MutationEmitTailCoordinator['enqueue'] = (tailKey, run) => {
    const previous = emitTailByKey.get(tailKey) ?? Promise.resolve()
    const next = previous
      .catch(() => undefined)
      .then(() => run())
      .finally(() => {
        if (emitTailByKey.get(tailKey) === next) {
          emitTailByKey.delete(tailKey)
        }
      })
    emitTailByKey.set(tailKey, next)
    return next
  }

  const awaitTail: MutationEmitTailCoordinator['awaitTail'] = async tailKey => {
    const tail = emitTailByKey.get(tailKey)
    if (!tail) return
    await tail.catch(() => undefined)
  }

  const hasPendingTail: MutationEmitTailCoordinator['hasPendingTail'] = tailKey => emitTailByKey.has(tailKey)

  return { enqueue, awaitTail, hasPendingTail }
}
