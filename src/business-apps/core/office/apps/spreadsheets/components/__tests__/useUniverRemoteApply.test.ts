import { runRemoteCommandWithStructuralGuard } from '../useUniverRemoteApply'
import { shouldIgnoreStructuralRowCommandPersistence } from '../univerRemoteStructuralApplyGuard'

describe('runRemoteCommandWithStructuralGuard', () => {
  it('keeps remote-apply persistence guards active until deferred release', async () => {
    const isApplyingRemoteUpdateRef = { current: false }
    const collabPersistedBulkApplyDepthRef = { current: 0 }
    const execute = jest.fn(() => {
      expect(isApplyingRemoteUpdateRef.current).toBe(true)
      expect(collabPersistedBulkApplyDepthRef.current).toBe(1)
      expect(
        shouldIgnoreStructuralRowCommandPersistence({
          isApplyingRemoteUpdateRef,
          collabPersistedBulkApplyDepthRef
        })
      ).toBe(true)
    })

    runRemoteCommandWithStructuralGuard({
      isApplyingRemoteUpdateRef,
      collabPersistedBulkApplyDepthRef,
      execute
    })

    expect(execute).toHaveBeenCalledTimes(1)
    expect(isApplyingRemoteUpdateRef.current).toBe(true)
    expect(collabPersistedBulkApplyDepthRef.current).toBe(1)

    await new Promise<void>(resolve => {
      queueMicrotask(() => {
        queueMicrotask(() => resolve())
      })
    })

    expect(isApplyingRemoteUpdateRef.current).toBe(false)
    expect(collabPersistedBulkApplyDepthRef.current).toBe(0)
  })
})
