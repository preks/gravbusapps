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

  it('applies style-only cells_changed from another tab of the same user', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
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
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [
            {
              rowId: 'row-0',
              column: 'ColumnA',
              cellRef: 'A1',
              univerCell: { s: 'style-1' },
              univerStyles: {
                'style-1': { bd: { t: { s: 1, cl: { rgb: '#111111' } } } }
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 2,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, undefined, 'row-0', {
      useSenderA1Row: true,
      univerCell: { s: 'style-1' },
      univerStyles: {
        'style-1': { bd: { t: { s: 1, cl: { rgb: '#111111' } } } }
      }
    })
  })

  it('ignores its own broadcast-only style echo when the client op id matches', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const emitOperation = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setEmitFunctions(emitOperation, jest.fn())
    manager.setConnectionState(true, true)

    manager.emitOperation({
      type: 'cells_changed',
      data: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'row-0',
            column: 'ColumnA',
            cellRef: 'A1',
            univerCell: { s: 'style-self' },
            univerStyles: { 'style-self': { bl: 1 } }
          }
        ]
      },
      broadcastOnly: true
    } as never)

    const sentOperation = emitOperation.mock.calls[0]?.[0]
    expect(sentOperation?._clientOpId).toEqual(expect.any(String))

    manager.handleOperation({
      userId: 'u1',
      userName: 'Sender',
      operation: sentOperation,
      version: 4,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('defers off-sheet style-only cells_changed until that sheet becomes active', () => {
    let activeSheetId = 'sheet-1'
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => activeSheetId,
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
          sheetId: 'sheet-2',
          cells: [
            {
              rowId: 'row-0',
              column: 'ColumnA',
              cellRef: 'A1',
              univerCell: { s: 'style-2' },
              univerStyles: {
                'style-2': { bl: 1 }
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 9,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()

    activeSheetId = 'sheet-2'
    manager.flushDeferredCellsChangedForSheet('sheet-2')

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, undefined, 'row-0', {
      useSenderA1Row: true,
      univerCell: { s: 'style-2' },
      univerStyles: {
        'style-2': { bl: 1 }
      }
    })
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

  it('treats set_range cells without a value as clear operations', () => {
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
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA' }]
              }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, null, 'backend-row-1')
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

  it('removes stale column-id aliases when a remote clear is applied', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-e', name: 'ColumnE', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'backend-row-1', ColumnE: 'visible-value', 'col-e': 'stale-alias-value' }
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
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnE', value: null }]
              }
            }
          ]
        }
      },
      version: 7,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnE: null, _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, null, 'backend-row-1')
  })

  it('syncs the grid from authoritative rows for very large persisted batch replays', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = Array.from({ length: 600 }, (_, index) => ({
      _id: `row-${index}`,
      _rowUuid: `backend-row-${index}`,
      ColumnA: `value-${index}`
    }))
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
          operations: Array.from({ length: 600 }, (_, index) => ({
            type: 'clear_cell',
            data: {
              sheetId: 'sheet-1',
              rowId: `backend-row-${index}`,
              columnName: 'ColumnA'
            }
          }))
        }
      },
      version: 8,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(expect.any(Array), { persisted: true, syncGrid: true })
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(8)
  })
})
