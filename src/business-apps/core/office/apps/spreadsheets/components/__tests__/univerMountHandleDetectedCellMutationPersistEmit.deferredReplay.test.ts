import {
  runDetectedCellMutationPersistEmitDispatch,
  runDetectedCellMutationPersistEmitSync
} from '../univerMountHandleDetectedCellMutationPersistEmit'
import { runDetectedCellMutationPersistPlanPhase } from '../univerMountHandleDetectedCellMutationPersistPlan'
import { remoteEchoKey, toEchoSignature } from '../univerGridAuthoritativeHelpers'
import {
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../../utils/spreadsheetPendingMaterializationCells'
import type {
  PersistEmitInput,
  UniverMountHandleDetectedCellMutationDeps
} from '../univerMountHandleDetectedCellMutation.types'
import type { SpreadsheetMutationPlan, SpreadsheetMutationPlannedCell } from '../../core'

describe('runDetectedCellMutationPersistEmitSync deferred-replay', () => {
  it('protects planned value cells before row materialization flush runs', async () => {
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    const onMutationBatchOp = jest.fn()
    const cell: SpreadsheetMutationPlannedCell = {
      rowId: 'client_pending_row',
      columnName: 'column_a',
      rowIndex: 174,
      colIndex: 3,
      cellRef: 'D175',
      valueAction: 'set',
      value: '2'
    }
    const plan: SpreadsheetMutationPlan = {
      sheetId: 'sheet-1',
      cells: [cell]
    } as SpreadsheetMutationPlan
    const emit: PersistEmitInput = {
      source: 'sheet-value-changed',
      targetSheetId: 'sheet-1',
      mutationTraceId: 'trace_materialize_protect',
      localMutationPlan: plan,
      plannedCellsFiltered: [cell],
      emittedChangedCells: [],
      planStyles: undefined,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      commandId: undefined,
      materializeRowsBeforeEmit: true
    }
    const flushUnmaterializedRowsBeforePersist = jest.fn(async () => {
      expect(
        pendingLocalMutationCellsRef.current.has(spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 174, 3))
      ).toBe(true)
      expect(
        pendingLocalMutationCellsRef.current.has(
          spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client_pending_row', 'column_a')
        )
      ).toBe(true)
    })
    const deps = {
      propsRef: {
        current: {
          onMutationBatchOp,
          data: [],
          pendingLocalMutationCellsRef
        }
      },
      callbacksRef: { current: {} },
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null },
      flushUnmaterializedRowsBeforePersist
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const handled = await runDetectedCellMutationPersistEmitDispatch(deps, emit)

    expect(handled).toBe(false)
    expect(flushUnmaterializedRowsBeforePersist).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).not.toHaveBeenCalled()
  })

  it('emits a single add_rows plus rowRef.clientHandle batch for temporary rows', async () => {
    const onMutationBatchOp = jest.fn()
    const flushUnmaterializedRowsBeforePersist = jest.fn()
    const cell: SpreadsheetMutationPlannedCell = {
      rowId: 'client_row_1',
      columnName: 'ColumnA',
      rowIndex: 10,
      colIndex: 0,
      cellRef: 'A11',
      valueAction: 'set',
      value: 'burst'
    }
    const plan: SpreadsheetMutationPlan = {
      sheetId: 'sheet-1',
      cells: [cell]
    } as SpreadsheetMutationPlan
    const emit: PersistEmitInput = {
      source: 'sheet-value-changed',
      targetSheetId: 'sheet-1',
      mutationTraceId: 'trace_inline_add_rows',
      localMutationPlan: plan,
      plannedCellsFiltered: [cell],
      emittedChangedCells: [],
      planStyles: undefined,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      commandId: undefined,
      materializeRowsBeforeEmit: true
    }
    const deps = {
      propsRef: {
        current: {
          onMutationBatchOp,
          data: [{ _id: 'client_row_1', _clientRowId: 'client_row_1', _gridRowIndex: 10, ColumnA: 'burst' }],
          columns: [{ id: 'col-a', name: 'ColumnA', label: 'Column A', type: 'text' }]
        }
      },
      callbacksRef: { current: {} },
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null },
      flushUnmaterializedRowsBeforePersist
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const handled = await runDetectedCellMutationPersistEmitDispatch(deps, emit)

    expect(handled).toBe(true)
    expect(flushUnmaterializedRowsBeforePersist).not.toHaveBeenCalled()
    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: [
          expect.objectContaining({
            type: 'add_rows',
            data: {
              rows: [{ _clientRowId: 'client_row_1', _gridRowIndex: 10, ColumnA: 'burst' }]
            }
          })
        ]
      })
    )
    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }
    expect(payload.operations.some(operation => operation.type === 'set_range')).toBe(false)
  })

  it('emits unified batch operations for deferred-replay (persist-capable)', () => {
    const onMutationBatchOp = jest.fn()
    const cell: SpreadsheetMutationPlannedCell = {
      rowId: 'backend-row-1',
      columnName: 'column_a',
      rowIndex: 174,
      colIndex: 3,
      cellRef: 'D175',
      valueAction: 'set',
      value: '2'
    }
    const plan: SpreadsheetMutationPlan = {
      sheetId: 'sheet-1',
      cells: [cell]
    } as SpreadsheetMutationPlan
    const emit: PersistEmitInput = {
      source: 'deferred-replay',
      targetSheetId: 'sheet-1',
      mutationTraceId: 'trace_deferred_replay',
      localMutationPlan: plan,
      plannedCellsFiltered: [cell],
      emittedChangedCells: [
        {
          rowId: cell.rowId,
          columnName: cell.columnName,
          value: cell.value,
          univerRow: 174,
          univerCol: 3
        }
      ],
      planStyles: undefined,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      commandId: undefined,
      materializeRowsBeforeEmit: false
    }
    const deps = {
      propsRef: {
        current: {
          onMutationBatchOp
        }
      },
      callbacksRef: { current: {} },
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null }
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const handled = runDetectedCellMutationPersistEmitSync(deps, emit)

    expect(handled).toBe(true)
    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'set_range'
          })
        ])
      })
    )
  })

  it('coerces numeric deferred-replay values for numeric columns before emit', () => {
    const onMutationBatchOp = jest.fn()
    const cell: SpreadsheetMutationPlannedCell = {
      rowId: 'backend-row-1',
      columnName: 'amount',
      rowIndex: 10,
      colIndex: 0,
      cellRef: 'A11',
      valueAction: 'set',
      value: { v: '42', t: 2 }
    }
    const plan: SpreadsheetMutationPlan = {
      sheetId: 'sheet-1',
      cells: [cell]
    } as SpreadsheetMutationPlan
    const emit: PersistEmitInput = {
      source: 'deferred-replay',
      targetSheetId: 'sheet-1',
      mutationTraceId: 'trace_deferred_numeric',
      localMutationPlan: plan,
      plannedCellsFiltered: [cell],
      emittedChangedCells: [],
      planStyles: undefined,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      commandId: undefined,
      materializeRowsBeforeEmit: false
    }
    const deps = {
      propsRef: {
        current: {
          onMutationBatchOp,
          columns: [{ id: 'amount', name: 'amount', label: 'Amount', type: 'number', isVisible: true, order: 0 }]
        }
      },
      callbacksRef: { current: {} },
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null }
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const handled = runDetectedCellMutationPersistEmitSync(deps, emit)

    expect(handled).toBe(true)
    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'set_range',
            data: {
              cells: [
                {
                  rowId: 'backend-row-1',
                  columnName: 'amount',
                  value: { v: 42, t: 2 },
                  row: 10,
                  col: 0,
                  cellRef: 'A11'
                }
              ]
            }
          })
        ])
      })
    )
  })

  it('does not emit for deferred-reconcile (read-only)', () => {
    const onMutationBatchOp = jest.fn()
    const cell: SpreadsheetMutationPlannedCell = {
      rowId: 'backend-row-1',
      columnName: 'column_a',
      rowIndex: 174,
      colIndex: 3,
      cellRef: 'D175',
      valueAction: 'set',
      value: '2'
    }
    const plan: SpreadsheetMutationPlan = {
      sheetId: 'sheet-1',
      cells: [cell]
    } as SpreadsheetMutationPlan
    const emit: PersistEmitInput = {
      source: 'deferred-reconcile',
      targetSheetId: 'sheet-1',
      mutationTraceId: 'trace_deferred_reconcile',
      localMutationPlan: plan,
      plannedCellsFiltered: [cell],
      emittedChangedCells: [],
      planStyles: undefined,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      commandId: undefined,
      materializeRowsBeforeEmit: false
    }
    const deps = {
      propsRef: {
        current: {
          onMutationBatchOp
        }
      },
      callbacksRef: { current: {} },
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null }
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const handled = runDetectedCellMutationPersistEmitSync(deps, emit)

    expect(handled).toBe(false)
    expect(onMutationBatchOp).not.toHaveBeenCalled()
  })

  it('drops deferred-replay value writes already matching the authoritative signature', () => {
    const deps = {
      propsRef: { current: {} },
      callbacksRef: { current: {} },
      contextRef: { current: null },
      lastCellValueMutationAtRef: { current: 0 },
      lastSyncedGridCellSignaturesRef: {
        current: new Map([[remoteEchoKey(174, 0), toEchoSignature('2')]])
      },
      recentLocalMutationSignaturesRef: { current: new Map() },
      getWorkbookSnapshotRef: { current: jest.fn() },
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null }
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const result = runDetectedCellMutationPersistPlanPhase(deps, {
      now: 1000,
      source: 'deferred-replay',
      commandId: 'sheet.mutation.set-range-values',
      targetSheetId: 'sheet-1',
      contextOwnedByHost: false,
      cellValue: { 174: { 0: { v: '2' } } },
      ctxBefore: {
        rowIndexToId: new Map([[174, 'backend-row-1']]),
        columnIndexToName: new Map([[0, 'column_a']]),
        columnIndexToId: new Map([[0, 'col-a']])
      } as any,
      contextColumns: [
        {
          id: 'col-a',
          name: 'column_a',
          label: 'Column A',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          width: 120,
          order: 0
        }
      ] as any,
      currentData: [{ _id: 'backend-row-1', _gridRowIndex: 174, column_a: '' }],
      resolveStableRowTarget: () => null,
      resolveStableColumnName: () => null,
      rowIdentityStructureHealthy: true,
      rowIdentityStructuralMismatch: false,
      columnIdentityStructureHealthy: true,
      columnIdentityStructuralMismatch: false,
      rowOffset: 0,
      colOffset: 0,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      disableMixedValueStylePayloads: false,
      preserveUndefinedAsNull: false,
      explicitPayloadAbsoluteCellValue: { 174: { 0: { v: '2' } } },
      worksheetCellValue: { 174: { 0: { v: '2' } } },
      workbookSnapshotCellValue: undefined,
      payloadCellValue: { 174: { 0: { v: '2' } } },
      ranges: [{ startRow: 174, endRow: 174, startColumn: 0, endColumn: 0 }],
      shouldSuppress: () => false,
      pendingNewRowsUpdate: null,
      liveMergeRanges: null
    })

    expect(result).toEqual({ kind: 'return', value: false })
  })

  it('keeps deferred-replay value writes while the cell is still pending local ack', () => {
    const pendingLocalMutationCellsRef = {
      current: new Set([
        spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 174, 0),
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'column_a')
      ])
    }
    const deps = {
      propsRef: { current: { pendingLocalMutationCellsRef } },
      callbacksRef: { current: {} },
      contextRef: { current: null },
      lastCellValueMutationAtRef: { current: 0 },
      lastSyncedGridCellSignaturesRef: {
        current: new Map([[remoteEchoKey(174, 0), toEchoSignature('2')]])
      },
      recentLocalMutationSignaturesRef: { current: new Map() },
      getWorkbookSnapshotRef: { current: jest.fn() },
      getPersistedBaselineRowsSnapshot: () => [{ _id: 'backend-row-1', _gridRowIndex: 174, column_a: '' }],
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null }
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const result = runDetectedCellMutationPersistPlanPhase(deps, {
      now: 1000,
      source: 'deferred-replay',
      commandId: 'sheet.mutation.set-range-values',
      targetSheetId: 'sheet-1',
      contextOwnedByHost: false,
      cellValue: { 174: { 0: { v: '2' } } },
      ctxBefore: {
        rowIndexToId: new Map([[174, 'backend-row-1']]),
        columnIndexToName: new Map([[0, 'column_a']]),
        columnIndexToId: new Map([[0, 'col-a']])
      } as any,
      contextColumns: [
        {
          id: 'col-a',
          name: 'column_a',
          label: 'Column A',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          width: 120,
          order: 0
        }
      ] as any,
      currentData: [{ _id: 'backend-row-1', _gridRowIndex: 174, column_a: '2' }],
      resolveStableRowTarget: () => null,
      resolveStableColumnName: () => null,
      rowIdentityStructureHealthy: true,
      rowIdentityStructuralMismatch: false,
      columnIdentityStructureHealthy: true,
      columnIdentityStructuralMismatch: false,
      rowOffset: 0,
      colOffset: 0,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      disableMixedValueStylePayloads: false,
      preserveUndefinedAsNull: false,
      explicitPayloadAbsoluteCellValue: { 174: { 0: { v: '2' } } },
      worksheetCellValue: { 174: { 0: { v: '2' } } },
      workbookSnapshotCellValue: undefined,
      payloadCellValue: { 174: { 0: { v: '2' } } },
      ranges: [{ startRow: 174, endRow: 174, startColumn: 0, endColumn: 0 }],
      shouldSuppress: () => false,
      pendingNewRowsUpdate: null,
      liveMergeRanges: null
    })

    expect(result).toEqual({
      kind: 'emit',
      emit: expect.objectContaining({
        source: 'deferred-replay',
        plannedCellsFiltered: [
          expect.objectContaining({
            rowIndex: 174,
            colIndex: 0,
            valueAction: 'set',
            value: '2'
          })
        ]
      })
    })
  })

  it('still drops deferred-replay value writes once the persisted baseline proves the value is acked', () => {
    const pendingLocalMutationCellsRef = {
      current: new Set([
        spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 174, 0),
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'column_a')
      ])
    }
    const deps = {
      propsRef: { current: { pendingLocalMutationCellsRef } },
      callbacksRef: { current: {} },
      contextRef: { current: null },
      lastCellValueMutationAtRef: { current: 0 },
      lastSyncedGridCellSignaturesRef: {
        current: new Map([[remoteEchoKey(174, 0), toEchoSignature('2')]])
      },
      recentLocalMutationSignaturesRef: { current: new Map() },
      getWorkbookSnapshotRef: { current: jest.fn() },
      getPersistedBaselineRowsSnapshot: () => [{ _id: 'backend-row-1', _gridRowIndex: 174, column_a: '2' }],
      pendingFormattingPasteIntentRef: { current: null },
      pendingAutofillIntentRef: { current: null }
    } as unknown as UniverMountHandleDetectedCellMutationDeps

    const result = runDetectedCellMutationPersistPlanPhase(deps, {
      now: 1000,
      source: 'deferred-replay',
      commandId: 'sheet.mutation.set-range-values',
      targetSheetId: 'sheet-1',
      contextOwnedByHost: false,
      cellValue: { 174: { 0: { v: '2' } } },
      ctxBefore: {
        rowIndexToId: new Map([[174, 'backend-row-1']]),
        columnIndexToName: new Map([[0, 'column_a']]),
        columnIndexToId: new Map([[0, 'col-a']])
      } as any,
      contextColumns: [
        {
          id: 'col-a',
          name: 'column_a',
          label: 'Column A',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          width: 120,
          order: 0
        }
      ] as any,
      currentData: [{ _id: 'backend-row-1', _gridRowIndex: 174, column_a: '2' }],
      resolveStableRowTarget: () => null,
      resolveStableColumnName: () => null,
      rowIdentityStructureHealthy: true,
      rowIdentityStructuralMismatch: false,
      columnIdentityStructureHealthy: true,
      columnIdentityStructuralMismatch: false,
      rowOffset: 0,
      colOffset: 0,
      hadPasteIntentForSheet: false,
      hadPasteFormattingIntentForSheet: false,
      autofillApplyType: null,
      disableMixedValueStylePayloads: false,
      preserveUndefinedAsNull: false,
      explicitPayloadAbsoluteCellValue: { 174: { 0: { v: '2' } } },
      worksheetCellValue: { 174: { 0: { v: '2' } } },
      workbookSnapshotCellValue: undefined,
      payloadCellValue: { 174: { 0: { v: '2' } } },
      ranges: [{ startRow: 174, endRow: 174, startColumn: 0, endColumn: 0 }],
      shouldSuppress: () => false,
      pendingNewRowsUpdate: null,
      liveMergeRanges: null
    })

    expect(result).toEqual({ kind: 'return', value: false })
  })
})
