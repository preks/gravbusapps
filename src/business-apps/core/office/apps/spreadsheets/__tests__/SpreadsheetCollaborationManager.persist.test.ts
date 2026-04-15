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

  it('persistCellsChangedToServer uses gateway ack version', async () => {
    const callbacks = makeCallbacks({
      getBackendRowIdForUiRowId: ui => (ui === 'ui-1' ? 'backend-1' : undefined)
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setDocumentOperationAsync(() => Promise.resolve({ success: true, version: 7 }))
    manager.setConnectionState(true, true)

    const result = await manager.persistCellsChangedToServer([{ rowId: 'ui-1', columnName: 'NameA', value: 'hello' }])

    expect(result.success).toBe(true)
    expect(result.version).toBe(7)
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(7)
  })

  it('persistCellsChangedToServer returns failure when no backend row id', async () => {
    const callbacks = makeCallbacks({
      getBackendRowIdForUiRowId: () => undefined
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setDocumentOperationAsync(() => Promise.resolve({ success: true, version: 1 }))

    const result = await manager.persistCellsChangedToServer([
      { rowId: 'client-only', columnName: 'NameA', value: 'x' }
    ])

    expect(result.success).toBe(false)
    expect(result.error).toBe('no_backend_rows')
  })

  it('bypasses socket persistence for oversized cell batches', async () => {
    const send = jest.fn().mockResolvedValue({ success: true, version: 1 })
    const callbacks = makeCallbacks({
      getBackendRowIdForUiRowId: ui => `backend-${ui}`
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setDocumentOperationAsync(send)
    manager.setConnectionState(true, true)

    const cells = Array.from({ length: 1600 }, (_, index) => ({
      rowId: `ui-${index}`,
      columnName: 'NameA',
      value: `value-${index}`
    }))

    const result = await manager.persistCellsChangedToServer(cells)

    expect(result.success).toBe(false)
    expect(result.error).toBe('payload_too_large')
    expect(send).not.toHaveBeenCalled()
  })

  it('chunks broadcast-only cell changes before emitting over socket', () => {
    const emit = jest.fn()
    const callbacks = makeCallbacks({
      getBackendRowIdForUiRowId: ui => `backend-${ui}`
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setEmitFunctions(emit, jest.fn())
    manager.setConnectionState(true, true)

    const cells = Array.from({ length: 850 }, (_, index) => ({
      rowId: `ui-${index}`,
      columnName: 'NameA',
      value: `value-${index}`
    }))

    manager.emitCellsChanged(cells)

    expect(emit).toHaveBeenCalledTimes(3)
    expect(emit.mock.calls[0]?.[0]).toMatchObject({
      type: 'cells_changed',
      broadcastOnly: true
    })
    const emittedCellCount = emit.mock.calls.reduce((sum, [operation]) => {
      const cellBatch = (operation.data as { cells?: unknown[] } | undefined)?.cells ?? []
      return sum + cellBatch.length
    }, 0)
    expect(emittedCellCount).toBe(850)
  })

  it('flushes deferred cells once create-row mapping is known', async () => {
    const send = jest.fn().mockResolvedValue({ success: true, version: 9 })
    const callbacks = makeCallbacks({
      getBackendRowIdForUiRowId: () => undefined
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setDocumentOperationAsync(send)
    manager.setConnectionState(true, true)

    const initial = await manager.persistCellsChangedToServer([
      { rowId: 'client-row-1', columnName: 'NameA', value: 'typed', univerRow: 0, univerCol: 0 }
    ])

    expect(initial.success).toBe(false)
    expect(initial.error).toBe('no_backend_rows')

    manager.tryFlushDeferredCellEmits(new Map([['client-row-1', 'backend-row-1']]))
    await Promise.resolve()

    expect(send).toHaveBeenCalledWith({
      type: 'cells_changed',
      data: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'backend-row-1',
            column: 'NameA',
            value: 'typed',
            cellRef: 'A1'
          }
        ]
      },
      broadcastOnly: false
    })
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(9)
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
})
