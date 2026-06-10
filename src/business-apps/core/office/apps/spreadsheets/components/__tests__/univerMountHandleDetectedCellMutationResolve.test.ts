import {
  clearMaterializedClientRowIndexMappings,
  resolveDetectedCellMutation,
  selectCoordinateModeAuto
} from '../univerMountHandleDetectedCellMutationResolve'
import { runDetectedCellMutationPersistPlanPhase } from '../univerMountHandleDetectedCellMutationPersistPlan'
import { createUniverConversionContext } from '../../utils/univerAdapter'
import { createSpreadsheetRowSlotIdentityRegistry } from '../../utils/spreadsheetRowSlotIdentity'
import { MERGE_WORKSHEET_MUTATION_ID, UNMERGE_WORKSHEET_MUTATION_ID } from '../univerGridMergeCommandIds'

const columns = [
  {
    id: 'col-a',
    name: 'column_a',
    label: 'Column A',
    type: 'text',
    isVisible: true,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0
  }
] as any

function makeWorksheet(
  sheetId = 'sheet-1',
  cellData: Record<string, unknown> | undefined = undefined,
  value: unknown = 'edited'
) {
  return {
    getSheetId: () => sheetId,
    getRange: () => ({
      getValue: () => value,
      getCellData: () => cellData
    })
  }
}

function makeDeps(overrides: Partial<any> = {}) {
  const worksheet = makeWorksheet(overrides.sheetId, overrides.worksheetCellData, overrides.worksheetValue)
  const propsData = overrides.propsData ?? []
  const propsColumns = overrides.propsColumns ?? columns
  const propsRef = {
    current: {
      sheet: { id: 'sheet-1' },
      data: propsData,
      columns: propsColumns,
      multiSheetWorkbookMode: true,
      getSheetContext: overrides.getSheetContext,
      getCanonicalSheetId: (sheetId: string) => sheetId,
      isUuidForRowRemap: (value: string) => value.startsWith('backend-'),
      ...overrides.props
    }
  }
  return {
    univerAPIRef: {
      current: {
        getActiveWorkbook: () => ({
          getActiveSheet: () => worksheet,
          getSheetBySheetId: () => worksheet
        })
      }
    },
    propsRef,
    callbacksRef: {
      current: {
        onDataChange: jest.fn(),
        onDiagnosticsTraceEvent: jest.fn()
      }
    },
    contextRef: {
      current: createUniverConversionContext(propsColumns, propsData)
    },
    recentlyDuplicatedWorksheetIdsRef: { current: new Map() },
    remoteEchoSuppressionRef: { current: new Map() },
    lastSyncedGridCellSignaturesRef: { current: new Map() },
    lastCellValueMutationAtRef: { current: 0 },
    newRowClientIdByIndexRef: { current: new Map(overrides.clientRowIdEntries ?? []) },
    recentLocalMutationSignaturesRef: { current: new Map() },
    pendingFormattingPasteIntentRef: { current: null },
    getWorkbookSnapshotRef: { current: () => null },
    peekPasteFormattingReplaceIntent: () => false,
    peekAutofillApplyType: () => null,
    ...overrides.deps
  } as any
}

