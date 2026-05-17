/**
 * Shared Jest mocks and mutable test doubles for `UniverSheetGrid` suites.
 * Import this module first so `jest.mock` registrations hoist before the SUT.
 */
import React from 'react'
import type { UniverSheetGridHandle, UniverSheetGridProps } from '../UniverSheetGrid.types'
import { UniverSheetGrid as UniverSheetGridBase } from '../UniverSheetGrid'

export const eventHandlers: Record<string, (payload: unknown) => void> = {}

jest.mock(
  '@univerjs/core',
  () => ({
    CommandType: { MUTATION: 2 }
  }),
  { virtual: true }
)

jest.mock('@univerjs/preset-sheets-core/locales/en-US', () => ({}), { virtual: true })

export let lastPresetContainer: unknown
export let lastSetNumfmtLocalMock: jest.Mock | undefined
export let lastRangeGetValueMock: jest.Mock | undefined
export let lastRangeGetCellDataMock: jest.Mock | undefined
export let lastRangeSetValueMock: jest.Mock | undefined
export let inactiveSheetSetValueMock: jest.Mock | undefined
export let lastSetFreezeMock: jest.Mock | undefined
export let lastCancelFreezeMock: jest.Mock | undefined
export let univerMockActiveSheetId: 'sheet-1' | 'sheet-2' = 'sheet-1'

/** Mutable test overrides; assign via this object (not namespace imports) from test files. */
export const gridTestMockState = {
  worksheetValueByCoord: null as Map<string, unknown> | null,
  worksheetCellDataByCoord: null as Map<string, unknown> | null,
  worksheetCellRectByCoord: null as Map<
    string,
    { left: number; top: number; width: number; height: number } | null
  > | null,
  workbookSnapshotOverride: null as Record<string, unknown> | null,
  selectionState: null as {
    actualRow?: number
    actualColumn?: number
    row?: number
    column?: number
  } | null
}

export let executeCommandMock: jest.Mock | undefined
export let createWorkbookMock: jest.Mock | undefined
export let createWorkbookSnapshots: Record<string, unknown>[] = []

export const TestUniverSheetGrid = React.forwardRef<
  UniverSheetGridHandle,
  Omit<UniverSheetGridProps, 'workbookInstanceKey'> & { workbookInstanceKey?: string }
>((props, ref) => (
  <UniverSheetGridBase
    {...props}
    ref={ref}
    workbookInstanceKey={props.workbookInstanceKey ?? `test-workbook:${props.sheet.id}`}
  />
))
TestUniverSheetGrid.displayName = 'TestUniverSheetGrid'

jest.mock(
  '@univerjs/preset-sheets-core',
  () => ({
    UniverSheetsCorePreset: jest.fn((opts: { container?: unknown }) => {
      lastPresetContainer = opts?.container
      return {}
    })
  }),
  { virtual: true }
)

