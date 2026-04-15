import {
  SpreadsheetCollaborationManager,
  type CollaborationCallbacks
} from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetColumn } from '../types/spreadsheet'

function col(partial: Partial<SpreadsheetColumn> & Pick<SpreadsheetColumn, 'id' | 'name'>): SpreadsheetColumn {
  return {
    type: 'text',
    label: partial.name,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0,
    isVisible: true,
    ...partial
  }
}

describe('SpreadsheetCollaborationManager persist and receive', () => {
  const makeCallbacks = (over: Partial<CollaborationCallbacks>): CollaborationCallbacks => ({
    getActiveSheetId: () => 'sheet-1',
    getColumns: () => [],
    getLocalSheetData: () => [],
    getBackendRowIdForUiRowId: () => undefined,
    commitLocalSheetData: jest.fn(),
    applyRemoteCellUpdate: jest.fn(),
    onVersionUpdate: jest.fn(),
    scheduleSheetVersionRefreshFromApi: jest.fn(),
    scheduleRemoteStructuralResync: jest.fn(),
    ...over
  })

  it('handleOperation cells_changed uses visible column index when leading column is hidden', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'hidden', name: 'Hidden', isVisible: false, order: 0 }),
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 1 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 2 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'a', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'col-b', value: 99 }]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 1, 99, 'row-0')
  })

  it('handleOperation cells_changed matches row when wire rowId is backend UUID on id, not on _id', () => {
    const backendUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'client-temp-row', id: backendUuid, ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: backendUuid, column: 'ColumnA', value: 'new' }]
        }
      },
      version: 2,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new', backendUuid)
  })

  it('handleOperation cells_changed uses cellRef (A1) for grid apply when present', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData: jest.fn(),
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [
            {
              rowId: 'row-0',
              column: 'ColumnA',
              value: 'typed',
              cellRef: 'B43'
            }
          ]
        }
      },
      version: 1,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(42, 1, 'typed', 'row-0', { useSenderA1Row: true })
  })

  it('handleOperation batch_operations applies persisted set_range changes', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [
                  { rowId: 'backend-row-1', columnName: 'ColumnA', value: 'new-a' },
                  { rowId: 'backend-row-1', columnName: 'ColumnB', value: 42 }
                ]
              }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new-a', 'backend-row-1')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 1, 42, 'backend-row-1')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(5)
  })

  it('handleOperation row_update applies row payload without cells_changed echo', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'row_update',
        data: {
          sheetId: 'sheet-1',
          rowId: 'backend-row-1',
          rowData: {
            ColumnA: 'updated',
            ColumnB: 7
          }
        }
      },
      version: 6,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'updated', 'backend-row-1')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 1, 7, 'backend-row-1')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(6)
  })

  it('applies authoritative batch updates from another tab of the same user', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-e', name: 'ColumnE', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-28', _rowUuid: 'backend-row-28', ColumnE: 'keep' },
      { _id: 'row-29', _rowUuid: 'backend-row-29', ColumnE: 'remove-1' },
      { _id: 'row-30', _rowUuid: 'backend-row-30', ColumnE: 'remove-2' }
    ]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setCurrentUserId('same-user')

    manager.handleOperation({
      userId: 'same-user',
      userName: 'Same User Other Tab',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'clear_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-29', columnName: 'ColumnE' }
            },
            {
              type: 'clear_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-30', columnName: 'ColumnE' }
            }
          ]
        }
      },
      version: 7,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(1, 0, null, 'backend-row-29')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(2, 0, null, 'backend-row-30')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(7)
  })
})
