import { bindSpreadsheetManualCheckpointWithFlush } from '../spreadsheetManualCheckpointBinding'

describe('bindSpreadsheetManualCheckpointWithFlush', () => {
  it('delegates to the manual checkpoint runner with flush sequencing', async () => {
    const pendingCellPersistTimeoutRef = { current: 123 as unknown as ReturnType<typeof setTimeout> }
    const socketPersistChainRef = { current: Promise.resolve() }
    const flushPendingCellChangesRef = { current: jest.fn().mockResolvedValue(undefined) }
    const chainOnOperationQueue = jest.fn().mockImplementation(async (_ref: unknown, fn: () => Promise<void>) => {
      await fn()
    })
    const createVersionCheckpoint = jest.fn().mockResolvedValue({ ok: true })
    const onFlushFailure = jest.fn()
    const operationQueueRef = { current: Promise.resolve() }
    const live = { sheets: { s1: {} } }

    const createCheckpointWithFlush = bindSpreadsheetManualCheckpointWithFlush({
      activeSheetId: 's1',
      pendingCellPersistTimeoutRef,
      socketPersistChainRef,
      chainOnOperationQueue,
      operationQueueRef,
      flushPendingCellChangesRef,
      getLiveWorkbookSnapshot: () => live,
      createVersionCheckpoint,
      onFlushFailure
    })

    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {})

    const result = await createCheckpointWithFlush('checkpoint')

    expect(result).toEqual({ ok: true })
    expect(clearTimeoutSpy).toHaveBeenCalledWith(123)
    expect(pendingCellPersistTimeoutRef.current).toBeNull()
    expect(chainOnOperationQueue).toHaveBeenCalledWith(operationQueueRef, expect.any(Function))
    expect(flushPendingCellChangesRef.current).toHaveBeenCalledTimes(1)
    expect(createVersionCheckpoint).toHaveBeenCalledWith('checkpoint', { univerSnapshots: { s1: live } })
    expect(onFlushFailure).not.toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })
})
