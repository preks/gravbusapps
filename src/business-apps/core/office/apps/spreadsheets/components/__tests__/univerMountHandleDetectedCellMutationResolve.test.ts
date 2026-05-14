import { resolveDetectedCellMutation } from '../univerMountHandleDetectedCellMutationResolve'
import { runDetectedCellMutationPersistPlanPhase } from '../univerMountHandleDetectedCellMutationPersistPlan'
import { createUniverConversionContext } from '../../utils/univerAdapter'
import { createSpreadsheetRowSlotIdentityRegistry } from '../../utils/spreadsheetRowSlotIdentity'

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
    expect(result.ready.useResolvedContext).toBe(false)
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
    expect(result.ready.useResolvedContext).toBe(false)
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
    expect(result.ready.useResolvedContext).toBe(false)
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
    expect(result.ready.useResolvedContext).toBe(false)
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
