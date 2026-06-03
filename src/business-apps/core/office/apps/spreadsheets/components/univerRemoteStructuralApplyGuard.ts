import type { MutableRefObject } from 'react'

export type RemoteStructuralApplyGuardRefs = {
  isApplyingRemoteUpdateRef: MutableRefObject<boolean>
  collabPersistedBulkApplyDepthRef: MutableRefObject<number>
}

/** Univer may emit structural CommandExecuted after syncExecuteCommand returns — keep guards up until then. */
export const scheduleReleaseRemoteStructuralApplyGuard = (refs: RemoteStructuralApplyGuardRefs): void => {
  queueMicrotask(() => {
    queueMicrotask(() => {
      refs.collabPersistedBulkApplyDepthRef.current = Math.max(0, refs.collabPersistedBulkApplyDepthRef.current - 1)
      if (refs.collabPersistedBulkApplyDepthRef.current === 0) {
        refs.isApplyingRemoteUpdateRef.current = false
      }
    })
  })
}

export const acquireRemoteStructuralApplyGuard = (refs: RemoteStructuralApplyGuardRefs): void => {
  refs.isApplyingRemoteUpdateRef.current = true
  refs.collabPersistedBulkApplyDepthRef.current += 1
}

export const shouldIgnoreStructuralRowCommandPersistence = (refs: RemoteStructuralApplyGuardRefs): boolean =>
  refs.isApplyingRemoteUpdateRef.current || refs.collabPersistedBulkApplyDepthRef.current > 0