describe('resolveDetectedCellMutation', () => {
  it('drops mutations when active workbook access hits a transient redi cycle', () => {
    const deps = makeDeps({
      deps: {
        univerAPIRef: {
          current: {
            getActiveWorkbook: () => {
              throw new Error('[redi]: Detecting cyclic dependency. The last identifier is "E11".')
            }
          }
        }
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'command-executed',
      commandId: 'sheet.command.set-range-bold',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result).toEqual({ status: 'return', value: false })
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_mutation_skipped_workbook_unavailable',
        payload: expect.objectContaining({
          source: 'command-executed',
          explicitWorksheetId: 'sheet-1'
        })
      })
    )
  })

  it('consumes autofill intent on sheet-value-changed using the mutation ranges', () => {
    const peekAutofillApplyType = jest.fn().mockReturnValue('COPY')
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'seed' }],
      worksheetCellData: { v: 'filled', s: 'style-1' },
      worksheetValue: 'filled',
      deps: { peekAutofillApplyType }
    })
    const ranges = [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]

    resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges,
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(peekAutofillApplyType).toHaveBeenCalledWith('sheet-1', ranges, true)
  })

  it('does not consume autofill intent on command-executed preflight reads', () => {
    const peekAutofillApplyType = jest.fn().mockReturnValue('COPY')
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'seed' }],
      worksheetCellData: { v: 'filled', s: 'style-1' },
      worksheetValue: 'filled',
      deps: { peekAutofillApplyType }
    })
    const ranges = [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]

    resolveDetectedCellMutation(deps, {
      source: 'command-executed',
      commandId: 'sheet.mutation.set-range-values',
      ranges,
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(peekAutofillApplyType).toHaveBeenCalledWith('sheet-1', ranges, false)
  })

  it('skips sheet-value-changed persistence planning for merge mutations', () => {
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'seed' }],
      propsColumns: [
        ...columns,
        {
          id: 'col-b',
          name: 'column_b',
          label: 'Column B',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          order: 1
        }
      ],
      worksheetCellData: { v: 'seed' },
      worksheetValue: 'seed'
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: MERGE_WORKSHEET_MUTATION_ID,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
      payloadCellValue: {
        0: {
          0: { v: 'seed' },
          1: { v: 'seed' }
        }
      },
      worksheetId: 'sheet-1'
    })

    expect(result).toEqual({ status: 'return', value: false })
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_merge_mutation_cell_persist_skipped',
        payload: expect.objectContaining({
          commandId: MERGE_WORKSHEET_MUTATION_ID
        })
      })
    )
  })

  it('skips sheet-value-changed persistence planning for unmerge mutations', () => {
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'seed' }],
      worksheetCellData: { v: 'seed' },
      worksheetValue: 'seed'
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: UNMERGE_WORKSHEET_MUTATION_ID,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: {
        0: {
          0: { v: 'seed' }
        }
      },
      worksheetId: 'sheet-1'
    })

    expect(result).toEqual({ status: 'return', value: false })
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_merge_mutation_cell_persist_skipped',
        payload: expect.objectContaining({
          commandId: UNMERGE_WORKSHEET_MUTATION_ID
        })
      })
    )
  })

  it('reads live worksheet cell data for style-only SheetValueChanged commands so formatting can be persisted', () => {
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'Alice' }],
      worksheetCellData: {
        v: 'Alice',
        bg: { rgb: '#00ff00' },
        cl: { rgb: '#111111' }
      },
      worksheetValue: 'Alice'
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.command.set-range-background',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.worksheetCellValue).toEqual({
      0: {
        0: {
          v: 'Alice',
          bg: { rgb: '#00ff00' },
          cl: { rgb: '#111111' }
        }
      }
    })

    expect(result.ready.commandId).toBe('sheet.command.set-range-background')
  })

  it('reads live worksheet formatting for style-only commands even when a workbook snapshot is available', () => {
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'Alice' }],
      worksheetCellData: { v: 'Alice', bl: 1 },
      worksheetValue: 'Alice',
      deps: {
        getWorkbookSnapshotRef: {
          current: () => ({
            styles: {},
            sheets: {
              'sheet-1': {
                cellData: {
                  0: {
                    0: { v: 'Alice' }
                  }
                }
              }
            }
          })
        }
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.command.set-range-bold',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.worksheetCellValue).toEqual({
      0: {
        0: {
          v: 'Alice',
          bl: 1
        }
      }
    })
  })

  it('prefers sheet-value-changed payload values over stale workbook snapshot reads', () => {
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'Alice' }],
      worksheetCellData: { v: 'Alice' },
      worksheetValue: 'Alice',
      deps: {
        getWorkbookSnapshotRef: {
          current: () => ({
            styles: {},
            sheets: {
              'sheet-1': {
                cellData: {
                  0: {
                    0: { v: 'Alice' }
                  }
                }
              }
            }
          })
        }
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: { 0: { 0: { v: 'Allowed' } } },
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.cellValue).toEqual({
      0: {
        0: { v: 'Allowed' }
      }
    })
  })

  it('drops mutations from unknown worksheet ids instead of falling back to the active sheet context', () => {
    const deps = makeDeps({
      getSheetContext: (sheetId: string) => (sheetId === 'sheet-1' ? { columns, data: [] } : null),
      props: {
        getCanonicalSheetId: (sheetId: string) => sheetId
      },
      sheetId: 'ghost-sheet'
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: { 0: { 0: { v: 'ghost write' } } },
      worksheetId: 'ghost-sheet'
    })

    expect(result).toEqual({ status: 'return', value: false })
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_mutation_dropped_unknown_sheet',
        payload: expect.objectContaining({
          rawWorksheetId: 'ghost-sheet',
          canonicalWorksheetId: 'ghost-sheet',
          propSheetId: 'sheet-1'
        })
      })
    )
  })

  it('uses session-backed context when props lag behind after fill-down materialized more backend rows', () => {
    const propsRows = [
      { _id: 'backend-row-0', _rowUuid: 'backend-row-0', _gridRowIndex: 0, column_a: 1 },
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 1, column_a: 2 }
    ]
    const sessionRows = Array.from({ length: 5 }, (_, index) => ({
      _id: `backend-row-${index}`,
      _rowUuid: `backend-row-${index}`,
      _gridRowIndex: index,
      column_a: index + 1
    }))
    const deps = makeDeps({
      propsData: propsRows,
      getSheetContext: () => ({ columns, data: sessionRows }),
      worksheetCellData: { v: 3, bl: 1 },
      worksheetValue: 3
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.command.set-range-bold',
      ranges: [{ startRow: 2, endRow: 2, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.contextOwnedByHost).toBe(true)
    expect(result.ready.currentData).toBe(sessionRows)

    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: 'backend-row-2',
        rowIndex: 2,
        columnName: 'column_a',
        stylePatch: expect.objectContaining({
          set: expect.objectContaining({ bl: 1 })
        })
      })
    ])
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          contextSource: 'resolved'
        })
      })
    )
  })

  it('uses session-backed context when props data is stale and resolved rows have backend identities', () => {
    const resolvedRows = [
      {
        _id: 'client_materialized',
        _clientRowId: 'client_materialized',
        _rowUuid: 'backend-row-1',
        column_a: 'before'
      }
    ]
    const deps = makeDeps({
      propsData: [],
      getSheetContext: () => ({ columns, data: resolvedRows })
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.contextOwnedByHost).toBe(true)
    expect(result.ready.currentData).toBe(resolvedRows)
    expect(result.ready.ctxBefore.rowIndexToId.get(0)).toBe('backend-row-1')
    expect(result.ready.pendingNewRowsUpdate).toBeNull()
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_planner_context_source_used',
        payload: expect.objectContaining({
          contextSource: 'resolved',
          propsDataLength: 0,
          currentDataLength: 1,
          resolvedBackendRowCount: 1,
          newRowIndices: []
        })
      })
    )
  })

  it('prefers props context when resolved rows no longer match the visual row layout', () => {
    const resolvedRows = [
      {
        _id: 'client_materialized',
        _clientRowId: 'client_materialized',
        _rowUuid: 'backend-row-1',
        column_a: 'persisted'
      }
    ]
    const visualOnlyRows = [
      ...resolvedRows,
      {
        _id: 'client_visual_only',
        _clientRowId: 'client_visual_only',
        column_a: 'not persisted'
      }
    ]
    const deps = makeDeps({
      propsData: visualOnlyRows,
      getSheetContext: () => ({ columns, data: resolvedRows })
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.contextOwnedByHost).toBe(false)
    expect(result.ready.currentData).toBe(visualOnlyRows)
    expect(result.ready.pendingNewRowsUpdate).toBeNull()
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          contextSource: 'props',
          propsDataLength: 2,
          currentDataLength: 2
        })
      })
    )
  })

  it('keeps inserted-row visual mapping aligned when resolved context is missing the optimistic middle row', () => {
    const propsRows = [
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, column_a: '1' },
      { _id: 'client_inserted', _clientRowId: 'client_inserted', _gridRowIndex: 1, column_a: '' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, column_a: '2' },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 3, column_a: '3' }
    ]
    const resolvedRows = [
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, column_a: '1' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, column_a: '2' },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 2, column_a: '3' }
    ]
    const deps = makeDeps({
      propsData: propsRows,
      getSheetContext: () => ({ columns, data: resolvedRows })
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.contextOwnedByHost).toBe(false)
    expect(result.ready.ctxBefore.rowIndexToId.get(1)).toBe('client_inserted')
    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: 'client_inserted',
        rowRef: { kind: 'clientHandle', clientRowId: 'client_inserted' },
        rowIndex: 1,
        columnName: 'column_a',
        valueAction: 'set',
        value: 'edited'
      })
    ])
  })

  it('rebuilds props planner context from props rows instead of reusing a stale contextRef mapping', () => {
    const propsRows = [
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, column_a: '1' },
      { _id: 'client_inserted', _clientRowId: 'client_inserted', _gridRowIndex: 1, column_a: '' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, column_a: '2' }
    ]
    const staleContextRows = [
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, column_a: '1' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, column_a: '2' }
    ]
    const deps = makeDeps({
      propsData: propsRows,
      deps: {
        contextRef: {
          current: createUniverConversionContext(columns, staleContextRows)
        }
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.contextOwnedByHost).toBe(false)
    expect(result.ready.ctxBefore.rowIndexToId.get(1)).toBe('client_inserted')
    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: 'client_inserted',
        rowRef: { kind: 'clientHandle', clientRowId: 'client_inserted' },
        rowIndex: 1,
        columnName: 'column_a',
        valueAction: 'set',
        value: 'edited'
      })
    ])
  })

  it('materializes a sparse visual row even when compact data has a later backend row at that array index', () => {
    const resolvedRows = [
      { _id: 'backend-row-0', _rowUuid: 'backend-row-0', _gridRowIndex: 0, column_a: 'row 0' },
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 1, column_a: 'row 1' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, column_a: 'row 2' },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 3, column_a: 'row 3' },
      { _id: 'backend-row-4', _rowUuid: 'backend-row-4', _gridRowIndex: 4, column_a: 'row 4' },
      { _id: 'backend-row-5', _rowUuid: 'backend-row-5', _gridRowIndex: 5, column_a: 'row 5' },
      { _id: 'backend-row-6', _rowUuid: 'backend-row-6', _gridRowIndex: 6, column_a: 'row 6' },
      { _id: 'backend-row-7', _rowUuid: 'backend-row-7', _gridRowIndex: 7, column_a: 'row 7' },
      { _id: 'backend-row-8', _rowUuid: 'backend-row-8', _gridRowIndex: 8, column_a: 'row 8' },
      { _id: 'backend-row-10', _rowUuid: 'backend-row-10', _gridRowIndex: 10, column_a: 'row 10' }
    ]
    const deps = makeDeps({
      propsData: resolvedRows,
      getSheetContext: () => ({ columns, data: resolvedRows })
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 9, endRow: 9, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.pendingNewRowsUpdate?.nextData).toHaveLength(11)
    expect(result.ready.pendingNewRowsUpdate?.nextContext.rowIndexToId.get(9)).toEqual(
      deps.newRowClientIdByIndexRef.current.get(9)
    )
    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: deps.newRowClientIdByIndexRef.current.get(9),
        columnName: 'column_a',
        rowIndex: 9,
        colIndex: 0,
        valueAction: 'set',
        value: 'edited'
      })
    ])
    expect(planned.emit.materializeRowsBeforeEmit).toBe(true)
    expect(deps.callbacksRef.current.onDataChange).toHaveBeenCalledWith(
      result.ready.pendingNewRowsUpdate?.nextData,
      'sheet-1'
    )
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          candidateNewRowIndices: [9],
          newRowIndices: [9]
        })
      })
    )
  })

  it('does not add a style patch when plain typing materializes a new row', () => {
    const resolvedRows = [
      { _id: 'backend-row-0', _rowUuid: 'backend-row-0', _gridRowIndex: 0, column_a: 'row 0' },
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 1, column_a: 'row 1' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, column_a: 'row 2' },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 3, column_a: 'row 3' },
      { _id: 'backend-row-4', _rowUuid: 'backend-row-4', _gridRowIndex: 4, column_a: 'row 4' },
      { _id: 'backend-row-5', _rowUuid: 'backend-row-5', _gridRowIndex: 5, column_a: 'row 5' },
      { _id: 'backend-row-6', _rowUuid: 'backend-row-6', _gridRowIndex: 6, column_a: 'row 6' },
      { _id: 'backend-row-7', _rowUuid: 'backend-row-7', _gridRowIndex: 7, column_a: 'row 7' },
      { _id: 'backend-row-8', _rowUuid: 'backend-row-8', _gridRowIndex: 8, column_a: 'row 8' },
      { _id: 'backend-row-10', _rowUuid: 'backend-row-10', _gridRowIndex: 10, column_a: 'row 10' }
    ]
    const deps = makeDeps({
      propsData: resolvedRows,
      getSheetContext: () => ({ columns, data: resolvedRows })
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 9, endRow: 9, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: deps.newRowClientIdByIndexRef.current.get(9),
        columnName: 'column_a',
        rowIndex: 9,
        colIndex: 0,
        valueAction: 'set',
        value: 'edited'
      })
    ])
    expect(planned.emit.plannedCellsFiltered[0]?.stylePatch).toBeUndefined()
  })

  it('keeps pasted values and materializes rows when pasting into an empty grid slot with formatting', () => {
    const resolvedRows = [
      { _id: 'backend-row-0', _rowUuid: 'backend-row-0', _gridRowIndex: 0, column_a: 'row 0' },
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 1, column_a: 'row 1' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, column_a: 'row 2' },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 3, column_a: 'row 3' },
      { _id: 'backend-row-4', _rowUuid: 'backend-row-4', _gridRowIndex: 4, column_a: 'row 4' },
      { _id: 'backend-row-5', _rowUuid: 'backend-row-5', _gridRowIndex: 5, column_a: 'row 5' },
      { _id: 'backend-row-6', _rowUuid: 'backend-row-6', _gridRowIndex: 6, column_a: 'row 6' },
      { _id: 'backend-row-7', _rowUuid: 'backend-row-7', _gridRowIndex: 7, column_a: 'row 7' },
      { _id: 'backend-row-8', _rowUuid: 'backend-row-8', _gridRowIndex: 8, column_a: 'row 8' },
      { _id: 'backend-row-10', _rowUuid: 'backend-row-10', _gridRowIndex: 10, column_a: 'row 10' }
    ]
    const deps = makeDeps({
      propsData: resolvedRows,
      getSheetContext: () => ({ columns, data: resolvedRows }),
      deps: {
        peekPasteFormattingReplaceIntent: () => true
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 9, endRow: 9, startColumn: 0, endColumn: 0 }],
      payloadCellValue: {
        9: {
          0: { v: 1, s: 'style-1', bl: 1 }
        }
      },
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    const clientRowId = deps.newRowClientIdByIndexRef.current.get(9)
    const pendingRow = result.ready.pendingNewRowsUpdate?.nextData.find(row => row._id === clientRowId)
    expect(pendingRow?.column_a).toEqual({ v: 1 })
    expect(pendingRow?.column_a).not.toEqual(expect.objectContaining({ ff: expect.anything() }))
    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: clientRowId,
        columnName: 'column_a',
        valueAction: 'set',
        value: 1,
        stylePatch: expect.anything()
      })
    ])
    expect(planned.emit.materializeRowsBeforeEmit).toBe(true)
    expect(deps.callbacksRef.current.onDataChange).toHaveBeenCalled()
  })

  it('does not reuse a stale client row id mapping once that row index has a backend uuid', () => {
    const resolvedRows = [
      {
        _id: 'client_materialized',
        _clientRowId: 'client_materialized',
        _rowUuid: 'backend-row-1',
        column_a: 'before'
      }
    ]
    const clientRowIdEntries: Array<[number, string]> = [[0, 'client_materialized']]
    const deps = makeDeps({
      propsData: [],
      getSheetContext: () => ({ columns, data: resolvedRows }),
      clientRowIdEntries
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    expect(deps.newRowClientIdByIndexRef.current.has(0)).toBe(false)
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          clearedClientRowIndexMappings: [
            {
              rowIndex: 0,
              clientRowId: 'client_materialized',
              backendRowUuid: 'backend-row-1'
            }
          ]
        })
      })
    )
  })

  it('defers mutation planning when row slot identity is structurally unhealthy and unresolved', () => {
    const registry = createSpreadsheetRowSlotIdentityRegistry()
    registry.markUnhealthy('sheet-1', 'manual_insert_pending')
    const deps = makeDeps({
      propsData: [],
      props: {
        rowSlotIdentityRegistryRef: {
          current: registry
        }
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result).toEqual({ status: 'return', value: false })
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_mutation_deferred_unhealthy_row_identity',
        payload: expect.objectContaining({
          targetSheetId: 'sheet-1',
          unresolvedStableRowIndices: [0]
        })
      })
    )
  })

  it('prefers props columns for immediate post-insert edits when resolved column mapping is stale', () => {
    const propsColumns = [
      {
        id: 'col-a',
        name: 'column_a',
        label: 'Column A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: 0
      },
      {
        id: 'col-inserted',
        name: 'column_inserted',
        label: 'Inserted',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: 1
      }
    ] as any
    const staleResolvedColumns = [propsColumns[0]]
    const deps = makeDeps({
      propsData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'A', column_inserted: '' }],
      propsColumns,
      getSheetContext: () => ({
        columns: staleResolvedColumns,
        data: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', column_a: 'A' }]
      }),
      props: {
        columnStructureStateRef: {
          current: {
            healthy: false,
            pendingInsertedRange: { startIndex: 1, endIndex: 1, columnNames: ['column_inserted'] },
            expectedColumnsSignature: 'pending'
          }
        }
      }
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.ready.contextOwnedByHost).toBe(false)
    expect(result.ready.columnIdentityStructureHealthy).toBe(false)
    expect(result.ready.resolveStableColumnName(1)).toBe('column_inserted')

    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return
    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: 'backend-row-1',
        columnName: 'column_inserted',
        rowIndex: 0,
        colIndex: 1,
        valueAction: 'set',
        value: 'edited'
      })
    ])
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_planner_context_source_used',
        payload: expect.objectContaining({
          contextSource: 'props',
          columnIdentityStructureHealthy: false,
          columnIdentityStructuralMismatch: true,
          pendingInsertedColumnRange: { startIndex: 1, endIndex: 1, columnNames: ['column_inserted'] }
        })
      })
    )
  })

  it('prefers the current planner row over a stale registry slot target for the same visual index', () => {
    const registry = createSpreadsheetRowSlotIdentityRegistry()
    registry.syncRows(
      'sheet-1',
      [
        { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, column_a: '1' },
        { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 1, column_a: '3' },
        { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, column_a: '2' }
      ],
      value => value.startsWith('backend-')
    )

    const propsRows = [
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, column_a: '1' },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, column_a: '' },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _gridRowIndex: 2, column_a: '3' }
    ]

    const deps = makeDeps({
      propsData: propsRows,
      props: {
        rowSlotIdentityRegistryRef: {
          current: registry
        }
      },
      getSheetContext: () => ({ columns, data: propsRows })
    })

    const result = resolveDetectedCellMutation(deps, {
      source: 'sheet-value-changed',
      commandId: 'sheet.mutation.set-range-values',
      ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }],
      payloadCellValue: undefined,
      worksheetId: 'sheet-1'
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return

    const planned = runDetectedCellMutationPersistPlanPhase(deps, result.ready)
    expect(planned.kind).toBe('emit')
    if (planned.kind !== 'emit') return

    expect(planned.emit.plannedCellsFiltered).toEqual([
      expect.objectContaining({
        rowId: 'backend-row-2',
        rowIndex: 1,
        columnName: 'column_a',
        valueAction: 'set',
        value: 'edited'
      })
    ])
  })
})

