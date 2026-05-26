import { createSpreadsheetRowMaterializationReadiness } from '../spreadsheetRowMaterializationReadiness'
import {
  buildOccupiedSlotRowAdoptions,
  buildSpreadsheetRowMaterializationPlan,
  filterMaterializationEntriesForPersistedSlots,
  resolveUniverRowsForSubmitReadinessMaterialization
} from '../spreadsheetRowMaterializationPlan'

const isBackendRowId = (value: string): boolean => value.startsWith('backend-row-')

const persistedBackendRow = (
  gridRowIndex: number,
  backendRowId: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  _id: backendRowId,
  _rowUuid: backendRowId,
  _gridRowIndex: gridRowIndex,
  ...extra
})

const viewerClientRow = (
  gridRowIndex: number,
  clientRowId: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  _id: clientRowId,
  _gridRowIndex: gridRowIndex,
  ...extra
})

const viewerBackendRow = (
  gridRowIndex: number,
  backendRowId: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  _id: backendRowId,
  _rowUuid: backendRowId,
  _gridRowIndex: gridRowIndex,
  ...extra
})

describe('buildSpreadsheetRowMaterializationPlan', () => {
  it('builds occupied slot adoptions for temp client rows at persisted backend slots', () => {
    const adoptions = buildOccupiedSlotRowAdoptions({
      univerRows: [viewerClientRow(7, 'client_row_7'), viewerClientRow(9, 'client_row_9')],
      persistedRows: [persistedBackendRow(7, 'backend-row-7'), persistedBackendRow(9, 'backend-row-9')],
      isUuid: isBackendRowId
    })

    expect(Array.from(adoptions.persistedIdByClientRowId.entries())).toEqual([
      ['client_row_7', 'backend-row-7'],
      ['client_row_9', 'backend-row-9']
    ])
    expect(adoptions.adoptedRows).toEqual([
      persistedBackendRow(7, 'backend-row-7', { _clientRowId: 'client_row_7' }),
      persistedBackendRow(9, 'backend-row-9', { _clientRowId: 'client_row_9' })
    ])
  })

  it('skips add_rows when visual index is already occupied by a persisted backend row', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(0, 'client_row_0')],
      persistedRows: [persistedBackendRow(0, 'backend-row-0')],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(0)
    expect(plan.rowsToMaterialize).toEqual([])
    expect(plan.alreadyMaterializedGridRowIndices).toEqual([0])
  })

  it('skips row when backend identity matches persisted row at visual index', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerBackendRow(0, 'backend-row-0')],
      persistedRows: [persistedBackendRow(0, 'backend-row-0')],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(0)
    expect(plan.rowsToMaterialize).toEqual([])
  })

  it('skips row when client row identity matches persisted row at visual index', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(0, 'client_row_0')],
      persistedRows: [persistedBackendRow(0, 'backend-row-0', { _clientRowId: 'client_row_0' })],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(0)
    expect(plan.rowsToMaterialize).toEqual([])
  })

  it('does not skip when backend identities conflict at same visual index', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerBackendRow(0, 'backend-row-b')],
      persistedRows: [persistedBackendRow(0, 'backend-row-a')],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(1)
    expect(plan.rowsToMaterialize).toEqual([{ _id: 'backend-row-b', _rowUuid: 'backend-row-b', _gridRowIndex: 0 }])
  })

  it('does not rematerialize a viewer row that already has a backend uuid even if persisted rows lag behind', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerBackendRow(1, 'backend-row-b', { column_a: 'persisted already' })],
      persistedRows: [persistedBackendRow(0, 'backend-row-a')],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(0)
    expect(plan.rowsToMaterialize).toEqual([])
  })

  it('never derives a materialization client id from a backend uuid', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerBackendRow(2, 'backend-row-b')],
      persistedRows: [],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.unmaterializedClientRowIds).toEqual([])
  })

  it('matches persisted rows by visual index even when persisted rows are longer and out of array order', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(2, 'client_row_2')],
      persistedRows: [
        persistedBackendRow(0, 'backend-row-0'),
        persistedBackendRow(2, 'backend-row-2', { _clientRowId: 'client_row_2' }),
        persistedBackendRow(1, 'backend-row-1')
      ],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.rowsToMaterialize).toEqual([])
  })

  it('skips add_rows when insert_row_slots readiness already resolved the client row', () => {
    const readiness = createSpreadsheetRowMaterializationReadiness()
    readiness.resolve('sheet-1', 'client_row_2', 'backend-row-2')

    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(2, 'client_row_2')],
      persistedRows: [],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>(),
      rowMaterializationReadiness: readiness
    })

    expect(plan.missingAndWillCreateCount).toBe(0)
    expect(plan.rowsToMaterialize).toEqual([])
  })

  it('defers add_rows while insert_row_slots readiness is still pending', () => {
    const readiness = createSpreadsheetRowMaterializationReadiness()
    readiness.registerPending('sheet-1', 'client_row_2', new Promise<string>(() => undefined))

    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(2, 'client_row_2')],
      persistedRows: [],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>(),
      rowMaterializationReadiness: readiness
    })

    expect(plan.missingAndWillCreateCount).toBe(0)
    expect(plan.rowsToMaterialize).toEqual([])
    expect(plan.inFlightMissingGridRowIndices).toEqual([2])
  })

  it('filterMaterializationEntriesForPersistedSlots drops rows already persisted at the slot', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(2, 'client_row_2')],
      persistedRows: [],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })
    const persistedRows = [persistedBackendRow(2, 'backend-row-2', { _clientRowId: 'client_row_2' })]

    const filtered = filterMaterializationEntriesForPersistedSlots(plan, persistedRows, isBackendRowId)

    expect(filtered.rowsToMaterialize).toEqual([])
    expect(filtered.missingAndWillCreateCount).toBe(0)
  })
})

