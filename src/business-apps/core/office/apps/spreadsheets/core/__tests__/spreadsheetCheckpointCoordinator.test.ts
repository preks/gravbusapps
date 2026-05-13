import { runSpreadsheetManualCheckpointWithFlush } from '../spreadsheetCheckpointCoordinator'

describe('runSpreadsheetManualCheckpointWithFlush', () => {
  it('clears debounce, awaits socket chain, queues cell flush, then checkpoints with live snapshot', async () => {
    const clearPendingCellDebounce = jest.fn()
    const awaitSocketPersistChain = jest.fn().mockResolvedValue(undefined)
    const flushPendingCellChanges = jest.fn().mockResolvedValue(undefined)
    const chainOnOperationQueue = jest.fn().mockImplementation(async (_ref: unknown, fn: () => Promise<void>) => {
      await fn()
    })
    const createVersionCheckpoint = jest.fn().mockResolvedValue({ ok: true })
    const onFlushFailure = jest.fn()

    const operationQueueRef = { current: Promise.resolve() }
    const live = { sheets: { s1: {} } }

    const result = await runSpreadsheetManualCheckpointWithFlush('my checkpoint', {
      activeSheetId: 's1',
      clearPendingCellDebounce,
      awaitSocketPersistChain,
      chainOnOperationQueue,
      operationQueueRef,
      flushPendingCellChanges,
      getLiveWorkbookSnapshot: () => live,
      createVersionCheckpoint,
      onFlushFailure
    })

    expect(result).toEqual({ ok: true })
    expect(clearPendingCellDebounce).toHaveBeenCalledTimes(1)
    expect(awaitSocketPersistChain).toHaveBeenCalledTimes(1)
    expect(chainOnOperationQueue).toHaveBeenCalledWith(operationQueueRef, expect.any(Function))
    expect(flushPendingCellChanges).toHaveBeenCalledTimes(1)
    expect(createVersionCheckpoint).toHaveBeenCalledWith('my checkpoint', {
      univerSnapshots: { s1: live }
    })
    expect(onFlushFailure).not.toHaveBeenCalled()
  })

  it('invokes onFlushFailure and returns null when flush fails', async () => {
    const err = new Error('flush failed')
    const chainOnOperationQueue = jest.fn().mockRejectedValue(err)
    const onFlushFailure = jest.fn()

    const result = await runSpreadsheetManualCheckpointWithFlush('x', {
      activeSheetId: 's1',
      clearPendingCellDebounce: jest.fn(),
      awaitSocketPersistChain: jest.fn().mockResolvedValue(undefined),
      chainOnOperationQueue,
      operationQueueRef: { current: Promise.resolve() },
      flushPendingCellChanges: jest.fn(),
      getLiveWorkbookSnapshot: () => null,
      createVersionCheckpoint: jest.fn(),
      onFlushFailure
    })

    expect(result).toBeNull()
    expect(onFlushFailure).toHaveBeenCalledWith(err)
  })
})
