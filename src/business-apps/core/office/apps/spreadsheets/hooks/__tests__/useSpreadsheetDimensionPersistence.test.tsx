import { act, renderHook } from '@testing-library/react'

import type { SpreadsheetMutationFacade } from '../../core'
import type { CellDimensionsPayload } from '../../components/UniverSheetGrid.types'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetSheet } from '../../types'
import { useSpreadsheetDimensionPersistence } from '../useSpreadsheetDimensionPersistence'

function minimalSheet(id: string, columns: SpreadsheetColumn[]): SpreadsheetSheet {
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

describe('useSpreadsheetDimensionPersistence', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not emit dimension_sync when canEditWithLockRef is false', () => {
    const emitDimensionSyncRef = { current: jest.fn<(payload: CellDimensionsPayload) => void>() }
    const canEditWithLockRef = { current: false }
    const mutationFacadeRef = { current: null as SpreadsheetMutationFacade | null }
    const enqueueSnapshotCheckpointRef = { current: null as null | (() => Promise<void>) }
    const appSheetsRef = { current: [minimalSheet('s1', [])] }
    const spreadsheetGridRef = { current: null }

    const { result } = renderHook(() =>
      useSpreadsheetDimensionPersistence({
        bootstrapSnapshot: null,
        activeSheetId: 's1',
        activeSheetColumns: [],
        canEditWithLockRef,
        emitDimensionSyncRef,
        applyLocalAppUpdate: jest.fn(),
        mutationFacadeRef,
        enqueueSnapshotCheckpointRef,
        appSheetsRef,
        spreadsheetGridRef
      })
    )

    const payload: CellDimensionsPayload = {
      sheetId: 's1',
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: {},
      rowData: { 0: { h: 40 } },
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    }

    act(() => {
      result.current.handleDimensionsChanged(payload)
    })

    expect(emitDimensionSyncRef.current).not.toHaveBeenCalled()
  })

  it('debounces submitBatch until the trailing edge', async () => {
    const emitDimensionSyncRef = { current: jest.fn<(payload: CellDimensionsPayload) => void>() }
    const canEditWithLockRef = { current: true }
    const submitBatch = jest.fn(() => Promise.resolve())
    const mutationFacadeRef = {
      current: { submitBatch } as unknown as SpreadsheetMutationFacade
    }
    const enqueueSnapshotCheckpointRef = { current: jest.fn(() => Promise.resolve()) }
    const columns: SpreadsheetColumn[] = [{ id: 'c1', name: 'a', label: 'A', type: 'text', order: 0, width: 80 }]
    const appSheetsRef = {
      current: [minimalSheet('s1', columns)]
    }
    const spreadsheetGridRef = { current: null }
    const applyLocalAppUpdate = jest.fn((updater: (a: SpreadsheetApp) => SpreadsheetApp) => {
      const next = updater({
        id: 'app',
        name: 'App',
        sheets: appSheetsRef.current,
        settings: {},
        views: []
      } as SpreadsheetApp)
      appSheetsRef.current = next.sheets
    })

    const { result } = renderHook(() =>
      useSpreadsheetDimensionPersistence({
        bootstrapSnapshot: null,
        activeSheetId: 's1',
        activeSheetColumns: columns,
        canEditWithLockRef,
        emitDimensionSyncRef,
        applyLocalAppUpdate,
        mutationFacadeRef,
        enqueueSnapshotCheckpointRef,
        appSheetsRef,
        spreadsheetGridRef
      })
    )

    const payload: CellDimensionsPayload = {
      sheetId: 's1',
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: { 0: { w: 120 } },
      rowData: {},
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    }

    act(() => {
      result.current.handleDimensionsChanged(payload)
    })

    expect(submitBatch).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(submitBatch).toHaveBeenCalledTimes(1)
    expect(submitBatch.mock.calls[0][0].batchIdPrefix).toBe('dimensions_change')
    expect(enqueueSnapshotCheckpointRef.current).toHaveBeenCalled()
  })
})