// 3b: 'auto' coordinate-mode tie-breaker semantics — relative wins on ties; absolute wins
// only on strict inequality in destructiveBlankWrites or (when those are equal) in changed.
describe('selectCoordinateModeAuto', () => {
  it('returns absolute when it has strictly fewer destructive blank writes', () => {
    expect(
      selectCoordinateModeAuto({ destructiveBlankWrites: 3, changed: 10 }, { destructiveBlankWrites: 1, changed: 10 })
    ).toBe('absolute')
  })

  it('returns relative when it has strictly fewer destructive blank writes', () => {
    expect(
      selectCoordinateModeAuto({ destructiveBlankWrites: 1, changed: 10 }, { destructiveBlankWrites: 3, changed: 10 })
    ).toBe('relative')
  })

  it('returns absolute when destructive writes tie and absolute has fewer changes', () => {
    expect(
      selectCoordinateModeAuto({ destructiveBlankWrites: 2, changed: 10 }, { destructiveBlankWrites: 2, changed: 5 })
    ).toBe('absolute')
  })

  it('returns relative on an exact tie (relative wins ties)', () => {
    expect(
      selectCoordinateModeAuto({ destructiveBlankWrites: 2, changed: 5 }, { destructiveBlankWrites: 2, changed: 5 })
    ).toBe('relative')
  })

  it('returns relative when destructive writes tie and absolute has more changes', () => {
    expect(
      selectCoordinateModeAuto({ destructiveBlankWrites: 2, changed: 5 }, { destructiveBlankWrites: 2, changed: 10 })
    ).toBe('relative')
  })
})

