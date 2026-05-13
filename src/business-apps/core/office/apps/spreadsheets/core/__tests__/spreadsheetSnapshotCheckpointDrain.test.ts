import { createSnapshotCheckpointDrainScheduler } from '../spreadsheetSnapshotCheckpointDrain'

describe('createSnapshotCheckpointDrainScheduler', () => {
  it('runs persist for each pending sheet id then clears the map', async () => {
    const pending = new Map<string, { requestedAt: number }>()
    pending.set('sheet-a', { requestedAt: 1 })
    pending.set('sheet-b', { requestedAt: 2 })

    const persist = jest.fn(async (sheetId: string) => {
      void sheetId
    })
    const beginPersist = jest.fn()
    const endPersist = jest.fn()
    const scheduledRef = { current: false }
    const promiseRef = { current: null as Promise<void> | null }
    const queueRef = { current: Promise.resolve() }

    const schedule = createSnapshotCheckpointDrainScheduler({
      chainOnOperationQueue: jest.fn(async (_ref, fn) => {
        await fn()
      }),
      operationQueueRef: queueRef,
      pendingSnapshotCheckpointBySheetRef: { current: pending },
      snapshotCheckpointDrainScheduledRef: scheduledRef,
      snapshotCheckpointDrainPromiseRef: promiseRef,
      persistSnapshotCheckpointForSheet: persist,
      sheetPersist: { beginPersist, endPersist }
    })

    await schedule()

    expect(persist.mock.calls.map(c => c[0]).sort()).toEqual(['sheet-a', 'sheet-b'])
    expect(pending.size).toBe(0)
    expect(beginPersist).toHaveBeenCalledTimes(1)
    expect(endPersist).toHaveBeenCalledTimes(1)
    expect(scheduledRef.current).toBe(false)
    expect(promiseRef.current).toBe(null)
  })

  it('reschedules when new checkpoint requests arrive while draining', async () => {
    const pending = new Map<string, { requestedAt: number }>([['sheet-a', { requestedAt: 1 }]])
    const persist = jest.fn(async (sheetId: string) => {
      if (sheetId === 'sheet-a') {
        pending.set('sheet-c', { requestedAt: 2 })
      }
    })

    const scheduledRef = { current: false }
    const promiseRef = { current: null as Promise<void> | null }
    const queueRef = { current: Promise.resolve() }

    const schedule = createSnapshotCheckpointDrainScheduler({
      chainOnOperationQueue: jest.fn(async (_ref, fn) => {
        await fn()
      }),
      operationQueueRef: queueRef,
      pendingSnapshotCheckpointBySheetRef: { current: pending },
      snapshotCheckpointDrainScheduledRef: scheduledRef,
      snapshotCheckpointDrainPromiseRef: promiseRef,
      persistSnapshotCheckpointForSheet: persist,
      sheetPersist: { beginPersist: jest.fn(), endPersist: jest.fn() }
    })

    await schedule()

    expect(persist).toHaveBeenCalledWith('sheet-a')
    expect(persist).toHaveBeenCalledWith('sheet-c')
    expect(pending.size).toBe(0)
  })
})