jest.mock(
  '@univerjs/presets',
  () => ({
    LocaleType: { EN_US: 'en-US' },
    mergeLocales: jest.fn((...args: unknown[]) => args[0] || {}),
    createUniver: jest.fn(() => {
      const range = {
        setValue: jest.fn(),
        getValue: jest.fn(),
        getCellData: jest.fn(() => ({ v: undefined })),
        getCellRect: jest.fn((row = 0, col = 0) => {
          const key = `${row}:${col}`
          if (gridTestMockState.worksheetCellRectByCoord?.has(key)) {
            return gridTestMockState.worksheetCellRectByCoord.get(key) ?? null
          }
          return {
            left: 48 + col * 73,
            top: 28 + row * 23,
            width: 73,
            height: 23
          }
        })
      }
      lastRangeGetValueMock = range.getValue
      lastRangeGetCellDataMock = range.getCellData
      lastRangeSetValueMock = range.setValue as jest.Mock
      lastSetFreezeMock = jest.fn()
      lastCancelFreezeMock = jest.fn()
      const activeSheet = {
        getSheetId: () => 'sheet-1',
        getScrollState: () => ({ sheetViewStartRow: 0, sheetViewStartColumn: 0, offsetX: 0, offsetY: 0 }),
        onScroll: () => ({ dispose: jest.fn() }),
        setFreeze: lastSetFreezeMock,
        cancelFreeze: lastCancelFreezeMock,
        getRange: (row?: number, col?: number) => {
          const key = `${row ?? ''}:${col ?? ''}`
          return {
            setValue: range.setValue,
            getValue: () =>
              gridTestMockState.worksheetValueByCoord?.has(key)
                ? gridTestMockState.worksheetValueByCoord.get(key)
                : range.getValue(),
            getCellData: () =>
              gridTestMockState.worksheetCellDataByCoord?.has(key)
                ? gridTestMockState.worksheetCellDataByCoord.get(key)
                : range.getCellData(),
            getCellRect: () => range.getCellRect(row, col)
          }
        },
        getSelection: () => ({
          getCurrentCell: () => gridTestMockState.selectionState
        })
      }
      const inactiveSheet = {
        getSheetId: () => 'sheet-2',
        setFreeze: lastSetFreezeMock,
        cancelFreeze: lastCancelFreezeMock,
        getRange: jest.fn(() => {
          inactiveSheetSetValueMock = jest.fn()
          return {
            setValue: inactiveSheetSetValueMock,
            getValue: jest.fn(),
            getCellData: jest.fn(() => ({ v: undefined }))
          }
        })
      }
      const workbook = {
        getUnitId: () => 'unit-test',
        getId: () => 'unit-test',
        setNumfmtLocal: jest.fn(),
        getActiveSheet: () => (univerMockActiveSheetId === 'sheet-2' ? inactiveSheet : activeSheet),
        setActiveSheet: jest.fn((id: string) => {
          if (id === 'sheet-2') univerMockActiveSheetId = 'sheet-2'
          if (id === 'sheet-1') univerMockActiveSheetId = 'sheet-1'
        }),
        getSheets: () => [activeSheet, inactiveSheet],
        getSheetBySheetId: (sheetId: string) => (sheetId === 'sheet-2' ? inactiveSheet : undefined),
        save: () =>
          gridTestMockState.workbookSnapshotOverride ?? {
            sheetOrder: ['sheet-1'],
            sheets: {
              'sheet-1': {
                defaultColumnWidth: 73,
                defaultRowHeight: 23,
                rowHeader: { width: 48 },
                columnHeader: { height: 28 }
              }
            }
          }
      }
      lastSetNumfmtLocalMock = workbook.setNumfmtLocal
      executeCommandMock = jest.fn()
      createWorkbookSnapshots = []
      createWorkbookMock = jest.fn((snapshot?: Record<string, unknown>) => {
        if (snapshot && typeof snapshot === 'object') {
          createWorkbookSnapshots.push(snapshot)
        }
        if (lastPresetContainer instanceof HTMLElement && !lastPresetContainer.querySelector('canvas')) {
          const canvas = document.createElement('canvas')
          canvas.width = 1000
          canvas.height = 800
          lastPresetContainer.appendChild(canvas)
        }
      })

      return {
        univerAPI: {
          syncExecuteCommand: executeCommandMock,
          createWorkbook: createWorkbookMock,
          getActiveWorkbook: () => workbook,
          addEvent: (name: string, cb: (payload: unknown) => void) => {
            eventHandlers[name] = cb
            return { dispose: jest.fn() }
          },
          executeCommand: executeCommandMock,
          dispose: jest.fn()
        }
      }
    })
  }),
  { virtual: true }
)

export function resetUniverSheetGridTestMocks(): void {
  Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
  lastPresetContainer = undefined
  lastSetNumfmtLocalMock = undefined
  lastRangeGetValueMock = undefined
  lastRangeGetCellDataMock = undefined
  lastRangeSetValueMock = undefined
  inactiveSheetSetValueMock = undefined
  lastSetFreezeMock = undefined
  lastCancelFreezeMock = undefined
  univerMockActiveSheetId = 'sheet-1'
  gridTestMockState.worksheetValueByCoord = null
  gridTestMockState.worksheetCellDataByCoord = null
  gridTestMockState.worksheetCellRectByCoord = null
  gridTestMockState.workbookSnapshotOverride = null
  gridTestMockState.selectionState = null
  executeCommandMock = undefined
  createWorkbookMock = undefined
  createWorkbookSnapshots = []
}
