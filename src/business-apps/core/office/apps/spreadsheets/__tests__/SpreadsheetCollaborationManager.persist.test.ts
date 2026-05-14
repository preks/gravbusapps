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

  it('replays set_style deltas through the same live apply path after reconnect', async () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', id: 'row-0', ColumnA: 'old' }]
    const applyRemoteCellUpdate = jest.fn()
    const onVersionUpdate = jest.fn()
    const fetchChangesSince = jest.fn().mockResolvedValue({
      sheetId: 'sheet-1',
      currentVersion: 2,
      requiresSnapshot: false,
      changes: [
        {
          operationType: 'set_style',
          appliedVersion: 2,
          payload: {
            sheetId: 'sheet-1',
            styles: { 'style-1': { bg: { rgb: '#ff0000' } } },
            cells: [{ row: 0, col: 0, stylePatch: { set: { s: 'style-1' } } }]
          },
          result: {}
        }
      ]
    })

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      onVersionUpdate,
      fetchChangesSince
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(1)

    manager.setConnectionState(true, true)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchChangesSince).toHaveBeenCalledWith('sheet-1', 1)
    expect(onVersionUpdate).toHaveBeenCalledWith(2)
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: { set: { s: 'style-1' } },
        univerStyles: { 'style-1': { bg: { rgb: '#ff0000' } } }
      })
    )
  })

  it('replays mixed value and style deltas through the manager catch-up path', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const onVersionUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      onVersionUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_cell',
          appliedVersion: 3,
          payload: { sheetId: 'sheet-1', rowId: 'backend-row-1', columnName: 'ColumnA', value: 'new' }
        },
        {
          operationType: 'set_style',
          appliedVersion: 3,
          payload: {
            sheetId: 'sheet-1',
            styles: { 'style-1': { bg: { rgb: '#00ff00' } } },
            cells: [{ row: 0, col: 0, stylePatch: { set: { s: 'style-1' } } }]
          }
        }
      ],
      3,
      'sheet-1'
    )

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'new', _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new', 'backend-row-1')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticOperationType: 'set_style',
        useSenderA1Row: true,
        stylePatch: { set: { s: 'style-1' } },
        univerStyles: { 'style-1': { bg: { rgb: '#00ff00' } } }
      })
    )
    expect(onVersionUpdate).toHaveBeenCalledWith(3)
  })

  it('replays inactive-sheet set_style deltas to the target worksheet and sheet version', () => {
    const applyRemoteCellUpdate = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      applyRemoteCellUpdate,
      onSheetVersionUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_style',
          appliedVersion: 8,
          payload: {
            sheetId: 'sheet-2',
            styles: { 'style-2': { bg: { rgb: '#0000ff' } } },
            cells: [{ row: 1, col: 2, cellRef: 'C2', stylePatch: { set: { s: 'style-2' } } }]
          }
        }
      ],
      8,
      'sheet-2'
    )

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      2,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticOperationType: 'set_style',
        targetSheetId: 'sheet-2',
        useSenderA1Row: true,
        stylePatch: { set: { s: 'style-2' } },
        univerStyles: { 'style-2': { bg: { rgb: '#0000ff' } } }
      })
    )
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 8)
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

  it('applies broadcast-only dimension sync for the active sheet without requiring a version', () => {
    const applyRemoteDimensions = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteDimensions,
      scheduleRemoteStructuralResync
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    const payload = {
      sheetId: 'sheet-1',
      defaultColWidth: 88,
      defaultRowHeight: 24,
      columnData: { 2: { w: 180 } },
      rowData: {}
    }

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'dimension_sync',
        broadcastOnly: true,
        data: payload
      },
      timestamp: Date.now()
    })

    expect(applyRemoteDimensions).toHaveBeenCalledWith(payload)
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
  })

  it('requests catch-up instead of applying an incoming operation when a version gap is detected', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(1)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'ColumnA', value: 'new' }]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'version_gap', {
      sinceVersion: 1,
      incomingVersion: 3
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('routes sheet_created broadcasts to workbook structure refresh callback', () => {
    const onWorkbookStructureChange = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()

    const callbacks = makeCallbacks({
      onWorkbookStructureChange,
      scheduleRemoteStructuralResync
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_created',
        data: {
          sheetId: 'sheet-2',
          sheet: { id: 'sheet-2', name: 'Sheet 2' }
        }
      },
      timestamp: Date.now()
    })

    expect(onWorkbookStructureChange).toHaveBeenCalledWith({
      type: 'sheet_created',
      sheetId: 'sheet-2',
      sheet: { id: 'sheet-2', name: 'Sheet 2' }
    })
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
  })

  it('routes sheet_created broadcasts even when the new sheet version matches the default known version', () => {
    const onWorkbookStructureChange = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: sheetId => (sheetId === 'sheet-2' ? 0 : 0),
      onWorkbookStructureChange
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_created',
        data: {
          sheetId: 'sheet-2',
          sheet: { id: 'sheet-2', name: 'Sheet 2' }
        }
      },
      version: 0,
      timestamp: Date.now()
    })

    expect(onWorkbookStructureChange).toHaveBeenCalledWith({
      type: 'sheet_created',
      sheetId: 'sheet-2',
      sheet: { id: 'sheet-2', name: 'Sheet 2' }
    })
  })

  it('routes sheet rename and delete broadcasts to workbook structure refresh callback', () => {
    const onWorkbookStructureChange = jest.fn()
    const callbacks = makeCallbacks({ onWorkbookStructureChange })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_renamed',
        data: {
          sheetId: 'sheet-2',
          sheet: { id: 'sheet-2', name: 'Renamed' }
        }
      },
      timestamp: Date.now()
    })
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_deleted',
        data: { sheetId: 'sheet-2' }
      },
      timestamp: Date.now()
    })

    expect(onWorkbookStructureChange).toHaveBeenNthCalledWith(1, {
      type: 'sheet_renamed',
      sheetId: 'sheet-2',
      sheet: { id: 'sheet-2', name: 'Renamed' }
    })
    expect(onWorkbookStructureChange).toHaveBeenNthCalledWith(2, {
      type: 'sheet_deleted',
      sheetId: 'sheet-2',
      sheet: undefined
    })
  })

  it('uses the active sheet version instead of a global max when receiving same-sheet edits', () => {
    const data: Record<string, unknown>[] = [{ _id: 'row-b-1', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-b',
      getSheetVersion: sheetId => (sheetId === 'sheet-b' ? 0 : 52),
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(52)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-b',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-b',
                cells: [{ rowId: 'row-b-1', columnName: 'ColumnA', value: 'new' }]
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 1,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-b-1', ColumnA: 'new', _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new', 'row-b-1')
  })

  it('applies inactive-sheet batch values to the target worksheet and marks materialization', () => {
    const dataBySheet: Record<string, Record<string, unknown>[]> = {
      'sheet-1': [{ _id: 'active-row', ColumnA: 'active' }],
      'sheet-2': [{ _id: 'row-b-1', ColumnA: 'old' }]
    }
    const commitSheetData = jest.fn((sheetId: string, rows: Record<string, unknown>[]) => {
      dataBySheet[sheetId] = rows
    })
    const applyRemoteCellUpdate = jest.fn()
    const markSheetNeedsGridMaterialization = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      getSheetVersion: sheetId => (sheetId === 'sheet-2' ? 0 : 10),
      getColumnsForSheet: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getSheetData: sheetId => dataBySheet[sheetId] ?? [],
      getLocalSheetData: () => dataBySheet['sheet-1'],
      commitSheetData,
      applyRemoteCellUpdate,
      markSheetNeedsGridMaterialization
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(10)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_cell',
              data: {
                sheetId: 'sheet-2',
                rowId: 'row-b-1',
                columnName: 'ColumnA',
                value: 'new inactive value'
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 1,
      timestamp: Date.now()
    })

    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [expect.objectContaining({ _id: 'row-b-1', ColumnA: 'new inactive value' })],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      'new inactive value',
      'row-b-1',
      expect.objectContaining({ targetSheetId: 'sheet-2' })
    )
    expect(markSheetNeedsGridMaterialization).toHaveBeenCalledWith('sheet-2', expect.any(String))
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
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      'row-0',
      expect.objectContaining({
        useSenderA1Row: true,
        univerCell: { s: 'style-1' },
        univerStyles: {
          'style-1': { bd: { t: { s: 1, cl: { rgb: '#111111' } } } }
        }
      })
    )
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

  it('live-applies off-sheet style-only cells_changed to the target worksheet', () => {
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

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      'row-0',
      expect.objectContaining({
        targetSheetId: 'sheet-2',
        useSenderA1Row: true,
        univerCell: { s: 'style-2' },
        univerStyles: { 'style-2': { bl: 1 } }
      })
    )

    activeSheetId = 'sheet-2'
    manager.flushDeferredCellsChangedForSheet('sheet-2')

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(1)
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

  it('applies same-version batch_operations when version state was already advanced', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      getSheetVersion: () => 5,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      onDiagnosticsTraceEvent
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
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: 'first-edit' }]
              }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'first-edit', 'backend-row-1')
    expect(onDiagnosticsTraceEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_receive_skipped',
        payload: expect.objectContaining({ reason: 'stale_version' })
      })
    )
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

  it('requests inactive-sheet catch-up instead of materializing persisted set_range rows that cannot be matched locally', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const commitSheetData = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      getColumnsForSheet: () => columns,
      getSheetData: sheetId => (sheetId === 'sheet-2' ? [{ _id: 'client_sheet-2_0', ColumnA: 'stale' }] : []),
      commitSheetData,
      scheduleRemoteStructuralResync,
      requestSheetCatchUp,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-2',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: 'fresh' }]
              }
            }
          ]
        }
      },
      version: 6,
      timestamp: Date.now()
    })

    expect(commitSheetData).not.toHaveBeenCalled()
    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-2', 'row_identity_mismatch', {
      sinceVersion: 0,
      incomingVersion: 6
    })
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_value_apply_incomplete',
        severity: 'warning'
      })
    )
  })

  it('requests immediate active-sheet resync when a persisted value update has unknown row identity', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'client_sheet-1_0', ColumnA: '1' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      scheduleRemoteStructuralResync
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
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: '2' }]
              }
            }
          ]
        }
      },
      version: 6,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-1', { immediate: true })
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

  it('does not drop same-user authoritative batches when the server omits the top-level version', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-e', name: 'ColumnE', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-28', _rowUuid: 'backend-row-28', ColumnE: 'before' }]
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
              type: 'set_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-28', columnName: 'ColumnE', value: 'after' }
            }
          ]
        }
      },
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'after', 'backend-row-28')
  })

  it('applies inactive-sheet authoritative batches into sheet cache state and version update', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const commitSheetData = jest.fn()
    const inactiveColumns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const inactiveRows: Record<string, unknown>[] = [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 'before' }]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      getColumnsForSheet: sheetId => (sheetId === 'sheet-2' ? inactiveColumns : []),
      getSheetData: sheetId => (sheetId === 'sheet-2' ? inactiveRows : []),
      commitSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-2', rowId: 'backend-row-1', columnName: 'ColumnA', value: 'remote' }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 'remote', _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 11)
    expect(callbacks.commitLocalSheetData).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).not.toHaveBeenCalled()
  })

  it('forces immediate targeted resync for active-sheet structural column batches', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      getActiveSheetId: () => 'sheet-2'
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'column_add',
              data: {
                sheetId: 'sheet-2',
                column: { id: 'col-new', name: 'ColumnD', order: 3 }
              }
            }
          ]
        }
      },
      version: 12,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-2', { immediate: true })
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(12)
    expect(onSheetVersionUpdate).not.toHaveBeenCalled()
    expect(callbacks.commitLocalSheetData).not.toHaveBeenCalled()
  })

  it('defers inactive-sheet structural column batches without touching the active data model', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const commitLocalSheetData = jest.fn()
    const commitSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      commitLocalSheetData,
      commitSheetData,
      getActiveSheetId: () => 'sheet-1'
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'column_add',
              data: {
                sheetId: 'sheet-2',
                column: { id: 'col-new', name: 'ColumnD', order: 3 }
              }
            }
          ]
        }
      },
      version: 12,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-2', { immediate: false })
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 12)
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(commitSheetData).not.toHaveBeenCalled()
  })

  it('applies inactive-sheet structural row batches into cache instead of forcing a workbook reload', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const commitSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      getSheetData: sheetId => (sheetId === 'sheet-2' ? [] : []),
      commitSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'add_rows',
              data: {
                sheetId: 'sheet-2',
                rows: [{ id: 'row-new', data: { ColumnA: 'plain value' } }]
              }
            }
          ]
        }
      },
      version: 13,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-new', _rowUuid: 'row-new', ColumnA: 'plain value' }],
      { persisted: true, syncGrid: false }
    )
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 13)
    expect(callbacks.commitLocalSheetData).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).not.toHaveBeenCalled()
  })

  it('applies active-sheet row_add placeholders so later cell updates can target the new row', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const commitLocalSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'existing' }],
      commitLocalSheetData
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
              type: 'row_add',
              data: {
                sheetId: 'sheet-1',
                rowIds: ['row-new']
              }
            }
          ]
        }
      },
      version: 14,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', ColumnA: 'existing' },
        { _id: 'row-new', _rowUuid: 'row-new' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(14)
  })

  it('paints active-sheet add_rows values into the grid immediately', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [{ _id: 'row-1', ColumnA: 'existing' }]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      forceGridReapply
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
              type: 'add_rows',
              data: {
                sheetId: 'sheet-1',
                rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', ColumnA: 'plain value' } }]
              }
            }
          ]
        }
      },
      version: 15,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', ColumnA: 'existing' },
        { _clientRowId: 'client-row-new', ColumnA: 'plain value', _id: 'backend-row-new', _rowUuid: 'backend-row-new' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(1, 0, 'plain value', 'backend-row-new')
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 1, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(15)
  })

  it('applies active-sheet insert_rows_at at the requested index', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      forceGridReapply
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
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [
                  {
                    id: 'backend-row-new',
                    data: { _clientRowId: 'client-row-new', _gridRowIndex: 1, ColumnA: 'plain value' }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 17,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        {
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'plain value',
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new'
        },
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(1, 0, 'plain value', 'backend-row-new')
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(17)
  })

  it('keeps immediate cell edits attached to the inserted peer row', () => {
    const commitLocalSheetData = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate: jest.fn(),
      forceGridReapply: jest.fn()
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
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', _gridRowIndex: 1 } }]
              }
            }
          ]
        }
      },
      version: 18,
      timestamp: Date.now()
    })

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'set_cell',
        data: {
          sheetId: 'sheet-1',
          rowId: 'backend-row-new',
          columnName: 'ColumnA',
          value: 'edited immediately'
        }
      },
      version: 19,
      timestamp: Date.now()
    })

    expect(rows).toEqual([
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      expect.objectContaining({
        _id: 'backend-row-new',
        _rowUuid: 'backend-row-new',
        _clientRowId: 'client-row-new',
        _gridRowIndex: 1,
        ColumnA: 'edited immediately'
      }),
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
    ])
    expect(commitLocalSheetData).toHaveBeenNthCalledWith(
      2,
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        expect.objectContaining({
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new',
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'edited immediately'
        }),
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: false }
    )
  })

  it('canonicalizes a permuted receiver baseline before applying insert_rows_at', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      forceGridReapply
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
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [
                  {
                    id: 'backend-row-new',
                    data: { _clientRowId: 'client-row-new', _gridRowIndex: 1, ColumnA: 'plain value' }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 17,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        {
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'plain value',
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new'
        },
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(1, 0, 'plain value', 'backend-row-new')
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
  })

  it('keeps follow-up edits on the inserted row even when the receiver baseline started permuted', () => {
    const commitLocalSheetData = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate: jest.fn(),
      forceGridReapply: jest.fn()
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
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', _gridRowIndex: 1 } }]
              }
            }
          ]
        }
      },
      version: 18,
      timestamp: Date.now()
    })

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'set_cell',
        data: {
          sheetId: 'sheet-1',
          rowId: 'backend-row-new',
          columnName: 'ColumnA',
          value: 'edited immediately'
        }
      },
      version: 19,
      timestamp: Date.now()
    })

    expect(rows).toEqual([
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      expect.objectContaining({
        _id: 'backend-row-new',
        _rowUuid: 'backend-row-new',
        _clientRowId: 'client-row-new',
        _gridRowIndex: 1,
        ColumnA: 'edited immediately'
      }),
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
    ])
    expect(commitLocalSheetData).toHaveBeenNthCalledWith(
      2,
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        expect.objectContaining({
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new',
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'edited immediately'
        }),
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: false }
    )
  })

  it('routes large active-sheet add_rows through bulk grid apply and bounded forceGridReapply', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [{ _id: 'row-1', ColumnA: 'existing' }]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk,
      forceGridReapply
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          batchId: 'large-add-rows',
          traceSessionId: 'trace-session',
          traceId: 'trace-id',
          operations: [
            {
              type: 'add_rows',
              data: {
                sheetId: 'sheet-1',
                rows: Array.from({ length: 501 }, (_, index) => ({
                  id: `backend-row-${index}`,
                  data: { _clientRowId: `client-row-${index}`, ColumnA: `value ${index}` }
                }))
              }
            }
          ]
        }
      },
      version: 16,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ ColumnA: 'value 0' })]),
      {
        persisted: true,
        syncGrid: true
      }
    )
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ rowIndex: 1, colIndex: 0 })]),
      expect.objectContaining({ operationType: 'add_rows_replay' })
    )
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 501, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
  })

  it('hydrates legacy row_add broadcasts from the delta log when only row ids are broadcast', async () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const commitLocalSheetData = jest.fn()
    const fetchChangesSince = jest.fn().mockResolvedValue({
      currentVersion: 14,
      requiresSnapshot: false,
      changes: [
        {
          operationType: 'add_rows',
          payload: { rows: [{ _clientRowId: 'client-row-new', ColumnA: 'plain value' }] },
          result: {
            rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', ColumnA: 'plain value' } }]
          },
          appliedVersion: 14
        }
      ]
    })
    let rows: Record<string, unknown>[] = [{ _id: 'row-1', ColumnA: 'existing' }]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      fetchChangesSince
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
              type: 'row_add',
              data: {
                sheetId: 'sheet-1',
                rowIds: ['backend-row-new']
              }
            }
          ]
        }
      },
      version: 14,
      timestamp: Date.now()
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchChangesSince).toHaveBeenCalledWith('sheet-1', 13)
    expect(commitLocalSheetData).toHaveBeenLastCalledWith(
      [
        { _id: 'row-1', ColumnA: 'existing' },
        { _clientRowId: 'client-row-new', ColumnA: 'plain value', _id: 'backend-row-new', _rowUuid: 'backend-row-new' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(14)
  })

  it('hydrates positioned insert_rows_at deltas at the correct visual index', async () => {
    const commitLocalSheetData = jest.fn()
    const forceGridReapply = jest.fn()
    const fetchChangesSince = jest.fn().mockResolvedValue({
      currentVersion: 14,
      requiresSnapshot: false,
      changes: [
        {
          operationType: 'insert_rows_at',
          payload: {
            insertAt: 1,
            rows: [{ _clientRowId: 'client-row-new', ColumnA: 'plain value' }]
          },
          result: {
            insertAt: 1,
            rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', ColumnA: 'plain value' } }]
          },
          appliedVersion: 14
        }
      ]
    })
    let rows: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      fetchChangesSince,
      forceGridReapply
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
              type: 'row_add',
              data: {
                sheetId: 'sheet-1',
                rowIds: ['backend-row-new']
              }
            }
          ]
        }
      },
      version: 14,
      timestamp: Date.now()
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchChangesSince).toHaveBeenCalledWith('sheet-1', 13)
    expect(commitLocalSheetData).toHaveBeenLastCalledWith(
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        {
          _clientRowId: 'client-row-new',
          ColumnA: 'plain value',
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new',
          _gridRowIndex: 1
        },
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(forceGridReapply).toHaveBeenLastCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
  })

  it('requests targeted catch-up for stale data-bearing batch_operations when a newer sheet version is already known', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 12,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(12)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-1', columnName: 'ColumnA', value: 'stale' }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 10,
      incomingVersion: 11
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).not.toHaveBeenCalled()
  })

  it('requests targeted catch-up for stale style-only batch_operations when a newer sheet version is already known', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 12,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(12)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: { s1: { ff: 'Arial' } },
                cells: [{ row: 0, col: 0, stylePatch: { set: { s: 's1' } } }]
              }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 10,
      incomingVersion: 11
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'client_collab_stale_data_op_catchup_requested' })
    )
  })

  it('requests targeted catch-up for direct stale set_style operations when a newer sheet version is already known', () => {
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 9,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(9)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'set_style',
        data: {
          sheetId: 'sheet-1',
          cells: [{ row: 0, col: 0, stylePatch: { set: { s: 's1' } } }]
        }
      },
      version: 8,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 7,
      incomingVersion: 8
    })
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('requests targeted catch-up for stale cells_changed when known sheet version is ahead', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      getSheetVersion: () => 5,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'ColumnA', value: 'peer' }]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 2,
      incomingVersion: 3
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
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
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, null, 'backend-row-1')
  })

  it('applies very large persisted batch replays cell-by-cell without forcing a whole-grid sync', () => {
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

    expect(commitLocalSheetData).toHaveBeenCalledWith(expect.any(Array), { persisted: true, syncGrid: false })
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(600)
    expect(applyRemoteCellUpdate).toHaveBeenNthCalledWith(1, 0, 0, null, 'backend-row-0')
    expect(applyRemoteCellUpdate).toHaveBeenNthCalledWith(600, 599, 0, null, 'backend-row-599')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(8)
  })

  it('forwards stylePatch payloads in set_style batch operations', () => {
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
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
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: {
                  style_1: { ff: 'Arial' }
                },
                cells: [
                  {
                    row: 0,
                    col: 0,
                    cellRef: 'A1',
                    stylePatch: { set: { s: 'style_1', tb: 1, tr: { a: 45 } } }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 9,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        useSenderA1Row: true,
        stylePatch: { set: { s: 'style_1', tb: 1, tr: { a: 45 } } },
        univerStyles: { style_1: { ff: 'Arial' } }
      })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(9)
  })

  it('forwards stylePatch unset semantics from set_style batch to applyRemoteCellUpdate options', () => {
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
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
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: {
                  style_bold: { bl: 1 }
                },
                cells: [
                  {
                    row: 5,
                    col: 4,
                    cellRef: 'E6',
                    stylePatch: {
                      unset: ['s', 'bg', 'cl', 'bd', 'tb', 'tr', 'pd', 'it', 'ul', 'st', 'ff', 'fs', 'n'],
                      set: { s: 'style_bold', bl: 1 }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 91,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      5,
      4,
      undefined,
      undefined,
      expect.objectContaining({
        useSenderA1Row: true,
        stylePatch: {
          unset: ['s', 'bg', 'cl', 'bd', 'tb', 'tr', 'pd', 'it', 'ul', 'st', 'ff', 'fs', 'n'],
          set: { s: 'style_bold', bl: 1 }
        },
        univerStyles: { style_bold: { bl: 1 } }
      })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(91)
  })

  it('applies set_style batch operations when the nested payload omits sheetId', () => {
    const applyRemoteCellUpdate = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteCellUpdate,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          batchId: 'batch-style-1',
          operations: [
            {
              type: 'set_style',
              data: {
                styles: {
                  style_1: { ff: 'Arial' }
                },
                cells: [
                  {
                    row: 1,
                    col: 9,
                    cellRef: 'J2',
                    stylePatch: { set: { s: 'style_1' } }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 10,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      9,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticBatchId: 'batch-style-1',
        diagnosticOperationType: 'set_style',
        useSenderA1Row: true,
        stylePatch: { set: { s: 'style_1' } },
        univerStyles: { style_1: { ff: 'Arial' } }
      })
    )
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_set_style_applied',
        batchId: 'batch-style-1',
        operationType: 'set_style'
      })
    )
  })

  it('applies inactive-sheet set_style batches to the target worksheet immediately', () => {
    const activeSheetId = 'sheet-1'
    const applyRemoteCellUpdate = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getActiveSheetId: () => activeSheetId,
      applyRemoteCellUpdate,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          batchId: 'batch-style-inactive',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-2',
                styles: {
                  style_2: { bg: { rgb: '#ff0000' } }
                },
                cells: [
                  {
                    row: 2,
                    col: 3,
                    cellRef: 'D3',
                    stylePatch: { set: { s: 'style_2' } }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      2,
      3,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticBatchId: 'batch-style-inactive',
        diagnosticOperationType: 'set_style',
        targetSheetId: 'sheet-2',
        useSenderA1Row: true,
        stylePatch: { set: { s: 'style_2' } },
        univerStyles: { style_2: { bg: { rgb: '#ff0000' } } }
      })
    )
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_set_style_applied',
        batchId: 'batch-style-inactive',
        operationType: 'set_style'
      })
    )
  })

  it('ignores malformed set_style patches and applies only valid cells', () => {
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
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
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                cells: [
                  { row: 0, col: 0, cellRef: 'A1', stylePatch: null },
                  { row: 1, col: 1, cellRef: 'B2', stylePatch: { set: {} } },
                  { row: 2, col: 2, cellRef: 'C3', stylePatch: { unset: [] } },
                  { row: 3, col: 3, cellRef: 'D4', stylePatch: { set: { s: 'ok-style' } } }
                ]
              }
            }
          ]
        }
      },
      version: 12,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      3,
      3,
      undefined,
      undefined,
      expect.objectContaining({
        useSenderA1Row: true,
        stylePatch: { set: { s: 'ok-style' } }
      })
    )
  })
})
