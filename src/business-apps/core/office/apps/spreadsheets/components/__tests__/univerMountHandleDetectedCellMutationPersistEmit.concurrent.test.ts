/**
 * Concurrent emit dispatch race + paste materialization barrier.
 *
 * Two materialization barriers protect persistence of cells that target brand-new `client_*`
 * rows. This suite covers both:
 *
 * 1. Async flush path (`needsFlush`): when the affected `client_*` rows are NOT yet in the
 *    session snapshot at dispatch time, the dispatcher awaits `flushUnmaterializedRowsBeforePersist`
 *    and runs the post-flush remap + submit INSIDE the same operation-queue task (Fix B). Under N
 *    concurrent emits this must (a) submit every cell op against a backend UUID — never a temp
 *    `client_*` id — and (b) keep the flush + remap + submit critical sections strictly serialized.
 *
 * 2. Inline add_rows path (`needsInlineMaterializationBatch`): when the affected `client_*` rows
 *    already exist in the session (the real clipboard-paste-into-new-rows shape), the dispatcher
 *    bundles an `add_rows` op together with the `set_range` in ONE atomic batch, so a cell never
 *    reaches the wire without the row that holds it being created in the same batch.
 */

import { runDetectedCellMutationPersistEmitDispatch } from '../univerMountHandleDetectedCellMutationPersistEmit'
import { createSpreadsheetRowMaterializationReadiness } from '../../hooks/spreadsheetRowMaterializationReadiness'
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
  // Distinct from the materialized `column_a` value so the post-materialization dedup
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

const columnNameForIndex = (colIndex: number): string => `column_${String.fromCharCode(97 + colIndex)}`

