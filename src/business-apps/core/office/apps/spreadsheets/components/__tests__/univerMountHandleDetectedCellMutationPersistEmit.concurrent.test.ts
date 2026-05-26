/**
 * Concurrent emit dispatch race regression.
 *
 * Repro (pre-Fix A/B/C): on a slow network, N parallel `SheetValueChanged` events drive N
 * concurrent `runDetectedCellMutationPersistEmitDispatch` calls. Each awaits the same
 * `flushUnmaterializedRowsBeforePersist`. The flush itself is serialized (op queue), but the
 * post-flush remap + submit runs OUTSIDE that critical section. Whichever emit's `await`
 * resumes first reads a session snapshot that may not yet contain every freshly-materialized
 * backend UUID; the others can submit a cell op with a raw `client_*` rowId, which the backend
 * rejects (`invalid_row_ref`).
 *
 * Post-Fix B: the emit dispatch passes a `finalize` callback into
 * `flushUnmaterializedRowsBeforePersist`. The flush implementation invokes that callback INSIDE
 * the same operation-queue task as the flush, so the remap+submit happens atomically relative
 * to other queued flushes. This test asserts:
 *   - every emit's `onMutationBatchOp` receives operations whose `rowId` is a backend UUID
 *     (never a temporary `client_*` id).
 *   - the critical sections are observably serialized when the flush runs them through a
 *     single FIFO queue.
 */

import { runDetectedCellMutationPersistEmitDispatch } from '../univerMountHandleDetectedCellMutationPersistEmit'
import type {
  PersistEmitInput,
  UniverMountHandleDetectedCellMutationDeps
} from '../univerMountHandleDetectedCellMutation.types'
import type { SpreadsheetMutationPlan, SpreadsheetMutationPlannedCell } from '../../core'