// 2b: strict head-equality identity matching for client_* row-index mapping rotation safety.
describe('clearMaterializedClientRowIndexMappings (identity rotation)', () => {
  const BACKEND_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isUuid = (value: string): boolean => BACKEND_UUID.test(value)

  it('clears the mapping when the primary (head) candidate matches the recorded client id', () => {
    const idMap = new Map<number, string>([[0, 'client_row_aaa']])
    const cleared = clearMaterializedClientRowIndexMappings({
      rowIndices: [0],
      rowOffset: 0,
      data: [
        {
          _id: 'client_row_aaa',
          _clientRowId: 'client_row_aaa',
          _rowUuid: '00000000-0000-4000-8000-000000000001',
          _gridRowIndex: 0
        }
      ],
      idMap,
      isUuid
    })
    expect(cleared).toEqual([
      expect.objectContaining({
        rowIndex: 0,
        clientRowId: 'client_row_aaa',
        backendRowUuid: '00000000-0000-4000-8000-000000000001'
      })
    ])
    expect(idMap.has(0)).toBe(false)
  })

  it('does NOT clear when the recorded client id is only a stale non-head candidate', () => {
    // The recorded clientRowId now sits in `id` (a non-primary candidate), while the row's
    // current primary identity is `_id: client_row_new`. Old loose `includes()` would still
    // clear the mapping; strict head-equality must not.
    const idMap = new Map<number, string>([[0, 'client_row_aaa']])
    const cleared = clearMaterializedClientRowIndexMappings({
      rowIndices: [0],
      rowOffset: 0,
      data: [
        {
          _id: 'client_row_new',
          _clientRowId: 'client_row_new',
          id: 'client_row_aaa',
          _rowUuid: '00000000-0000-4000-8000-000000000001',
          _gridRowIndex: 0
        }
      ],
      idMap,
      isUuid
    })
    expect(cleared).toEqual([])
    expect(idMap.get(0)).toBe('client_row_aaa')
  })

  it('does NOT clear when backendRowUuid is missing (row not yet materialized)', () => {
    const idMap = new Map<number, string>([[0, 'client_row_aaa']])
    const cleared = clearMaterializedClientRowIndexMappings({
      rowIndices: [0],
      rowOffset: 0,
      data: [
        {
          _id: 'client_row_aaa',
          _clientRowId: 'client_row_aaa',
          _gridRowIndex: 0
        }
      ],
      idMap,
      isUuid
    })
    expect(cleared).toEqual([])
    expect(idMap.get(0)).toBe('client_row_aaa')
  })

  it('accepts a current getClientRowIdentity match even when the head candidate differs', () => {
    // `_clientRowId` provides the canonical client identity; `_id` is already the backend uuid.
    const idMap = new Map<number, string>([[0, 'client_row_aaa']])
    const cleared = clearMaterializedClientRowIndexMappings({
      rowIndices: [0],
      rowOffset: 0,
      data: [
        {
          _id: '00000000-0000-4000-8000-000000000001',
          _rowUuid: '00000000-0000-4000-8000-000000000001',
          _clientRowId: 'client_row_aaa',
          _gridRowIndex: 0
        }
      ],
      idMap,
      isUuid
    })
    expect(cleared).toHaveLength(1)
    expect(idMap.has(0)).toBe(false)
  })
})
