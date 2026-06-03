import {
  createSpreadsheetSheetWorkQueue,
  type LocalPersistInput,
  type RemoteJobController,
  type SheetWorkQueueDeps
} from '../spreadsheetSheetWorkQueue'
import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../../services/SpreadsheetApiService'

type SubmitResult = SpreadsheetBatchOperationResponse

const sheetA = 'sheet-A'

let opIdSeq = 0
const nextOpId = (): string => {
  opIdSeq += 1
  return `op_${opIdSeq}`
}

const setCellOp = (
  rowId: string,
  columnName: string,
  value: unknown,
  operationId?: string
): SpreadsheetBatchOperation =>
  ({
    operationId: operationId ?? nextOpId(),
    type: 'set_cell',
    data: { rowId, columnName, value }
  }) as unknown as SpreadsheetBatchOperation

const setRangeOp = (
  rowId: string,
  columnName: string,
  value: unknown,
  operationId?: string
): SpreadsheetBatchOperation =>
  ({
    operationId: operationId ?? nextOpId(),
    type: 'set_range',
    data: {
      cells: [{ rowId, columnName, value }]
    }
  }) as unknown as SpreadsheetBatchOperation

const addRowsOp = (clientRowId: string): SpreadsheetBatchOperation =>
  ({
    operationId: nextOpId(),
    type: 'add_rows',
    data: {
      rows: [{ _clientRowId: clientRowId }]
    }
  }) as unknown as SpreadsheetBatchOperation

const cellKey = (rowId: string, columnName: string): string => `${rowId}\u0000${columnName}`

const makeLocal = (
  partial: Partial<LocalPersistInput> & Pick<LocalPersistInput, 'kind' | 'operations'>
): LocalPersistInput => ({
  sheetId: sheetA,
  enqueuedAt: Date.now(),
  ...partial
})

interface HarnessOptions {
  bulkDepthZero?: boolean
  idleMs?: number
  flushMaxWaitMs?: number
  submittedTtlMs?: number
  initialClientVersion?: number | null
  submitImpl?: (req: Parameters<SheetWorkQueueDeps['submitMutationBatch']>[0]) => Promise<SubmitResult>
  refreshBase?: (sheetId: string, base: number) => Promise<number>
  resolveBase?: (sheetId: string) => number
  onLocalMutationCellProtectionChange?: SheetWorkQueueDeps['onLocalMutationCellProtectionChange']
}

const buildHarness = (opts: HarnessOptions = {}) => {
  const submitCalls: Array<Parameters<SheetWorkQueueDeps['submitMutationBatch']>[0]> = []
  const debugEvents: Array<{ event: string; payload: Record<string, unknown> }> = []
  // Per-sheet server version mirror; bumps independently on each submit.
  const initialVersion = opts.initialClientVersion ?? 1
  const serverVersionBySheet = new Map<string, number>()
  const getServerVersion = (sheetId: string): number => {
    let v = serverVersionBySheet.get(sheetId)
    if (v == null) {
      v = initialVersion
      serverVersionBySheet.set(sheetId, v)
    }
    return v
  }

  const defaultSubmit = async (
    req: Parameters<SheetWorkQueueDeps['submitMutationBatch']>[0]
  ): Promise<SubmitResult> => {
    submitCalls.push(req)
    const next = getServerVersion(req.sheetId) + 1
    serverVersionBySheet.set(req.sheetId, next)
    return {
      newVersion: next
    } as SubmitResult
  }

  let chain: Promise<void> = Promise.resolve()
  const deps: SheetWorkQueueDeps = {
    chainOnOperationQueue: fn => {
      const next = chain.then(fn, fn)
      chain = next.then(
        () => undefined,
        () => undefined
      )
      return next
    },
    submitMutationBatch: opts.submitImpl ?? defaultSubmit,
    refreshBaseVersionBeforeWrite: opts.refreshBase ?? (async sheetId => getServerVersion(sheetId)),
    resolveBaseVersion: opts.resolveBase ?? (sheetId => getServerVersion(sheetId)),
    isCollabBulkApplyDepthZero: () => opts.bulkDepthZero !== false,
    onLocalMutationCellProtectionChange: opts.onLocalMutationCellProtectionChange,
    getLocalIdleCoalesceMs: () => opts.idleMs ?? 50,
    getLocalFlushMaxWaitMs: () => opts.flushMaxWaitMs ?? 500,
    getSubmittedOwnershipTtlMs: () => opts.submittedTtlMs ?? 10_000,
    debug: (event, payload) => {
      debugEvents.push({ event, payload })
    }
  }

  const queue = createSpreadsheetSheetWorkQueue(deps)
  // Seed initial client-applied version so submits aren't blocked by
  // version_confidence_missing in tests that don't exercise that branch.
  if (opts.initialClientVersion !== null) {
    // We need to set it via a remote echo of versionOnlyEcho semantics. To keep
    // tests simple, we expose the seed via enqueueRemoteApply markVersionDone.
    // Tests that explicitly want "missing" should set initialClientVersion: null.
  }

  const setServerVersion = (sheetId: string, version: number): void => {
    serverVersionBySheet.set(sheetId, version)
  }

  return { queue, submitCalls, debugEvents, deps, setServerVersion }
}

const seedClientVersion = async (
  queue: ReturnType<typeof buildHarness>['queue'],
  sheetId: string,
  version: number
): Promise<void> => {
  await queue.enqueueRemoteApply(sheetId, 'versionOnlyEcho', async controller => {
    controller.markVersionDone(version)
  })
}

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 30; i += 1) {
    await Promise.resolve()
  }
}

describe('createSpreadsheetSheetWorkQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('local FIFO + coalescing', () => {
    it('coalesces four fast cellValue commits into one submit group', async () => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)

      for (let i = 0; i < 4; i += 1) {
        await queue.enqueueLocalPersist(
          sheetA,
          makeLocal({
            kind: 'cellValue',
            operations: [setCellOp('row-1', `Col${i}`, i)],
            ownedCellKeys: [cellKey('row-1', `Col${i}`)]
          })
        )
      }

      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0].operations).toHaveLength(4)
    })

    it('coalesces manual cellValue commits spaced 150ms apart within the 800ms idle window (FE-B1)', async () => {
      const { queue, submitCalls } = buildHarness({
        initialClientVersion: 1,
        idleMs: 800,
        flushMaxWaitMs: 2000
      })
      await seedClientVersion(queue, sheetA, 1)

      for (let i = 0; i < 5; i += 1) {
        await queue.enqueueLocalPersist(
          sheetA,
          makeLocal({
            kind: 'cellValue',
            operations: [setCellOp('row-1', `Col${i}`, `v${i}`)],
            ownedCellKeys: [cellKey('row-1', `Col${i}`)]
          })
        )
        jest.advanceTimersByTime(150)
        await flushMicrotasks()
      }

      jest.advanceTimersByTime(800)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0].operations).toHaveLength(5)
    })

    it('coalesces fast-path rangeValue (set_range) commits from Univer typing into one submit', async () => {
      const { queue, submitCalls } = buildHarness({
        initialClientVersion: 1,
        idleMs: 800,
        flushMaxWaitMs: 2000
      })
      await seedClientVersion(queue, sheetA, 1)

      for (let i = 0; i < 5; i += 1) {
        await queue.enqueueLocalPersist(
          sheetA,
          makeLocal({
            kind: 'rangeValue',
            operations: [setRangeOp('row-1', `Col${i}`, `v${i}`)],
            ownedCellKeys: [cellKey('row-1', `Col${i}`)]
          })
        )
        jest.advanceTimersByTime(150)
        await flushMicrotasks()
      }

      jest.advanceTimersByTime(800)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0].operations).toHaveLength(5)
    })

    it('does not flush coalescing rangeValue when each keystroke also enqueues set_style', async () => {
      const styleOp = (): SpreadsheetBatchOperation =>
        ({
          operationId: nextOpId(),
          type: 'set_style',
          data: {
            sheetId: sheetA,
            cells: [{ row: 0, col: 4, stylePatch: { set: { s: 'style-1' } } }]
          }
        }) as unknown as SpreadsheetBatchOperation

      const { queue, submitCalls } = buildHarness({
        initialClientVersion: 1,
        idleMs: 800,
        flushMaxWaitMs: 2000
      })
      await seedClientVersion(queue, sheetA, 1)

      for (let i = 0; i < 6; i += 1) {
        await queue.enqueueLocalPersist(
          sheetA,
          makeLocal({
            kind: 'rangeValue',
            operations: [setRangeOp('row-uuid-1', 'ColumnE', `1-${i}`)]
          })
        )
        await queue.enqueueLocalPersist(
          sheetA,
          makeLocal({
            kind: 'style',
            operations: [styleOp()]
          })
        )
        jest.advanceTimersByTime(100)
        await flushMicrotasks()
      }

      expect(submitCalls).toHaveLength(0)

      jest.advanceTimersByTime(800)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls.length).toBeLessThanOrEqual(2)
      expect(submitCalls[0]?.operations[0]?.type).toBe('set_range')
      const rangeOps = submitCalls[0]?.operations ?? []
      expect(rangeOps.length).toBeGreaterThanOrEqual(1)
      expect(rangeOps.length).toBeLessThanOrEqual(6)
    })

    it('coalesces burst add_rows-only structural groups into one merged submit', async () => {
      const { queue, submitCalls } = buildHarness({
        initialClientVersion: 1,
        idleMs: 800,
        flushMaxWaitMs: 2000
      })
      await seedClientVersion(queue, sheetA, 1)

      for (let i = 0; i < 3; i += 1) {
        await queue.enqueueLocalPersist(
          sheetA,
          makeLocal({
            kind: 'structural',
            operations: [addRowsOp(`client_burst_${i}`)]
          })
        )
        jest.advanceTimersByTime(150)
        await flushMicrotasks()
      }

      jest.advanceTimersByTime(800)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0].operations).toHaveLength(1)
      expect(submitCalls[0].operations[0]?.type).toBe('add_rows')
      const rows = submitCalls[0].operations[0]?.data?.rows as Array<Record<string, unknown>>
      expect(rows).toHaveLength(3)
    })

    it('protects pending local mutation cells until submit settles', async () => {
      const protectionEvents: Array<{ keys: readonly string[]; protectedFromRepaint: boolean }> = []
      const { queue } = buildHarness({
        initialClientVersion: 1,
        onLocalMutationCellProtectionChange: (_sheetId, keys, protectedFromRepaint) => {
          protectionEvents.push({ keys, protectedFromRepaint })
        }
      })
      await seedClientVersion(queue, sheetA, 1)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('row-1', 'A', 'local')],
          ownedCellKeys: [cellKey('row-1', 'A')],
          protectedCellKeys: ['semantic-key']
        })
      )

      expect(protectionEvents).toContainEqual({
        keys: ['semantic-key'],
        protectedFromRepaint: true
      })

      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(protectionEvents).toContainEqual({
        keys: ['semantic-key'],
        protectedFromRepaint: false
      })
    })

    it('same cell coalesce keeps latest value', async () => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('row-1', 'A', 'first')],
          ownedCellKeys: [cellKey('row-1', 'A')]
        })
      )
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('row-1', 'A', 'second')],
          ownedCellKeys: [cellKey('row-1', 'A')]
        })
      )

      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      const op = submitCalls[0].operations[0] as unknown as { data: { value: unknown } }
      expect(op.data.value).toBe('second')
    })

    it('typing → paste → typing produces three ordered groups', async () => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('row-1', 'A', 'x')],
          ownedCellKeys: [cellKey('row-1', 'A')]
        })
      )
      // Paste is atomic — should flush coalesce window immediately and queue its own group.
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'paste',
          operations: [setCellOp('row-2', 'A', 'p')]
        })
      )
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('row-3', 'A', 'y')],
          ownedCellKeys: [cellKey('row-3', 'A')]
        })
      )

      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(3)
      expect((submitCalls[0].operations[0] as unknown as { data: { value: string } }).data.value).toBe('x')
      expect((submitCalls[1].operations[0] as unknown as { data: { value: string } }).data.value).toBe('p')
      expect((submitCalls[2].operations[0] as unknown as { data: { value: string } }).data.value).toBe('y')
    })

    it.each([
      ['formula' as const],
      ['style' as const],
      ['structural' as const],
      ['undoRedo' as const],
      ['unknownAtomic' as const]
    ])('%s kind never coalesces with surrounding cellValue', async kind => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 1)],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind,
          operations: [setCellOp('r', 'B', 2)]
        })
      )
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'C', 3)],
          ownedCellKeys: [cellKey('r', 'C')]
        })
      )

      jest.advanceTimersByTime(600)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(3)
    })
  })

  describe('cell ownership lifecycle', () => {
    it('tracks pending → scheduled → submitting → submitted, then expires after TTL', async () => {
      const { queue } = buildHarness({ initialClientVersion: 1, submittedTtlMs: 1_000 })
      await seedClientVersion(queue, sheetA, 1)
      const key = cellKey('r', 'A')

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      // cellValue → scheduled while coalesce timer armed.
      expect(queue.getQueueCellState(sheetA, key)).toBe('scheduled')
      expect(queue.isQueueOwnedCell(sheetA, key)).toBe(true)

      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(queue.getQueueCellState(sheetA, key)).toBe('submitted')
      expect(queue.isQueueOwnedCell(sheetA, key)).toBe(false)

      jest.advanceTimersByTime(1_100)
      expect(queue.getQueueCellState(sheetA, key)).toBe('none')
    })

    it('marks cell failed when submitter throws', async () => {
      const { queue } = buildHarness({
        initialClientVersion: 1,
        submitImpl: async () => {
          throw new Error('boom')
        }
      })
      await seedClientVersion(queue, sheetA, 1)
      const key = cellKey('r', 'A')

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(queue.getQueueCellState(sheetA, key)).toBe('failed')
      expect(queue.isQueueOwnedCell(sheetA, key)).toBe(false)
    })
  })

  describe('version equality invariant (conservative kinds)', () => {
    it('seeds conservative submit from refreshed base when client version is null', async () => {
      const { queue, submitCalls, debugEvents } = buildHarness({ initialClientVersion: 1 })
      // No seedClientVersion → queueClientAppliedVersion remains null until flush.

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0]?.baseVersion).toBe(1)
      expect(debugEvents.some(e => e.event === 'version_confidence_seeded_from_refresh')).toBe(true)
      expect(queue.getDebugState(sheetA).queueClientAppliedVersion).toBe(2)
    })

    it('catches up conservative submit when clientApplied is behind refreshed base', async () => {
      const { queue, submitCalls, debugEvents } = buildHarness({
        initialClientVersion: 1,
        refreshBase: async () => 7
      })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0]?.baseVersion).toBe(7)
      expect(debugEvents.some(e => e.event === 'client_behind_refreshed_base_catchup')).toBe(true)
      expect(queue.getDebugState(sheetA).queueClientAppliedVersion).toBeGreaterThanOrEqual(7)
    })

    it('flushes fast-path groups behind a conservative head blocked on remote', async () => {
      let controllerRef: RemoteJobController | null = null
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueRemoteApply(sheetA, 'gridApply', async c => {
        controllerRef = c
      })
      await flushMicrotasks()

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'blocked')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r2', 'B', 'ok')],
          ownedCellKeys: [cellKey('r2', 'B')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0]?.operations[0]?.data).toEqual(
        expect.objectContaining({ rowId: 'r2', columnName: 'B', value: 'ok' })
      )
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBeGreaterThan(0)
      expect(controllerRef).not.toBeNull()

      controllerRef!.markPaintDone()
      controllerRef!.markVersionDone(6)
      controllerRef!.markBulkDepthDone()
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(submitCalls.length).toBeGreaterThanOrEqual(2)
    })

    it('queueClientAppliedVersion advances on local submit success', async () => {
      const { queue } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(queue.getDebugState(sheetA).queueClientAppliedVersion).toBe(6)
      expect(queue.getDebugState(sheetA).lastNewVersion).toBe(6)
    })
  })

  describe('fast-path (cellValue) skips version + remote gates', () => {
    it('submits cellValue without seeded client version (no version_confidence_missing parking)', async () => {
      const { queue, submitCalls, debugEvents } = buildHarness({ initialClientVersion: 5 })
      // No seedClientVersion → queueClientAppliedVersion remains null at submit time.

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(debugEvents.some(e => e.event === 'version_confidence_missing')).toBe(false)
    })

    it('submits cellValue when clientApplied is behind refreshed base (no parking)', async () => {
      const { queue, submitCalls, debugEvents } = buildHarness({
        initialClientVersion: 1,
        refreshBase: async () => 7
      })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0]?.baseVersion).toBe(7)
      expect(debugEvents.some(e => e.event === 'client_behind_refreshed_base')).toBe(false)
    })

    it('cellValue submits while a gridApply remote job is parked awaiting signals', async () => {
      // The remote executor returns immediately (no `await`) and parks the
      // job in `remoteAwaitingSignals` because it hasn't called any of
      // `markPaintDone` / `markVersionDone` / `markBulkDepthDone`. Under the
      // old gate this would block a cellValue submit (reason:
      // `remote_awaiting_signals`); under the fast path it must not.
      let controllerRef: RemoteJobController | null = null
      const { queue, submitCalls, debugEvents } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueRemoteApply(sheetA, 'gridApply', async c => {
        controllerRef = c
      })
      await flushMicrotasks()
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(1)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()

      expect(submitCalls).toHaveLength(1)
      expect(debugEvents.some(e => e.event === 'local_starved_by_remote')).toBe(false)

      controllerRef!.markPaintDone()
      controllerRef!.markVersionDone(6)
      controllerRef!.markBulkDepthDone()
      await queue.awaitIdle(sheetA)
    })
  })

  describe('conservative path (structural) still serializes behind remote', () => {
    it('structural submit waits while remote job pending then runs after completion', async () => {
      const { queue, submitCalls, debugEvents, setServerVersion } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)

      let releaseRemote: (() => void) | null = null
      const remoteDone = new Promise<void>(resolve => {
        releaseRemote = resolve
      })
      const remoteP = queue.enqueueRemoteApply(sheetA, 'gridApply', async controller => {
        await remoteDone
        controller.markPaintDone()
        setServerVersion(sheetA, 6)
        controller.markVersionDone(6)
        controller.markBulkDepthDone()
      })

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      expect(submitCalls).toHaveLength(0)
      expect(debugEvents.some(e => e.event === 'local_starved_by_remote')).toBe(true)

      releaseRemote!()
      await remoteP
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
    })
  })

  describe('versionOnlyEcho fast-track', () => {
    it('does not block conservative submits while a version-only echo promise is unresolved', async () => {
      let releaseEcho: (() => void) | null = null
      const echoDone = new Promise<void>(resolve => {
        releaseEcho = resolve
      })
      const { queue, submitCalls, debugEvents } = buildHarness({
        initialClientVersion: 5,
        refreshBase: async () => 6
      })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async controller => {
        await echoDone
        controller.markVersionDone(6)
      })
      await flushMicrotasks()

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'style',
          operations: [setCellOp('r', 'A', 'format')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()

      expect(submitCalls).toHaveLength(1)
      expect(debugEvents.some(e => e.event === 'local_starved_by_remote')).toBe(false)
      expect(queue.isSheetPersistenceBusy(sheetA)).toBe(false)

      releaseEcho!()
      await flushMicrotasks()
      expect(queue.getDebugState(sheetA).queueClientAppliedVersion).toBe(6)
    })
  })

  describe('response-aware cell ownership', () => {
    it('marks accepted op cells as submitted and rejected_conflict op cells as failed', async () => {
      const acceptedOpId = nextOpId()
      const rejectedOpId = nextOpId()
      const { queue } = buildHarness({
        initialClientVersion: 1,
        submitImpl: async () =>
          ({
            newVersion: 2,
            results: [
              { operationId: acceptedOpId, status: 'accepted' },
              {
                operationId: rejectedOpId,
                status: 'rejected_conflict',
                serverState: [{ rowId: 'r', columnName: 'B', field: 'value', value: 'server-won' }]
              }
            ]
          }) as unknown as SubmitResult
      })
      await seedClientVersion(queue, sheetA, 1)

      const keyA = cellKey('r', 'A')
      const keyB = cellKey('r', 'B')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'local-A', acceptedOpId), setCellOp('r', 'B', 'local-B', rejectedOpId)],
          ownedCellKeys: [keyA, keyB]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(queue.getQueueCellState(sheetA, keyA)).toBe('submitted')
      expect(queue.getQueueCellState(sheetA, keyB)).toBe('failed')
    })

    it('falls back to legacy submitted for all owned cells when response omits results[]', async () => {
      const { queue } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)
      const keyA = cellKey('r', 'A')
      const keyB = cellKey('r', 'B')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'a'), setCellOp('r', 'B', 'b')],
          ownedCellKeys: [keyA, keyB]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(queue.getQueueCellState(sheetA, keyA)).toBe('submitted')
      expect(queue.getQueueCellState(sheetA, keyB)).toBe('submitted')
    })
  })

  describe('remote priority FIFO', () => {
    it('local submit blocked when bulk depth > 0', async () => {
      let depthZero = false
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 5 })
      // Replace dep via fresh harness construction; simpler: rebuild.
      ;(queue as { dispose: () => void }).dispose()
      const harness = (() => {
        const submitCallsLocal: Array<unknown> = []
        let localChain: Promise<void> = Promise.resolve()
        const deps: SheetWorkQueueDeps = {
          chainOnOperationQueue: fn => {
            const next = localChain.then(fn, fn)
            localChain = next.then(
              () => undefined,
              () => undefined
            )
            return next
          },
          submitMutationBatch: async req => {
            submitCallsLocal.push(req)
            return { newVersion: 7 } as SubmitResult
          },
          refreshBaseVersionBeforeWrite: async (_id, base) => base,
          resolveBaseVersion: () => 6,
          isCollabBulkApplyDepthZero: () => depthZero,
          getLocalIdleCoalesceMs: () => 50,
          getLocalFlushMaxWaitMs: () => 500,
          debug: () => {}
        }
        return { q: createSpreadsheetSheetWorkQueue(deps), submitCallsLocal }
      })()
      void submitCalls
      await harness.q.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(6))
      await harness.q.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      expect(harness.submitCallsLocal).toHaveLength(0)

      depthZero = true
      // Trigger a re-evaluation by enqueuing a no-op remote completion.
      await harness.q.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(6))
      await flushMicrotasks()
      await harness.q.awaitIdle(sheetA)
      expect(harness.submitCallsLocal).toHaveLength(1)
    })

    it('gridApply job is not complete until paint + version + bulkDepth all signaled', async () => {
      const { queue } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)
      let controllerRef: RemoteJobController | null = null

      const remoteP = queue.enqueueRemoteApply(sheetA, 'gridApply', async c => {
        controllerRef = c
      })
      await remoteP
      await flushMicrotasks()

      expect(controllerRef).not.toBeNull()
      // executor returned but no signals → job parks in awaitingSignals.
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(1)

      controllerRef!.markPaintDone()
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(1)

      controllerRef!.markVersionDone(6)
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(1)

      controllerRef!.markBulkDepthDone()
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(0)
    })

    it('versionOnlyEcho completes on markVersionDone alone (no paint required)', async () => {
      const { queue } = buildHarness({ initialClientVersion: 5 })
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => {
        c.markVersionDone(9)
      })
      await flushMicrotasks()
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(0)
      expect(queue.getDebugState(sheetA).queueClientAppliedVersion).toBe(9)
    })

    it('noGridFallback completes after markNoGridFallbackDone + version', async () => {
      const { queue, debugEvents } = buildHarness({ initialClientVersion: 5 })
      await queue.enqueueRemoteApply(sheetA, 'noGridFallback', async c => {
        c.markVersionDone(11)
        c.markNoGridFallbackDone()
      })
      await flushMicrotasks()
      expect(queue.getDebugState(sheetA).activeRemoteJobs.length).toBe(0)
      expect(debugEvents.some(e => e.event === 'remote_job_no_grid_fallback')).toBe(true)
    })

    it('remote deltas preserve version order', async () => {
      const { queue } = buildHarness({ initialClientVersion: 1 })
      const versionsApplied: number[] = []
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => {
        versionsApplied.push(2)
        c.markVersionDone(2)
      })
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => {
        versionsApplied.push(3)
        c.markVersionDone(3)
      })
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => {
        versionsApplied.push(4)
        c.markVersionDone(4)
      })
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(versionsApplied).toEqual([2, 3, 4])
      expect(queue.getDebugState(sheetA).queueClientAppliedVersion).toBe(4)
    })

    it('logs local_starved_by_remote for conservative (structural) submit while remote awaits signals', async () => {
      let controllerRef: RemoteJobController | null = null
      const { queue, submitCalls, debugEvents } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)

      await queue.enqueueRemoteApply(sheetA, 'gridApply', async c => {
        controllerRef = c
      })
      await flushMicrotasks()

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      jest.advanceTimersByTime(60)
      await flushMicrotasks()

      expect(submitCalls).toHaveLength(0)
      expect(debugEvents.some(e => e.event === 'local_starved_by_remote')).toBe(true)
      expect(controllerRef).not.toBeNull()
    })
  })

  describe('forceFlush results', () => {
    it('returns nothing_to_flush when no groups', async () => {
      const { queue } = buildHarness({ initialClientVersion: 1 })
      const r = await queue.forceFlush(sheetA)
      expect(r).toEqual(['nothing_to_flush'])
    })

    it('returns blocked_by_remote for conservative kind when remote in flight', async () => {
      const { queue } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)
      let controllerRef: RemoteJobController | null = null
      await queue.enqueueRemoteApply(sheetA, 'gridApply', async c => {
        controllerRef = c
      })
      await flushMicrotasks()
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      const r = await queue.forceFlush(sheetA)
      expect(r.every(x => x === 'blocked_by_remote')).toBe(true)
      controllerRef!.markPaintDone()
      controllerRef!.markVersionDone(6)
      controllerRef!.markBulkDepthDone()
    })

    it('returns flushed for safe groups', async () => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      const r = await queue.forceFlush(sheetA)
      expect(r).toEqual(['flushed'])
      expect(submitCalls).toHaveLength(1)
    })

    it('forceFlushAll aggregates per sheet', async () => {
      const { queue } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, 'sheet-X', 5)
      await seedClientVersion(queue, 'sheet-Y', 5)
      await queue.enqueueLocalPersist(
        'sheet-X',
        makeLocal({
          sheetId: 'sheet-X',
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')]
        })
      )
      await queue.enqueueLocalPersist(
        'sheet-Y',
        makeLocal({
          sheetId: 'sheet-Y',
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'y')]
        })
      )
      const r = await queue.forceFlushAll()
      expect(Object.keys(r.bySheet).sort()).toContain('sheet-X')
      expect(Object.keys(r.bySheet).sort()).toContain('sheet-Y')
      expect(r.bySheet['sheet-X']).toEqual(['flushed'])
      expect(r.bySheet['sheet-Y']).toEqual(['flushed'])
    })
  })

  describe('debug state', () => {
    it('exposes ownership counts and sync state', async () => {
      const { queue } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      const dbg = queue.getDebugState(sheetA)
      expect(dbg.cellOwnershipCounts.scheduled).toBe(1)
      expect(dbg.coalesceWindowOpen).toBe(true)
      expect(dbg.localPending).toBe(1)
      expect(dbg.syncState).toBe('pending')
    })
  })

  // Phase 2.5 (Steps 3+4+5): wire-level invariant + cell protection + requeue.
  describe('baseVersion authoring and 409 requeue', () => {
    it('passes queueClientAppliedVersion as baseVersion on every submit (Step 3)', async () => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [cellKey('r', 'A')]
        })
      )
      await queue.forceFlush(sheetA)
      await flushMicrotasks()
      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0]?.baseVersion).toBe(5)
    })

    it('treats 409 as terminal for conservative kinds (structural — cannot rebase)', async () => {
      // Conservative kinds (paste / style / structural / undoRedo /
      // unknownAtomic) depend on grid layout that may have shifted
      // incompatibly. A 409 there is terminal — no quick-retry storm; the
      // user-facing collaboration manager refetches a fresh snapshot.
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('structural_conflict'), {
            status: 409,
            details: { reason: 'structural_conflict', currentVersion: 5 }
          })
        },
        refreshBaseVersionBeforeWrite: async () => 1,
        resolveBaseVersion: () => 1,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(1))
      await flushMicrotasks()
      const key = cellKey('r', 'A')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(attempts).toBe(1)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      expect(queue.getQueueCellState(sheetA, key)).toBe('failed')
      queue.dispose()
    })

    it('retries fast-path 409 structural_conflict with refreshed base (cell-stable identity)', async () => {
      // A fast-path cellValue / rangeValue / clear addresses cells by stable
      // (rowId, columnName). A 409 with `structural_conflict` only signals a
      // base-version drift between client and server — the operation
      // identity survives the structural shift. The queue must retry with
      // a refreshed base instead of silently dropping the user's edit.
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      let serverVersion = 127
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async req => {
          attempts += 1
          if (attempts === 1) {
            // First wire attempt: simulate a structural change landed in the
            // gap between the client's base (127) and the server's current
            // version (129).
            serverVersion = 129
            throw Object.assign(new Error('structural_conflict'), {
              status: 409,
              details: { reason: 'structural_conflict', currentVersion: 129, expectedVersion: req.baseVersion }
            })
          }
          // Retry succeeds against the refreshed base.
          serverVersion += 1
          return { newVersion: serverVersion } as SubmitResult
        },
        refreshBaseVersionBeforeWrite: async () => serverVersion,
        resolveBaseVersion: () => serverVersion,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(127))
      await flushMicrotasks()
      const key = cellKey('r', 'A')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'rangeValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      // First attempt 409, second attempt accepted — operation NOT lost.
      expect(attempts).toBe(2)
      expect(queue.getDebugState(sheetA).syncState).toBe('idle')
      expect(queue.getQueueCellState(sheetA, key)).toBe('submitted')
      queue.dispose()
    })

    it('awaits structural recovery before retrying a fast-path 409', async () => {
      // The retry must wait for `requestStructuralRecovery` to resolve so the
      // local session/baseline catches up from `baseVersion` to
      // `currentVersion` before the resend. Without this, the cell write
      // would still land server-side but the visible grid would be stale
      // until the next remote WS broadcast arrives.
      let chain: Promise<void> = Promise.resolve()
      const callOrder: string[] = []
      let attempts = 0
      let serverVersion = 127
      let releaseRecovery: (() => void) | null = null
      const recoveryStarted = new Promise<void>(resolve => {
        releaseRecovery = resolve
      })
      let recoveryResolve: (() => void) | null = null
      const recoveryReady = new Promise<void>(resolve => {
        recoveryResolve = resolve
      })
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          callOrder.push(`submit#${attempts}`)
          if (attempts === 1) {
            serverVersion = 129
            throw Object.assign(new Error('structural_conflict'), {
              status: 409,
              details: { reason: 'structural_conflict', currentVersion: 129 }
            })
          }
          serverVersion += 1
          return { newVersion: serverVersion } as SubmitResult
        },
        refreshBaseVersionBeforeWrite: async () => serverVersion,
        resolveBaseVersion: () => serverVersion,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => {
          callOrder.push('recovery_start')
          releaseRecovery?.()
          await recoveryReady
          callOrder.push('recovery_done')
        }
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(127))
      await flushMicrotasks()
      const key = cellKey('r', 'A')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await recoveryStarted
      await flushMicrotasks()

      // Recovery is in flight — the retry must NOT have fired yet.
      expect(attempts).toBe(1)
      expect(callOrder).toEqual(['submit#1', 'recovery_start'])

      recoveryResolve!()
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      // Retry fires only AFTER recovery resolves.
      expect(attempts).toBe(2)
      expect(callOrder).toEqual(['submit#1', 'recovery_start', 'recovery_done', 'submit#2'])
      expect(queue.getQueueCellState(sheetA, key)).toBe('submitted')
      queue.dispose()
    })

    it('caps fast-path 409 retries and marks failed after the budget is spent', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('structural_conflict'), {
            status: 409,
            details: { reason: 'structural_conflict', currentVersion: 200 }
          })
        },
        refreshBaseVersionBeforeWrite: async () => 200,
        resolveBaseVersion: () => 200,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(127))
      await flushMicrotasks()
      const key = cellKey('r', 'A')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      for (let i = 0; i < 8 && attempts < 3; i += 1) {
        jest.advanceTimersByTime(100)
        await flushMicrotasks()
      }
      // 1 original + 2 requeues = 3 wire attempts, then `failed` — bounded
      // so a persistent structural-conflict loop cannot spin forever.
      expect(attempts).toBe(3)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      expect(queue.getQueueCellState(sheetA, key)).toBe('failed')
      queue.dispose()
    })

    it('requeues transient 5xx up to the cap then fails (no parking)', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('boom'), { status: 503 })
        },
        refreshBaseVersionBeforeWrite: async () => 1,
        resolveBaseVersion: () => 1,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(1))
      await flushMicrotasks()
      const key = cellKey('r', 'A')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      for (let i = 0; i < 8 && attempts < 3; i += 1) {
        jest.advanceTimersByTime(100)
        await flushMicrotasks()
      }
      // 1 original + 2 requeues = 3 wire attempts, then `failed`.
      expect(attempts).toBe(3)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      expect(queue.getQueueCellState(sheetA, key)).toBe('failed')
      queue.dispose()
    })

    it('does not requeue plain Errors (no status) — treated as terminal', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw new Error('boom')
        },
        refreshBaseVersionBeforeWrite: async () => 1,
        resolveBaseVersion: () => 1,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(1))
      await flushMicrotasks()
      const key = cellKey('r', 'A')
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'cellValue',
          operations: [setCellOp('r', 'A', 'x')],
          ownedCellKeys: [key]
        })
      )
      jest.advanceTimersByTime(100)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(attempts).toBe(1)
      expect(queue.getQueueCellState(sheetA, key)).toBe('failed')
      queue.dispose()
    })
  })

  describe('add_rows-only auto-retry on 409 structural_conflict', () => {
    const addRowsOp = (clientRowId: string, gridRowIndex?: number, operationId?: string): SpreadsheetBatchOperation =>
      ({
        operationId: operationId ?? nextOpId(),
        type: 'add_rows',
        data: {
          rows: [
            {
              _clientRowId: clientRowId,
              ...(gridRowIndex == null ? {} : { _gridRowIndex: gridRowIndex })
            }
          ]
        }
      }) as unknown as SpreadsheetBatchOperation

    it('auto-retries add_rows-only 409 structural_conflict after structural recovery', async () => {
      let chain: Promise<void> = Promise.resolve()
      const callOrder: string[] = []
      let attempts = 0
      let serverVersion = 21
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          callOrder.push(`submit#${attempts}`)
          if (attempts === 1) {
            serverVersion = 22
            throw Object.assign(new Error('structural_conflict'), {
              status: 409,
              details: { reason: 'structural_conflict', currentVersion: 22 }
            })
          }
          serverVersion += 1
          return {
            newVersion: serverVersion,
            rowMappings: [{ clientRowId: 'client_X', rowUuid: 'R1' }]
          } as unknown as SubmitResult
        },
        refreshBaseVersionBeforeWrite: async () => serverVersion,
        resolveBaseVersion: () => serverVersion,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => {
          callOrder.push('recovery')
        }
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(21))
      await flushMicrotasks()
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [addRowsOp('client_X', 50)]
        })
      )
      for (let i = 0; i < 10 && attempts < 2; i += 1) {
        jest.advanceTimersByTime(50)
        await flushMicrotasks()
      }
      await queue.awaitIdle(sheetA)

      expect(attempts).toBe(2)
      expect(callOrder).toEqual(['submit#1', 'recovery', 'submit#2'])
      expect(queue.getDebugState(sheetA).syncState).toBe('idle')
      queue.dispose()
    })

    it('caps add_rows-only 409 retries at the same budget as fast-path', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('structural_conflict'), {
            status: 409,
            details: { reason: 'structural_conflict', currentVersion: 200 }
          })
        },
        refreshBaseVersionBeforeWrite: async () => 200,
        resolveBaseVersion: () => 200,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => undefined
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(200))
      await flushMicrotasks()
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [addRowsOp('client_X', 50)]
        })
      )
      for (let i = 0; i < 12 && attempts < 3; i += 1) {
        jest.advanceTimersByTime(100)
        await flushMicrotasks()
      }
      // 1 original + 2 requeues = 3 wire attempts, then `failed` — same
      // bound as fast-path so a persistent gap cannot spin forever.
      expect(attempts).toBe(3)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      queue.dispose()
    })

    it('does NOT auto-retry column_add 409 (column shifter — positional intent)', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('structural_conflict'), {
            status: 409,
            details: { reason: 'structural_conflict', currentVersion: 5 }
          })
        },
        refreshBaseVersionBeforeWrite: async () => 1,
        resolveBaseVersion: () => 1,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => undefined
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(1))
      await flushMicrotasks()
      const columnAddOp: SpreadsheetBatchOperation = {
        operationId: nextOpId(),
        type: 'column_add',
        data: { column: { id: 'col-new', order: 3, name: 'column_d' } }
      } as unknown as SpreadsheetBatchOperation
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [columnAddOp]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(attempts).toBe(1)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      queue.dispose()
    })

    it('does NOT auto-retry insert_rows_at 409 (explicit row shifter — positional intent)', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('structural_conflict'), {
            status: 409,
            details: { reason: 'structural_conflict', currentVersion: 5 }
          })
        },
        refreshBaseVersionBeforeWrite: async () => 1,
        resolveBaseVersion: () => 1,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => undefined
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(1))
      await flushMicrotasks()
      const insertRowsAtOp: SpreadsheetBatchOperation = {
        operationId: nextOpId(),
        type: 'insert_rows_at',
        data: { insertAt: 20, rows: [{}, {}] }
      } as unknown as SpreadsheetBatchOperation
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [insertRowsAtOp]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(attempts).toBe(1)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      queue.dispose()
    })

    it('does NOT auto-retry a mixed batch containing add_rows + set_range (not add_rows-only)', async () => {
      let chain: Promise<void> = Promise.resolve()
      let attempts = 0
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          throw Object.assign(new Error('structural_conflict'), {
            status: 409,
            details: { reason: 'structural_conflict', currentVersion: 5 }
          })
        },
        refreshBaseVersionBeforeWrite: async () => 1,
        resolveBaseVersion: () => 1,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => undefined
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(1))
      await flushMicrotasks()
      const setRangeOp: SpreadsheetBatchOperation = {
        operationId: nextOpId(),
        type: 'set_range',
        data: { cells: [] }
      } as unknown as SpreadsheetBatchOperation
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'structural',
          operations: [addRowsOp('client_X', 50), setRangeOp]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)
      expect(attempts).toBe(1)
      expect(queue.getDebugState(sheetA).syncState).toBe('failed')
      queue.dispose()
    })
  })

  describe('add_rows burst ordering with clientHandle dependents', () => {
    const addRowsOp = (clientRowId: string): SpreadsheetBatchOperation =>
      ({
        operationId: nextOpId(),
        type: 'add_rows',
        data: { rows: [{ _clientRowId: clientRowId, _gridRowIndex: 50 }] }
      }) as unknown as SpreadsheetBatchOperation

    const setRangeOnClientHandle = (clientRowId: string): SpreadsheetBatchOperation =>
      ({
        operationId: nextOpId(),
        type: 'set_range',
        data: {
          cells: [
            {
              rowRef: { kind: 'clientHandle', clientRowId },
              columnName: 'ColumnA',
              value: 'burst'
            }
          ]
        }
      }) as unknown as SpreadsheetBatchOperation

    it('submits structural add_rows but rejects unresolved clientHandle rangeValue at the barrier', async () => {
      const { queue, submitCalls } = buildHarness({ initialClientVersion: 1 })
      await seedClientVersion(queue, sheetA, 1)

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({ kind: 'structural', operations: [addRowsOp('client_burst')] })
      )
      await expect(
        queue.enqueueLocalPersist(
          sheetA,
          makeLocal({ kind: 'rangeValue', operations: [setRangeOnClientHandle('client_burst')] })
        )
      ).rejects.toThrow(/barrier/)

      jest.advanceTimersByTime(60)
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0].operations[0].type).toBe('add_rows')
    })

    it('does not let dependent rangeValue groups skip ahead while add_rows waits on remote', async () => {
      const { queue, submitCalls, setServerVersion } = buildHarness({ initialClientVersion: 5 })
      await seedClientVersion(queue, sheetA, 5)

      let releaseRemote: (() => void) | null = null
      const remoteDone = new Promise<void>(resolve => {
        releaseRemote = resolve
      })
      const remoteP = queue.enqueueRemoteApply(sheetA, 'gridApply', async controller => {
        await remoteDone
        controller.markPaintDone()
        setServerVersion(sheetA, 6)
        controller.markVersionDone(6)
        controller.markBulkDepthDone()
      })

      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({ kind: 'structural', operations: [addRowsOp('client_blocked')] })
      )
      await expect(
        queue.enqueueLocalPersist(
          sheetA,
          makeLocal({ kind: 'rangeValue', operations: [setRangeOnClientHandle('client_blocked')] })
        )
      ).rejects.toThrow(/barrier/)
      jest.advanceTimersByTime(60)
      await flushMicrotasks()

      expect(submitCalls).toHaveLength(0)

      releaseRemote!()
      await remoteP
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      expect(submitCalls).toHaveLength(1)
      expect(submitCalls[0].operations[0].type).toBe('add_rows')
    })
  })

  describe('paste 409 structural_conflict recovery', () => {
    it('auto-retries paste after structural recovery when peer shifts rows', async () => {
      let chain: Promise<void> = Promise.resolve()
      const callOrder: string[] = []
      let attempts = 0
      let serverVersion = 40
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async () => {
          attempts += 1
          callOrder.push(`submit#${attempts}`)
          if (attempts === 1) {
            serverVersion = 41
            throw Object.assign(new Error('structural_conflict'), {
              status: 409,
              details: { reason: 'structural_conflict', currentVersion: 41 }
            })
          }
          serverVersion += 1
          return { newVersion: serverVersion } as SubmitResult
        },
        refreshBaseVersionBeforeWrite: async () => serverVersion,
        resolveBaseVersion: () => serverVersion,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => {
          callOrder.push('recovery')
        }
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(40))
      await flushMicrotasks()
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'paste',
          operations: [
            {
              operationId: nextOpId(),
              type: 'set_range',
              data: {
                cells: [
                  { rowId: 'row-1', columnName: 'A', value: 'p1' },
                  { rowId: 'row-1', columnName: 'B', value: 'p2' }
                ]
              }
            } as unknown as SpreadsheetBatchOperation
          ]
        })
      )
      for (let i = 0; i < 10 && attempts < 2; i += 1) {
        jest.advanceTimersByTime(50)
        await flushMicrotasks()
      }
      await queue.awaitIdle(sheetA)

      expect(attempts).toBe(2)
      expect(callOrder).toEqual(['submit#1', 'recovery', 'submit#2'])
      expect(queue.getDebugState(sheetA).syncState).toBe('idle')
      queue.dispose()
    })

    it('awaits a pending structural recovery and resubmits paste on the caught-up base', async () => {
      // Phase 2 (p2-structural-recovery-paste): a peer inserts rows while a paste batch is in
      // flight, so the paste 409s. The queue must (a) NOT resubmit while structural recovery
      // (catch-up that applies the peer add_rows) is still running, and (b) resubmit on the
      // version the catch-up advanced to — never the stale base it first tried.
      let chain: Promise<void> = Promise.resolve()
      const callOrder: string[] = []
      const capturedBaseVersions: number[] = []
      let attempts = 0
      // Server starts at v40 (no peer rows yet).
      let serverVersion = 40
      let releaseRecovery: (() => void) | null = null
      const recoveryStarted = new Promise<void>(resolve => {
        releaseRecovery = resolve
      })
      let recoveryResolve: (() => void) | null = null
      const recoveryReady = new Promise<void>(resolve => {
        recoveryResolve = resolve
      })
      const deps: SheetWorkQueueDeps = {
        chainOnOperationQueue: fn => {
          const next = chain.then(fn, fn)
          chain = next.then(
            () => undefined,
            () => undefined
          )
          return next
        },
        submitMutationBatch: async req => {
          attempts += 1
          capturedBaseVersions.push(req.baseVersion)
          callOrder.push(`submit#${attempts}`)
          if (attempts === 1) {
            // Peer inserted rows: paste base is now stale (server moved to v41).
            throw Object.assign(new Error('structural_conflict'), {
              status: 409,
              details: { reason: 'structural_conflict', currentVersion: 41 }
            })
          }
          serverVersion += 1
          return { newVersion: serverVersion } as SubmitResult
        },
        refreshBaseVersionBeforeWrite: async () => serverVersion,
        resolveBaseVersion: () => serverVersion,
        isCollabBulkApplyDepthZero: () => true,
        getLocalIdleCoalesceMs: () => 10,
        getMaxQueueRetryAttempts: () => 2,
        requestStructuralRecovery: async () => {
          callOrder.push('recovery_start')
          releaseRecovery?.()
          await recoveryReady
          // Catch-up applied the peer add_rows: local base advances past the conflict version.
          serverVersion = 45
          callOrder.push('recovery_done')
        }
      }
      const queue = createSpreadsheetSheetWorkQueue(deps)
      await queue.enqueueRemoteApply(sheetA, 'versionOnlyEcho', async c => c.markVersionDone(40))
      await flushMicrotasks()
      await queue.enqueueLocalPersist(
        sheetA,
        makeLocal({
          kind: 'paste',
          operations: [
            {
              operationId: nextOpId(),
              type: 'set_range',
              data: {
                cells: [
                  { rowId: 'row-1', columnName: 'A', value: 'p1' },
                  { rowId: 'row-1', columnName: 'B', value: 'p2' }
                ]
              }
            } as unknown as SpreadsheetBatchOperation
          ]
        })
      )
      jest.advanceTimersByTime(200)
      await flushMicrotasks()
      await recoveryStarted
      await flushMicrotasks()

      // Recovery is in flight — the paste must NOT have resubmitted yet.
      expect(attempts).toBe(1)
      expect(callOrder).toEqual(['submit#1', 'recovery_start'])

      recoveryResolve!()
      await flushMicrotasks()
      await queue.awaitIdle(sheetA)

      // Resubmit fires only AFTER recovery resolves, and on the caught-up base (v45), not the
      // stale v40 it first tried.
      expect(attempts).toBe(2)
      expect(callOrder).toEqual(['submit#1', 'recovery_start', 'recovery_done', 'submit#2'])
      expect(capturedBaseVersions).toEqual([40, 45])
      expect(queue.getDebugState(sheetA).syncState).toBe('idle')
      queue.dispose()
    })
  })
})
