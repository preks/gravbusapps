import {
  acquireRemoteStructuralApplyGuard,
  scheduleReleaseRemoteStructuralApplyGuard,
  shouldIgnoreStructuralRowCommandPersistence
} from '../univerRemoteStructuralApplyGuard'

describe('univerRemoteStructuralApplyGuard', () => {
  it('keeps the guard active until deferred release', async () => {
    const isApplyingRemoteUpdateRef = { current: false }
    const collabPersistedBulkApplyDepthRef = { current: 0 }
    const guardRefs = { isApplyingRemoteUpdateRef, collabPersistedBulkApplyDepthRef }

    acquireRemoteStructuralApplyGuard(guardRefs)
    expect(shouldIgnoreStructuralRowCommandPersistence(guardRefs)).toBe(true)

    scheduleReleaseRemoteStructuralApplyGuard(guardRefs)
    expect(shouldIgnoreStructuralRowCommandPersistence(guardRefs)).toBe(true)

    await new Promise<void>(resolve => {
      queueMicrotask(() => {
        queueMicrotask(() => {
          resolve()
        })
      })
    })

    expect(shouldIgnoreStructuralRowCommandPersistence(guardRefs)).toBe(false)
    expect(isApplyingRemoteUpdateRef.current).toBe(false)
    expect(collabPersistedBulkApplyDepthRef.current).toBe(0)
  })
})
