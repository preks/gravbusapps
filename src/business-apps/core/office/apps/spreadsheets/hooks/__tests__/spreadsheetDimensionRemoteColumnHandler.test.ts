import { handleSpreadsheetRemoteColumnUpdate } from '../spreadsheetDimensionRemoteColumnHandler'
import type { SpreadsheetSheet } from '../../types'

function sheetWithColumns(id: string, columns: import('../../types').SpreadsheetColumn[]): SpreadsheetSheet {
  return {
    id,
    name: id,
    viewType: 'table',
    columns,
    views: [],
    data: [],
    settings: {},
    version: 0
  } as SpreadsheetSheet
}

describe('handleSpreadsheetRemoteColumnUpdate', () => {
  it('ignores echo when current column width already matches', () => {
    const col = { id: 'c1', name: 'a', label: 'A', type: 'text', order: 0, width: 100 }
    const appSheetsRef = {
      current: [sheetWithColumns('s1', [col])]
    }
    const applyLocalAppUpdate = jest.fn()
    const baselineColWidthsRef = { current: new Map<number, number>() }
    const recentLocalColumnResizeRef = { current: new Map<string, { width: number; at: number }>() }
    const spreadsheetGridRef = { current: { applyRemoteDimensions: jest.fn() } }

    handleSpreadsheetRemoteColumnUpdate(
      {
        sheetId: 's1',
        columnId: 'c1',
        columnPatch: { width: 100 }
      },
      {
        activeSheetId: 's1',
        pendingColumnWidthOverrides: {},
        appSheetsRef,
        applyLocalAppUpdate,
        spreadsheetGridRef,
        recentLocalColumnResizeRef,
        baselineColWidthsRef
      }
    )

    expect(applyLocalAppUpdate).not.toHaveBeenCalled()
    expect(spreadsheetGridRef.current.applyRemoteDimensions).not.toHaveBeenCalled()
  })

  it('applies remote column width when it differs from local model', () => {
    const col = { id: 'c1', name: 'a', label: 'A', type: 'text', order: 0, width: 80 }
    const appSheetsRef = {
      current: [sheetWithColumns('s1', [col])]
    }
    const applyLocalAppUpdate = jest.fn(updater => {
      const next = updater({
        id: 'app',
        name: 'App',
        sheets: appSheetsRef.current,
        settings: {},
        views: []
      } as import('../../types').SpreadsheetApp)
      appSheetsRef.current = next.sheets
    })
    const baselineColWidthsRef = { current: new Map<number, number>() }
    const recentLocalColumnResizeRef = { current: new Map<string, { width: number; at: number }>() }
    const applyRemoteDimensions = jest.fn()
    const spreadsheetGridRef = { current: { applyRemoteDimensions } }

    handleSpreadsheetRemoteColumnUpdate(
      {
        sheetId: 's1',
        columnId: 'c1',
        columnPatch: { width: 120 }
      },
      {
        activeSheetId: 's1',
        pendingColumnWidthOverrides: {},
        appSheetsRef,
        applyLocalAppUpdate,
        onAppUpdate: jest.fn(),
        spreadsheetGridRef,
        recentLocalColumnResizeRef,
        baselineColWidthsRef
      }
    )

    expect(applyLocalAppUpdate).toHaveBeenCalled()
    expect(baselineColWidthsRef.current.get(0)).toBe(120)
    expect(applyRemoteDimensions).toHaveBeenCalled()
  })

  it('applies multiple remote column adds from one columns payload', () => {
    const appSheetsRef = {
      current: [
        sheetWithColumns('s1', [
          { id: 'a', name: 'a', label: 'A', type: 'text', order: 0 },
          { id: 'b', name: 'b', label: 'B', type: 'text', order: 1 }
        ])
      ]
    }
    const applyLocalAppUpdate = jest.fn(updater => {
      const next = updater({
        id: 'app',
        name: 'App',
        sheets: appSheetsRef.current,
        settings: {},
        views: []
      } as import('../../types').SpreadsheetApp)
      appSheetsRef.current = next.sheets
    })
    const onLocalAppUpdate = applyLocalAppUpdate

    handleSpreadsheetRemoteColumnUpdate(
      {
        sheetId: 's1',
        columns: [
          { id: 'a', name: 'a', label: 'A', type: 'text', order: 0 },
          { id: 'b', name: 'b', label: 'B', type: 'text', order: 1 },
          { id: 'c', name: 'c', label: 'C', type: 'text', order: 2 },
          { id: 'd', name: 'd', label: 'D', type: 'text', order: 3 }
        ]
      },
      {
        activeSheetId: 's1',
        pendingColumnWidthOverrides: {},
        appSheetsRef,
        applyLocalAppUpdate,
        onLocalAppUpdate,
        spreadsheetGridRef: { current: null },
        recentLocalColumnResizeRef: { current: new Map() },
        baselineColWidthsRef: { current: new Map() }
      }
    )

    expect(appSheetsRef.current[0]?.columns).toHaveLength(4)
    expect(appSheetsRef.current[0]?.columns.map(column => column.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
