import { resolveDetectedCellMutation } from '../univerMountHandleDetectedCellMutationResolve'
import { runDetectedCellMutationPersistPlanPhase } from '../univerMountHandleDetectedCellMutationPersistPlan'
import { createUniverConversionContext } from '../../utils/univerAdapter'

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

function makeWorksheet(sheetId = 'sheet-1') {
  return {
    getSheetId: () => sheetId,
    getRange: () => ({
      getValue: () => 'edited'
    })
  }
}

function makeDeps(overrides: Partial<any> = {}) {
  const worksheet = makeWorksheet()
  const propsData = overrides.propsData ?? []
  const propsColumns = overrides.propsColumns ?? columns
  const propsRef = {
    current: {
      sheet: { id: 'sheet-1' },
      data: propsData,
      columns: propsColumns,
      multiSheetWorkbookMode: true,
      getSheetContext: overrides.getSheetContext,
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
    recentLocallyMutatedGridCellsRef: { current: new Map() },
    lastSyncedGridCellSignaturesRef: { current: new Map() },
    lastCellValueMutationAtRef: { current: 0 },
    newRowClientIdByIndexRef: { current: new Map(overrides.clientRowIdEntries ?? []) },
    recentLocalMutationSignaturesRef: { current: new Map() },
    pendingFormattingPasteIntentRef: { current: null },
    getWorkbookSnapshotRef: { current: () => null },
    peekPasteFormattingReplaceIntent: () => false,
    isUuidForRowRemap: (value: string) => value.startsWith('backend-'),
    ...overrides.deps
  } as any
}

describe('resolveDetectedCellMutation', () => {
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
    expect(result.ready.useResolvedContext).toBe(true)
    expect(result.ready.currentData).toBe(resolvedRows)
    expect(result.ready.ctxBefore.rowIndexToId.get(0)).toBe('client_materialized')
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

  it('prefers shorter authoritative session context over longer visual props data', () => {
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
    expect(result.ready.useResolvedContext).toBe(true)
    expect(result.ready.currentData).toBe(resolvedRows)
    expect(result.ready.pendingNewRowsUpdate?.nextData).toHaveLength(2)
    expect(deps.callbacksRef.current.onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          contextSource: 'resolved',
          propsDataLength: 2,
          currentDataLength: 1,
          candidateNewRowIndices: [1],
          newRowIndices: [1]
        })
      })
    )
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
})