const BACKEND_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const makeBackendUuid = (index: number): string => {
  const hex = index.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

const makeCell = (rowIndex: number): SpreadsheetMutationPlannedCell => ({
  rowId: `client_row_${rowIndex}`,
  columnName: 'column_a',
  rowIndex,
  colIndex: 0,
  cellRef: `A${rowIndex + 1}`,
  valueAction: 'set',
  // Distinct from the seeded `column_a` value so the post-materialization dedup
  // (see dropSetRangeCellsRedundantAfterMaterialization) does not suppress the
  // submission — this suite asserts the rowId-remap race fix, not dedup.
  value: `value_${rowIndex}_edit`
})

const makeEmit = (rowIndex: number, sheetId = 'sheet-1'): PersistEmitInput => {
  const cell = makeCell(rowIndex)
  const plan: SpreadsheetMutationPlan = {
    sheetId,
    cells: [cell]
  } as SpreadsheetMutationPlan
  return {
    source: 'sheet-value-changed',
    targetSheetId: sheetId,
    mutationTraceId: `trace_${rowIndex}`,
    localMutationPlan: plan,
    plannedCellsFiltered: [cell],
    emittedChangedCells: [
      {
        rowId: cell.rowId,
        columnName: cell.columnName,
        value: cell.value,
        univerRow: rowIndex,
        univerCol: 0
      }
    ],
    planStyles: undefined,
    hadPasteIntentForSheet: false,
    hadPasteFormattingIntentForSheet: false,
    autofillApplyType: null,
    commandId: 'sheet.mutation.set-range-values',
    materializeRowsBeforeEmit: true
  }
}

interface FakeOpsQueueController {
  /** Sequential queue mirroring `chainOnOperationQueue` in `SpreadsheetAppViewer`. */
  enqueue: (work: () => Promise<void>) => Promise<void>
  /** Number of work items observed inside the queue (used to assert serialization). */
  getMaxConcurrent: () => number
}

const createFakeOpsQueue = (): FakeOpsQueueController => {
  let tail: Promise<void> = Promise.resolve()
  let inFlight = 0
  let maxConcurrent = 0
  const enqueue = (work: () => Promise<void>): Promise<void> => {
    const next = tail.then(async () => {
      inFlight += 1
      maxConcurrent = Math.max(maxConcurrent, inFlight)
      try {
        await work()
      } finally {
        inFlight -= 1
      }
    })
    tail = next.catch(() => undefined)
    return next
  }
  return { enqueue, getMaxConcurrent: () => maxConcurrent }
}

interface BuildDepsOptions {
  /** Sheet rows the snapshot starts with (typically empty for new-sheet scenarios). */
  initialRows: Record<string, unknown>[]
  /** Simulated flush latency in milliseconds. */
  flushLatencyMs: number
  /** Captures `onMutationBatchOp` invocations for assertions. */
  recordedBatches: Array<{ sheetId: string; operations: Array<{ type: string; data: Record<string, unknown> }> }>
  /** Records the per-emit ordering of "begin critical section" → "end critical section". */
  criticalSectionTrace: string[]
  ops: FakeOpsQueueController
}

const buildDeps = ({
  initialRows,
  flushLatencyMs,
  recordedBatches,
  criticalSectionTrace,
  ops
}: BuildDepsOptions): UniverMountHandleDetectedCellMutationDeps => {
  const sessionRows: Record<string, unknown>[] = [...initialRows]
  let nextBackendIndex = 0
  const flushImpl = async (targetSheetId: string, finalize?: () => Promise<void>): Promise<void> => {
    await ops.enqueue(async () => {
      criticalSectionTrace.push(`flush_begin:${targetSheetId}`)
      // Simulate `add_rows` HTTP latency.
      await new Promise(resolve => setTimeout(resolve, flushLatencyMs))
      // Materialize every still-temporary row in `sessionRows` into a backend UUID. This mirrors
      // `updateLocalRowsAfterCreate` writing to `commitRowsForSheet` under the operation queue.
      for (const row of sessionRows) {
        const id = row._id as string | undefined
        if (id && id.startsWith('client_') && !row._rowUuid) {
          row._rowUuid = makeBackendUuid(++nextBackendIndex)
        }
      }
      criticalSectionTrace.push(`flush_end:${targetSheetId}`)
      if (finalize) {
        criticalSectionTrace.push(`finalize_begin:${targetSheetId}`)
        await finalize()
        criticalSectionTrace.push(`finalize_end:${targetSheetId}`)
      }
    })
  }

  const propsRef = {
    current: {
      onMutationBatchOp: (data: {
        sheetId: string
        operations: Array<{ type: string; data: Record<string, unknown> }>
      }) => {
        recordedBatches.push({ sheetId: data.sheetId, operations: data.operations })
      },
      flushUnmaterializedRowsBeforePersistRef: { current: flushImpl },
      isUuidForRowRemap: (value: string) => BACKEND_UUID_RE.test(value)
    }
  }

  const callbacksRef = { current: { onDiagnosticsTraceEvent: jest.fn() } }
  const pendingFormattingPasteIntentRef = { current: null }
  const pendingAutofillIntentRef = { current: null }

  return {
    propsRef,
    callbacksRef,
    pendingFormattingPasteIntentRef,
    pendingAutofillIntentRef,
    // Snapshot accessor: emit dispatch reads this AFTER `flushUnmaterializedRowsBeforePersist`
    // resolves. Critically, it must observe the materialized backend UUIDs to remap successfully.
    getPersistSheetRowsSnapshot: () => sessionRows,
    flushUnmaterializedRowsBeforePersist: flushImpl,
    // Test helper: pre-seed an unmaterialized row so the flush can promote it to a backend UUID.
    __seedUnmaterializedRow: (rowIndex: number) => {
      sessionRows.push({
        _id: `client_row_${rowIndex}`,
        _clientRowId: `client_row_${rowIndex}`,
        _gridRowIndex: rowIndex,
        column_a: `value_${rowIndex}`
      })
    }
  } as unknown as UniverMountHandleDetectedCellMutationDeps
}

describe('runDetectedCellMutationPersistEmitDispatch (concurrent emit race)', () => {
  it('serializes flush + remap + submit so every cell op uses a backend UUID under N concurrent emits', async () => {
    const recordedBatches: Array<{
      sheetId: string
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }> = []
    const criticalSectionTrace: string[] = []
    const ops = createFakeOpsQueue()
    const deps = buildDeps({
      initialRows: [],
      flushLatencyMs: 5,
      recordedBatches,
      criticalSectionTrace,
      ops
    })
    const N = 5
    for (let i = 0; i < N; i++) {
      ;(deps as unknown as { __seedUnmaterializedRow: (i: number) => void }).__seedUnmaterializedRow(i)
    }
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        Promise.resolve(runDetectedCellMutationPersistEmitDispatch(deps, makeEmit(i)))
      )
    )

    expect(results.every(handled => handled === true)).toBe(true)
    expect(recordedBatches).toHaveLength(N)

    // Every submitted op references a backend UUID — never a temp `client_*` id. Collect from
    // every row-id-shaped field the unified op might carry (`rowId`, `rowRef.value`, and any
    // cells[].rowRef.value for set_range payloads).
    const collectRowReferenceStrings = (operation: { type: string; data: Record<string, unknown> }): string[] => {
      const refs: string[] = []
      const data = operation.data as {
        rowId?: unknown
        rowRef?: { kind?: string; value?: unknown }
        cells?: Array<{ rowId?: unknown; rowRef?: { kind?: string; value?: unknown } }>
      }
      if (typeof data.rowId === 'string') refs.push(data.rowId)
      if (data.rowRef && typeof data.rowRef.value === 'string') refs.push(data.rowRef.value)
      if (Array.isArray(data.cells)) {
        for (const cell of data.cells) {
          if (typeof cell.rowId === 'string') refs.push(cell.rowId)
          if (cell.rowRef && typeof cell.rowRef.value === 'string') refs.push(cell.rowRef.value)
        }
      }
      return refs
    }
    const submittedRowRefs = recordedBatches.flatMap(batch => batch.operations).flatMap(collectRowReferenceStrings)
    expect(submittedRowRefs.length).toBeGreaterThan(0)
    for (const ref of submittedRowRefs) {
      expect(ref).not.toMatch(/^client_/)
      expect(ref).toMatch(BACKEND_UUID_RE)
    }

    // The critical sections (flush_begin → finalize_end) must be strictly serialized.
    expect(ops.getMaxConcurrent()).toBe(1)

    // Every flush is paired with a finalize in correct nesting order.
    const ordered = criticalSectionTrace.join(',')
    // Validate the (flush_begin, flush_end, finalize_begin, finalize_end) tuple repeats N times in order.
    const tuplePattern = '(flush_begin:sheet-1,flush_end:sheet-1,finalize_begin:sheet-1,finalize_end:sheet-1)'
    const expectedSequence = Array.from({ length: N }, () => tuplePattern.slice(1, -1)).join(',')
    expect(ordered).toBe(expectedSequence)
  })

  it('refuses to silently bypass the operation queue when flush dep is missing and leaves the journal pending', async () => {
    // 1a: row materialization is required but no flush dependency is wired. The dispatcher must
    // not run the critical section outside the operation queue. It must:
    //   - return handled === false (cell stays in pending journal)
    //   - never call onMutationBatchOp for unresolved client_* rows
    //   - emit a rate-limited warning AND telemetry event so the missing wiring is observable
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const sessionRows: Record<string, unknown>[] = [
        {
          _id: 'client_row_0',
          _clientRowId: 'client_row_0',
          _gridRowIndex: 0,
          column_a: 'value_0'
        },
        {
          _id: 'client_row_1',
          _clientRowId: 'client_row_1',
          _gridRowIndex: 1,
          column_a: 'value_1'
        }
      ]
      const deps = {
        propsRef: {
          current: {
            onMutationBatchOp,
            isUuidForRowRemap: (value: string) => BACKEND_UUID_RE.test(value)
            // flushUnmaterializedRowsBeforePersistRef intentionally NOT wired
          }
        },
        callbacksRef: { current: { onDiagnosticsTraceEvent } },
        pendingFormattingPasteIntentRef: { current: null },
        getPersistSheetRowsSnapshot: () => sessionRows
        // flushUnmaterializedRowsBeforePersist intentionally NOT wired
      } as unknown as UniverMountHandleDetectedCellMutationDeps

      const results = await Promise.all(
        [0, 1].map(rowIndex => Promise.resolve(runDetectedCellMutationPersistEmitDispatch(deps, makeEmit(rowIndex))))
      )

      expect(results).toEqual([false, false])
      expect(onMutationBatchOp).not.toHaveBeenCalled()
      // Telemetry event present for the first emit; the second emit's warning may be rate-limited
      // but must still emit the telemetry event so the issue is observable.
      const telemetryStages = onDiagnosticsTraceEvent.mock.calls.map(call => call[0]?.stage)
      expect(telemetryStages.filter(stage => stage === 'spreadsheet.cell_emit.missing_flush_dependency').length).toBe(2)
      expect(warnSpy).toHaveBeenCalledWith(
        '[SPREADSHEET_PERSIST] emit_dispatch: missing_flush_dependency',
        expect.objectContaining({
          errorCode: 'cell_emit_missing_flush_dependency',
          worksheetId: 'sheet-1',
          hadTempRowIds: true
        })
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('delegates to onMutationBatchOp when remap leaves unresolved temp row ids after retry', async () => {
    // Configure flush to NOT materialize the row (simulates a guarded skip / failed materialization).
    const criticalSectionTrace: string[] = []
    const ops = createFakeOpsQueue()
    const noopFlush = async (_targetSheetId: string, finalize?: () => Promise<void>): Promise<void> => {
      await ops.enqueue(async () => {
        criticalSectionTrace.push('flush_begin:noop')
        // intentionally NOT materializing anything
        criticalSectionTrace.push('flush_end:noop')
        if (finalize) {
          await finalize()
        }
      })
    }
    const sessionRows: Record<string, unknown>[] = [
      {
        _id: 'client_row_0',
        _clientRowId: 'client_row_0',
        _gridRowIndex: 0,
        column_a: 'value_0'
      }
    ]
    const onMutationBatchOp = jest.fn()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const deps = {
        propsRef: {
          current: {
            onMutationBatchOp,
            flushUnmaterializedRowsBeforePersistRef: { current: noopFlush },
            isUuidForRowRemap: (value: string) => BACKEND_UUID_RE.test(value)
          }
        },
        callbacksRef: { current: { onDiagnosticsTraceEvent: jest.fn() } },
        pendingFormattingPasteIntentRef: { current: null },
        getPersistSheetRowsSnapshot: () => sessionRows,
        flushUnmaterializedRowsBeforePersist: noopFlush
      } as unknown as UniverMountHandleDetectedCellMutationDeps

      const result = await runDetectedCellMutationPersistEmitDispatch(deps, makeEmit(0))
      expect(result).toBe(true)
      expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
      const firstOpData = onMutationBatchOp.mock.calls[0][0].operations[0].data as {
        cells?: Array<{ rowId?: string }>
      }
      expect(firstOpData.cells?.[0]?.rowId).toBe('client_row_0')
      expect(warnSpy).toHaveBeenCalledWith(
        '[SPREADSHEET_PERSIST] emit_dispatch: defer_to_viewer_readiness_gate',
        expect.objectContaining({
          targetSheetId: 'sheet-1',
          unresolvedCount: expect.any(Number)
        })
      )
    } finally {
      warnSpy.mockRestore()
    }
  })
})
