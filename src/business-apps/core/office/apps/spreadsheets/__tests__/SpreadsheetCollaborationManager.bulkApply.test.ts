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

describe('SpreadsheetCollaborationManager bulk apply', () => {
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

  it('routes large set_range replay through applyRemoteCellUpdatesBulk', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = Array.from({ length: 30 }, (_, i) => ({
      _id: `row-${i}`,
      ColumnA: i
    }))
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    const cells = data.map((row, i) => ({
      rowId: String(row._id),
      columnName: 'ColumnA',
      value: i + 1000
    }))

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_range',
          appliedVersion: 5,
          payload: { sheetId: 'sheet-1', cells }
        }
      ],
      5,
      'sheet-1'
    )

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk.mock.calls[0][0]).toHaveLength(30)
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('routes visibility_update batch operations through feature replay', () => {
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteSpreadsheetFeatureOperation
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
              type: 'visibility_update',
              data: {
                sheetId: 'sheet-1',
                axis: 'row',
                hidden: true,
                ranges: [{ start: 2, end: 4 }]
              }
            }
          ]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'visibility_update',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          axis: 'row',
          hidden: true,
          ranges: [{ start: 2, end: 4 }]
        })
      }),
      expect.objectContaining({ operationType: 'visibility_update' })
    )
  })

  it('routes freeze_panes batch operations through feature replay with normalized data', () => {
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteSpreadsheetFeatureOperation
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
              type: 'freeze_panes',
              data: {
                sheetId: 'sheet-1',
                commandId: 'sheet.command.set-row-frozen',
                startRow: 2,
                startColumn: -1,
                ySplit: 2,
                xSplit: 0
              }
            }
          ]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'freeze_panes',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          startRow: 2,
          startColumn: -1,
          ySplit: 2,
          xSplit: 0
        })
      }),
      expect.objectContaining({ operationType: 'freeze_panes' })
    )
  })

  it('routes multi-cell cells_changed through applyRemoteCellUpdatesBulk', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-0', ColumnA: 'a' },
      { _id: 'row-1', ColumnA: 'b' }
    ]
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const commitLocalSheetData = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk,
      commitLocalSheetData
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
            { rowId: 'row-0', column: 'ColumnA', value: 'x' },
            { rowId: 'row-1', column: 'ColumnA', value: 'y' }
          ]
        }
      },
      version: 4,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk.mock.calls[0][0]).toHaveLength(2)
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(commitLocalSheetData).toHaveBeenCalled()
  })

  it('keeps per-cell applyRemoteCellUpdate for single-cell cells_changed', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 0 }]
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const commitLocalSheetData = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk,
      commitLocalSheetData
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'ColumnA', value: 10 }]
        }
      },
      version: 2,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(1)
    expect(commitLocalSheetData).toHaveBeenCalled()
  })

  it('keeps per-cell applyRemoteCellUpdate for a single-cell set_range replay', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 0 }]
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_range',
          appliedVersion: 2,
          payload: {
            sheetId: 'sheet-1',
            cells: [{ rowId: 'row-0', columnName: 'ColumnA', value: 10 }]
          }
        }
      ],
      2,
      'sheet-1'
    )

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(1)
  })

  it('routes two-cell set_range replay through applyRemoteCellUpdatesBulk', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-0', ColumnA: 0 },
      { _id: 'row-1', ColumnA: 1 }
    ]
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_range',
          appliedVersion: 2,
          payload: {
            sheetId: 'sheet-1',
            cells: [
              { rowId: 'row-0', columnName: 'ColumnA', value: 10 },
              { rowId: 'row-1', columnName: 'ColumnA', value: 20 }
            ]
          }
        }
      ],
      2,
      'sheet-1'
    )

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk.mock.calls[0][0]).toHaveLength(2)
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('defers set_style bulk until set_range bulk completes (paste ordering)', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = Array.from({ length: 30 }, (_, i) => ({
      _id: `row-${i}`,
      ColumnA: i
    }))
    let completeValues: (() => void) | undefined
    const applyRemoteCellUpdatesBulk = jest.fn((_items, meta) => {
      if (meta?.operationType === 'set_style') {
        return
      }
      completeValues = meta?.onApplyComplete
    })
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    const cells = data.map((row, i) => ({
      rowId: String(row._id),
      columnName: 'ColumnA',
      value: `v${i}`
    }))

    const styleCells = data.map((_, i) => ({
      row: i,
      col: 0,
      stylePatch: { set: { s: 'style-1', bl: 1 } }
    }))

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            { type: 'set_range', data: { sheetId: 'sheet-1', cells } },
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: { 'style-1': { bl: 1 } },
                cells: styleCells
              }
            }
          ]
        }
      },
      version: 9,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ operationType: 'set_range' })
    )
    expect(applyRemoteCellUpdatesBulk.mock.calls.some(c => c[1]?.operationType === 'set_style')).toBe(false)

    expect(typeof completeValues).toBe('function')
    completeValues?.()

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(2)
    expect(applyRemoteCellUpdatesBulk.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ operationType: 'set_style' })
    )
  })

  it('defers multiple set_style chunks until set_range bulk completes', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = Array.from({ length: 30 }, (_, i) => ({
      _id: `row-${i}`,
      ColumnA: i
    }))
    let completeValues: (() => void) | undefined
    const applyRemoteCellUpdatesBulk = jest.fn((_items, meta) => {
      if (meta?.operationType !== 'set_style') {
        completeValues = meta?.onApplyComplete
      }
    })

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate: jest.fn(),
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    const cells = data.map((row, i) => ({
      rowId: String(row._id),
      columnName: 'ColumnA',
      value: `v${i}`
    }))
    const styleChunk = (styleId: string) =>
      data.map((_, i) => ({
        row: i,
        col: 0,
        stylePatch: { set: { s: styleId } }
      }))

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            { type: 'set_range', data: { sheetId: 'sheet-1', cells } },
            { type: 'set_style', data: { sheetId: 'sheet-1', cells: styleChunk('style-a') } },
            { type: 'set_style', data: { sheetId: 'sheet-1', cells: styleChunk('style-b') } }
          ]
        }
      },
      version: 10,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ operationType: 'set_range' })
    )

    completeValues?.()

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(3)
    expect(applyRemoteCellUpdatesBulk.mock.calls[1]?.[0]?.[0]?.options?.stylePatch).toEqual({
      set: { s: 'style-a' }
    })
    expect(applyRemoteCellUpdatesBulk.mock.calls[2]?.[0]?.[0]?.options?.stylePatch).toEqual({
      set: { s: 'style-b' }
    })
  })

  it('targets non-active sheet style chunks instead of applying them to the active sheet', () => {
    const applyRemoteCellUpdate = jest.fn()
    const markSheetNeedsGridMaterialization = jest.fn()
    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      applyRemoteCellUpdate,
      markSheetNeedsGridMaterialization
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
              type: 'set_style',
              data: {
                sheetId: 'sheet-2',
                cells: [{ row: 4, col: 2, stylePatch: { set: { bg: { rgb: '#00ff00' } } } }]
              }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(markSheetNeedsGridMaterialization).toHaveBeenCalledWith('sheet-2', 'set_style')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      4,
      2,
      undefined,
      undefined,
      expect.objectContaining({
        targetSheetId: 'sheet-2',
        useSenderA1Row: true,
        stylePatch: { set: { bg: { rgb: '#00ff00' } } }
      })
    )
  })

  it('routes clear_all replay through applyRemoteClearAllRange when callback exists', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', order: 1 })
    ]
    const data: Record<string, unknown>[] = [
      { _id: 'row-0', ColumnA: 'kept', ColumnB: 'kept' },
      { _id: 'row-1', ColumnA: 'kept', ColumnB: 'kept' }
    ]
    const applyRemoteCellUpdate = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteClearAllRange = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk,
      applyRemoteClearAllRange
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'clear_all',
          appliedVersion: 7,
          payload: {
            sheetId: 'sheet-1',
            ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 }]
          }
        }
      ],
      7,
      'sheet-1'
    )

    expect(applyRemoteClearAllRange).toHaveBeenCalledTimes(1)
    expect(applyRemoteClearAllRange).toHaveBeenCalledWith(
      {
        sheetId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 }]
      },
      expect.objectContaining({
        operationType: 'clear_all'
      })
    )
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('falls back to per-cell clear_all replay when callback is unavailable', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const data: Record<string, unknown>[] = Array.from({ length: 30 }, (_, i) => ({
      _id: `row-${i}`,
      ColumnA: i
    }))
    const applyRemoteCellUpdate = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'clear_all',
          appliedVersion: 9,
          payload: {
            sheetId: 'sheet-1',
            ranges: [{ startRow: 0, endRow: 29, startColumn: 0, endColumn: 0 }]
          }
        }
      ],
      9,
      'sheet-1'
    )

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(30)
    for (const call of applyRemoteCellUpdate.mock.calls) {
      const [, , value, , options] = call
      expect(value).toBeNull()
      expect(options).toEqual(
        expect.objectContaining({
          removeCellEntry: true,
          univerCell: null,
          univerStyles: null,
          diagnosticOperationType: 'clear_all'
        })
      )
    }
  })

  it('skips clear_all replay when the payload carries no usable ranges', () => {
    const applyRemoteCellUpdate = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()

    const callbacks = makeCallbacks({
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'clear_all',
          appliedVersion: 4,
          payload: {
            sheetId: 'sheet-1',
            ranges: []
          }
        }
      ],
      4,
      'sheet-1'
    )

    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('routes feature operation replay through the spreadsheet feature apply callback', () => {
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteSpreadsheetFeatureOperation
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'merge_ranges',
          appliedVersion: 9,
          payload: {
            sheetId: 'sheet-1',
            ranges: [{ startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 }]
          }
        }
      ],
      9,
      'sheet-1'
    )

    expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
      {
        type: 'merge_ranges',
        data: {
          sheetId: 'sheet-1',
          ranges: [{ startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 }]
        }
      },
      expect.objectContaining({ operationType: 'merge_ranges' })
    )
  })
})