// A single pasted cell. Values are unique per (row, col) so the assertions can verify every
// pasted cell reaches the wire without being dropped by the materialization barrier.
const makePasteCell = (rowIndex: number, colIndex: number): SpreadsheetMutationPlannedCell => ({
  rowId: `client_row_${rowIndex}`,
  columnName: columnNameForIndex(colIndex),
  rowIndex,
  colIndex,
  cellRef: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`,
  valueAction: 'set',
  value: `paste_${rowIndex}_${colIndex}`
})

// One paste emit: a multi-cell set_range spanning several brand-new `client_*` rows across
// multiple columns (the shape a clipboard paste into freshly-inserted rows produces).
const makePasteEmit = (rowIndices: number[], colCount: number, sheetId = 'sheet-1'): PersistEmitInput => {
  const cells = rowIndices.flatMap(rowIndex =>
    Array.from({ length: colCount }, (_, colIndex) => makePasteCell(rowIndex, colIndex))
  )
  const plan: SpreadsheetMutationPlan = {
    sheetId,
    cells
  } as SpreadsheetMutationPlan
  return {
    source: 'sheet-value-changed',
    targetSheetId: sheetId,
    mutationTraceId: 'trace_paste',
    localMutationPlan: plan,
    plannedCellsFiltered: cells,
    emittedChangedCells: cells.map(cell => ({
      rowId: cell.rowId,
      columnName: cell.columnName,
      value: cell.value,
      univerRow: cell.rowIndex,
      univerCol: cell.colIndex
    })),
    planStyles: undefined,
    hadPasteIntentForSheet: true,
    hadPasteFormattingIntentForSheet: false,
    autofillApplyType: null,
    commandId: 'sheet.command.paste',
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

interface MaterializeOnFlushRow {
  clientRowId: string
  gridRowIndex: number
  values?: Record<string, unknown>
}

interface BuildDepsOptions {
  /** Simulated flush latency in milliseconds. */
  flushLatencyMs: number
  /** Captures `onMutationBatchOp` invocations for assertions. */
  recordedBatches: Array<{ sheetId: string; operations: Array<{ type: string; data: Record<string, unknown> }> }>
  /** Records the per-emit ordering of "begin critical section" → "end critical section". */
  criticalSectionTrace: string[]
  ops: FakeOpsQueueController
  /**
   * Rows the async flush should materialize (add to the session with a backend UUID). Leave empty
   * to drive the inline add_rows path instead (pre-seed rows via `__seedTemporaryRow`).
   */
  materializeOnFlush?: MaterializeOnFlushRow[]
}

const buildDeps = ({
  flushLatencyMs,
  recordedBatches,
  criticalSectionTrace,
  ops,
  materializeOnFlush = []
}: BuildDepsOptions): UniverMountHandleDetectedCellMutationDeps => {
  const sessionRows: Record<string, unknown>[] = []
  let nextBackendIndex = 0
  const flushImpl = async (targetSheetId: string, finalize?: () => Promise<void>): Promise<void> => {
    await ops.enqueue(async () => {
      criticalSectionTrace.push(`flush_begin:${targetSheetId}`)
      // Simulate `add_rows` HTTP latency.
      await new Promise(resolve => setTimeout(resolve, flushLatencyMs))
      // Materialize the configured rows into a backend UUID, mirroring `updateLocalRowsAfterCreate`
      // writing to `commitRowsForSheet` under the operation queue. Rows already present are promoted
      // in place; missing rows are appended.
      for (const pending of materializeOnFlush) {
        const existing = sessionRows.find(row => row._clientRowId === pending.clientRowId)
        if (existing) {
          if (!existing._rowUuid) existing._rowUuid = makeBackendUuid(++nextBackendIndex)
          continue
        }
        sessionRows.push({
          _id: pending.clientRowId,
          _clientRowId: pending.clientRowId,
          _gridRowIndex: pending.gridRowIndex,
          _rowUuid: makeBackendUuid(++nextBackendIndex),
          ...(pending.values ?? {})
        })
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
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true, order: 0 }],
      data: sessionRows,
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
    getPersistSheetRowsSnapshot: () => sessionRows,
    flushUnmaterializedRowsBeforePersist: flushImpl,
    // Pre-seed a still-temporary row INTO the snapshot so the dispatcher takes the inline
    // add_rows materialization path (the row is already known locally, so add_rows + set_range
    // are bundled atomically rather than awaiting a flush).
    __seedTemporaryRow: (rowIndex: number, values?: Record<string, unknown>) => {
      sessionRows.push({
        _id: `client_row_${rowIndex}`,
        _clientRowId: `client_row_${rowIndex}`,
        _gridRowIndex: rowIndex,
        ...(values ?? {})
      })
    }
  } as unknown as UniverMountHandleDetectedCellMutationDeps
}

type RowRefShape = { kind?: string; value?: unknown; clientRowId?: unknown; rowUuid?: unknown }

const rowRefToStrings = (rowRef: RowRefShape | undefined): string[] => {
  if (!rowRef) return []
  const refs: string[] = []
  if (typeof rowRef.value === 'string') refs.push(rowRef.value)
  if (typeof rowRef.clientRowId === 'string') refs.push(rowRef.clientRowId)
  if (typeof rowRef.rowUuid === 'string') refs.push(rowRef.rowUuid)
  return refs
}

const collectRowReferenceStrings = (operation: { type: string; data: Record<string, unknown> }): string[] => {
  const refs: string[] = []
  const data = operation.data as {
    rowId?: unknown
    rowRef?: RowRefShape
    cells?: Array<{ rowId?: unknown; rowRef?: RowRefShape }>
  }
  if (typeof data.rowId === 'string') refs.push(data.rowId)
  refs.push(...rowRefToStrings(data.rowRef))
  if (Array.isArray(data.cells)) {
    for (const cell of data.cells) {
      if (typeof cell.rowId === 'string') refs.push(cell.rowId)
      refs.push(...rowRefToStrings(cell.rowRef))
    }
  }
  return refs
}

describe('runDetectedCellMutationPersistEmitDispatch (materialization barrier)', () => {
  it('serializes flush + remap + submit so every cell op uses a backend UUID under N concurrent emits', async () => {
    const recordedBatches: Array<{
      sheetId: string
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }> = []
    const criticalSectionTrace: string[] = []
    const ops = createFakeOpsQueue()
    const N = 5
    const deps = buildDeps({
      flushLatencyMs: 5,
      recordedBatches,
      criticalSectionTrace,
      ops,
      materializeOnFlush: Array.from({ length: N }, (_, i) => ({
        clientRowId: `client_row_${i}`,
        gridRowIndex: i,
        values: { column_a: `value_${i}` }
      }))
    })
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        Promise.resolve(runDetectedCellMutationPersistEmitDispatch(deps, makeEmit(i)))
      )
    )

    expect(results.every(handled => handled === true)).toBe(true)
    expect(recordedBatches).toHaveLength(N)

    // Every submitted op references a backend UUID — never a temp `client_*` id.
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
    const tuplePattern = 'flush_begin:sheet-1,flush_end:sheet-1,finalize_begin:sheet-1,finalize_end:sheet-1'
    const expectedSequence = Array.from({ length: N }, () => tuplePattern).join(',')
    expect(ordered).toBe(expectedSequence)
  })

  it('bundles add_rows with a multi-cell paste set_range so no cell ships without its row (inline barrier)', async () => {
    // Phase 2 materialization barrier (paste-shaped): a clipboard paste into freshly-inserted
    // rows arrives as ONE multi-cell set_range whose cells reference `client_*` rows that already
    // exist locally. The dispatcher must bundle an `add_rows` op that creates every referenced row
    // into the SAME batch, so a cell never reaches the wire without its row — and no pasted cell is
    // dropped.
    const recordedBatches: Array<{
      sheetId: string
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }> = []
    const criticalSectionTrace: string[] = []
    const ops = createFakeOpsQueue()
    const deps = buildDeps({ flushLatencyMs: 5, recordedBatches, criticalSectionTrace, ops })
    const rowIndices = [0, 1, 2]
    const colCount = 2
    rowIndices.forEach(rowIndex => {
      ;(deps as unknown as { __seedTemporaryRow: (i: number) => void }).__seedTemporaryRow(rowIndex)
    })

    const handled = await runDetectedCellMutationPersistEmitDispatch(deps, makePasteEmit(rowIndices, colCount))
    expect(handled).toBe(true)

    // The inline path submits synchronously in a single batch (no async flush critical section).
    expect(recordedBatches).toHaveLength(1)
    expect(criticalSectionTrace).toHaveLength(0)
    const operations = recordedBatches[0].operations

    // An add_rows op must materialize every client row referenced by the paste.
    const addRowsOps = operations.filter(operation => operation.type === 'add_rows')
    expect(addRowsOps.length).toBeGreaterThan(0)
    const materializedClientRowIds = new Set(
      addRowsOps
        .flatMap(operation => {
          const rows = (operation.data as { rows?: Array<Record<string, unknown>> }).rows
          return Array.isArray(rows) ? rows : []
        })
        .map(row => String(row._clientRowId ?? ''))
        .filter(Boolean)
    )
    rowIndices.forEach(rowIndex => {
      expect(materializedClientRowIds.has(`client_row_${rowIndex}`)).toBe(true)
    })

    // Every pasted cell reached the wire (3 rows x 2 cols = 6), none dropped by the barrier.
    const submittedCells = operations
      .filter(operation => operation.type === 'set_range')
      .flatMap(operation => {
        const cells = (operation.data as { cells?: Array<Record<string, unknown>> }).cells
        return Array.isArray(cells) ? cells : []
      })
    expect(submittedCells).toHaveLength(rowIndices.length * colCount)
    const submittedValues = submittedCells.map(cell => cell.value).sort()
    const expectedValues = rowIndices
      .flatMap(rowIndex => Array.from({ length: colCount }, (_, colIndex) => `paste_${rowIndex}_${colIndex}`))
      .sort()
    expect(submittedValues).toEqual(expectedValues)

    // Every set_range cell references a row the add_rows op creates in this same batch — the
    // atomic barrier invariant. A `client_*` ref here is safe precisely because add_rows precedes
    // it in the same payload; it must never reference a row that is NOT being created.
    const setRangeOps = operations.filter(operation => operation.type === 'set_range')
    const cellRowRefs = setRangeOps.flatMap(collectRowReferenceStrings)
    expect(cellRowRefs.length).toBeGreaterThan(0)
    for (const ref of cellRowRefs) {
      expect(materializedClientRowIds.has(ref) || BACKEND_UUID_RE.test(ref)).toBe(true)
    }
  })

  it('drops a redundant new-row typing value op when add_rows already seeds the same cell value', async () => {
    const recordedBatches: Array<{
      sheetId: string
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }> = []
    const criticalSectionTrace: string[] = []
    const ops = createFakeOpsQueue()
    const deps = buildDeps({ flushLatencyMs: 5, recordedBatches, criticalSectionTrace, ops })
    ;(
      deps as unknown as { __seedTemporaryRow: (i: number, values?: Record<string, unknown>) => void }
    ).__seedTemporaryRow(0, { column_a: 'value_0_edit' })

    const handled = await runDetectedCellMutationPersistEmitDispatch(deps, makeEmit(0))
    expect(handled).toBe(true)
    expect(recordedBatches).toHaveLength(1)
    expect(criticalSectionTrace).toHaveLength(0)
    expect(recordedBatches[0]?.operations.map(operation => operation.type)).toEqual(['add_rows'])
    const addRows = recordedBatches[0]?.operations[0]
    const rows = (addRows?.data as { rows?: Array<Record<string, unknown>> } | undefined)?.rows ?? []
    expect(rows).toEqual([
      expect.objectContaining({
        _clientRowId: 'client_row_0',
        column_a: 'value_0_edit'
      })
    ])
  })

  it('refuses to silently bypass the operation queue when flush dep is missing and leaves the journal pending', async () => {
    // 1a: row materialization is required but no flush dependency is wired and the rows are not in
    // the session (so no inline add_rows bundle is possible). The dispatcher must not run the
    // critical section outside the operation queue. It must:
    //   - return handled === false (cell stays in pending journal)
    //   - never call onMutationBatchOp for unresolved client_* rows
    //   - emit a rate-limited warning AND telemetry event so the missing wiring is observable
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
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
        // Empty session: the affected client_* rows are unknown locally, so neither the inline
        // add_rows bundle nor a flush is possible.
        getPersistSheetRowsSnapshot: () => []
        // flushUnmaterializedRowsBeforePersist intentionally NOT wired
      } as unknown as UniverMountHandleDetectedCellMutationDeps

      const results = await Promise.all(
        [0, 1].map(rowIndex => Promise.resolve(runDetectedCellMutationPersistEmitDispatch(deps, makeEmit(rowIndex))))
      )

      expect(results).toEqual([false, false])
      expect(onMutationBatchOp).not.toHaveBeenCalled()
      // Telemetry event present for each emit so the issue is observable; the warning itself may be
      // rate-limited across emits.
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
        // Empty session so no inline add_rows bundle is built; the flush runs but materializes
        // nothing, leaving the temp row unresolved after retry.
        getPersistSheetRowsSnapshot: () => [],
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

  it('drops a remapped set_range write after async row materialization when readiness proves add_rows carried the same value', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const recordedBatches: Array<{
      sheetId: string
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }> = []
    const criticalSectionTrace: string[] = []
    const ops = createFakeOpsQueue()
    const rowIndex = 0
    const emit = makeEmit(rowIndex)
    const deps = buildDeps({
      flushLatencyMs: 5,
      recordedBatches,
      criticalSectionTrace,
      ops,
      materializeOnFlush: [
        {
          clientRowId: `client_row_${rowIndex}`,
          gridRowIndex: rowIndex,
          values: { column_a: emit.plannedCellsFiltered[0]?.value }
        }
      ]
    })
    const rowMaterializationReadiness = createSpreadsheetRowMaterializationReadiness()
    ;(
      deps as unknown as { propsRef: { current: Record<string, unknown> } }
    ).propsRef.current.rowMaterializationReadinessRef = {
      current: rowMaterializationReadiness
    }
    rowMaterializationReadiness.recordMaterializedValues('sheet-1', 'client_row_0', {
      column_a: emit.plannedCellsFiltered[0]?.value
    })
    rowMaterializationReadiness.resolve('sheet-1', 'client_row_0', makeBackendUuid(1))

    try {
      const handled = await runDetectedCellMutationPersistEmitDispatch(deps, emit)

      expect(handled).toBe(false)
      expect(recordedBatches).toHaveLength(0)
      expect(warnSpy).not.toHaveBeenCalledWith('[SPREADSHEET_PERSIST] persist_emit_never_submitted', expect.anything())
    } finally {
      warnSpy.mockRestore()
    }
  })
})
