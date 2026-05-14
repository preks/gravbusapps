import { buildSpreadsheetRowMaterializationPlan } from '../spreadsheetRowMaterializationPlan'

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
  it('queues client row when visual index collides with different persisted backend row', () => {
    const plan = buildSpreadsheetRowMaterializationPlan({
      sheetId: 'sheet-1',
      univerRows: [viewerClientRow(0, 'client-row-0')],
      persistedRows: [persistedBackendRow(0, 'backend-row-0')],
      isUuid: isBackendRowId,
      inFlightKeys: new Set<string>()
    })

    expect(plan.missingAndWillCreateCount).toBe(1)
    expect(plan.rowsToMaterialize).toEqual([{ _id: 'client-row-0', _gridRowIndex: 0 }])
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
})
