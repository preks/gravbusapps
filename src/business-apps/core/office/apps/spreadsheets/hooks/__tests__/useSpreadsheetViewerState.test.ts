import { act, renderHook } from '@testing-library/react'
import type { SpreadsheetApp } from '../../types'
import { sortSpreadsheetRowsBySheetSettings, useSpreadsheetViewerState } from '../useSpreadsheetViewerState'

describe('sortSpreadsheetRowsBySheetSettings', () => {
  it('falls back to backend row ids when persisted rows share a duplicate client row id', () => {
    const rows = [
      {
        _id: 'client_duplicate',
        _rowUuid: '83c21db0-99b0-45c4-bc54-a2571d860c41',
        _clientRowId: 'client_duplicate',
        column_c: 'old'
      },
      {
        _id: 'client_duplicate',
        _rowUuid: '209ed253-0768-4582-a1f3-3b5e151971d4',
        _clientRowId: 'client_duplicate',
        column_c: 'new'
      }
    ]

    expect(sortSpreadsheetRowsBySheetSettings(rows)).toEqual([
      {
        _id: '83c21db0-99b0-45c4-bc54-a2571d860c41',
        _rowUuid: '83c21db0-99b0-45c4-bc54-a2571d860c41',
        _clientRowId: 'client_duplicate',
        column_c: 'old'
      },
      {
        _id: '209ed253-0768-4582-a1f3-3b5e151971d4',
        _rowUuid: '209ed253-0768-4582-a1f3-3b5e151971d4',
        _clientRowId: 'client_duplicate',
        column_c: 'new'
      }
    ])
  })
})

describe('useSpreadsheetViewerState', () => {
  it('does not replace live active sheet rows when an unrelated sheet is added', () => {
    const baseApp: SpreadsheetApp = {
      id: 'app-1',
      name: 'Workbook',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          columns: [{ id: 'col-a', name: 'a', label: 'A', type: 'text', order: 0, isVisible: true }],
          data: [{ _id: 'row-1', a: 'stale-from-app-model' }],
          views: [],
          viewType: 'table'
        }
      ]
    } as SpreadsheetApp

    const { result, rerender } = renderHook(({ app }) => useSpreadsheetViewerState({ app }), {
      initialProps: { app: baseApp }
    })

    const liveRows = [{ _id: 'row-1', a: 'live-univer-row' }]
    act(() => {
      result.current.setLocalSheetData(liveRows)
    })

    const appWithAddedSheet: SpreadsheetApp = {
      ...baseApp,
      sheets: [
        baseApp.sheets[0],
        {
          id: 'sheet-2',
          name: 'Sheet2',
          columns: [{ id: 'col-a', name: 'a', label: 'A', type: 'text', order: 0, isVisible: true }],
          data: [],
          views: [],
          viewType: 'table'
        }
      ]
    } as SpreadsheetApp

    rerender({ app: appWithAddedSheet })

    expect(result.current.localSheetData).toEqual(liveRows)
  })

  it('keeps the intended active sheet id during transient sheet replacement', () => {
    const baseApp: SpreadsheetApp = {
      id: 'app-1',
      name: 'Workbook',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          columns: [{ id: 'col-a', name: 'a', label: 'A', type: 'text', order: 0, isVisible: true }],
          data: [{ _id: 'row-1', a: 'alpha' }],
          views: [],
          viewType: 'table'
        },
        {
          id: 'sheet-2-temp',
          name: 'Sheet2',
          columns: [{ id: 'col-a', name: 'a', label: 'A', type: 'text', order: 0, isVisible: true }],
          data: [],
          views: [],
          viewType: 'table'
        }
      ]
    } as SpreadsheetApp

    const { result, rerender } = renderHook(({ app }) => useSpreadsheetViewerState({ app }), {
      initialProps: { app: baseApp }
    })

    act(() => {
      result.current.setActiveSheetId('sheet-2-temp')
    })

    expect(result.current.activeSheetId).toBe('sheet-2-temp')
    expect(result.current.activeSheet.id).toBe('sheet-2-temp')

    const reconciledApp: SpreadsheetApp = {
      ...baseApp,
      sheets: [
        baseApp.sheets[0],
        {
          ...baseApp.sheets[1],
          id: 'sheet-2-persisted'
        }
      ]
    }

    rerender({ app: reconciledApp })

    expect(result.current.activeSheetId).toBe('sheet-2-temp')
    expect(result.current.activeSheet.id).toBe('sheet-2-temp')
    expect(result.current.activeSheet.columns).toEqual(baseApp.sheets[1].columns)
  })
})