describe('resolveUniverRowsForSubmitReadinessMaterialization', () => {
  it('prefers session rows when optimistic fill-down added more temporary client rows than the Univer snapshot', () => {
    const sessionRows = [
      persistedBackendRow(0, 'backend-row-0', { colA: 1, colB: 2 }),
      persistedBackendRow(1, 'backend-row-1', { colA: 2, colB: 3 }),
      viewerClientRow(2, 'client_row_2', { colA: 3, colB: 4 }),
      viewerClientRow(3, 'client_row_3', { colA: 4, colB: 5 })
    ]
    const latestUniverRows = [
      persistedBackendRow(0, 'backend-row-0', { colA: 1, colB: 2 }),
      persistedBackendRow(1, 'backend-row-1', { colA: 2, colB: 3 })
    ]

    const resolved = resolveUniverRowsForSubmitReadinessMaterialization({
      sessionRows,
      latestUniverRows,
      isUuid: isBackendRowId
    })

    expect(resolved).toBe(sessionRows)
  })

  it('materializes temporary rows from the session snapshot after fill-down', () => {
    const sessionRows = [
      persistedBackendRow(0, 'backend-row-0'),
      persistedBackendRow(1, 'backend-row-1'),
      viewerClientRow(2, 'client_row_2', { colA: 3 }),
      viewerClientRow(3, 'client_row_3', { colA: 4 })
    ]
    const resolved = resolveUniverRowsForSubmitReadinessMaterialization({
      sessionRows,
      latestUniverRows: sessionRows.slice(0, 2),
      isUuid: isBackendRowId
    })
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: resolved,
      persistedRows: sessionRows,
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(2)
    expect(plan.unmaterializedClientRowIds).toEqual(['client_row_2', 'client_row_3'])
  })

  it('keeps the Univer snapshot when it already carries the same temporary row count', () => {
    const latestUniverRows = [viewerClientRow(2, 'client_row_2')]
    const sessionRows = [viewerClientRow(2, 'client_row_2')]

    const resolved = resolveUniverRowsForSubmitReadinessMaterialization({
      sessionRows,
      latestUniverRows,
      isUuid: isBackendRowId
    })

    expect(resolved).toBe(latestUniverRows)
  })
})
