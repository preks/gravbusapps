import React from 'react'
import { render, screen } from '@testing-library/react'
import { UniverSheetGrid } from '../UniverSheetGrid'

const eventHandlers: Record<string, (payload: any) => void> = {}

jest.mock(
  '@univerjs/core',
  () => ({
    CommandType: { MUTATION: 2 }
  }),
  { virtual: true }
)

jest.mock('@univerjs/preset-sheets-core/locales/en-US', () => ({}), { virtual: true })

jest.mock(
  '@univerjs/preset-sheets-core',
  () => ({
    UniverSheetsCorePreset: jest.fn(() => ({}))
  }),
  { virtual: true }
)

jest.mock(
  '@univerjs/presets',
  () => ({
    LocaleType: { EN_US: 'en-US' },
    mergeLocales: jest.fn((...args: unknown[]) => args[0] || {}),
    createUniver: jest.fn(() => {
      const activeSheet = {
        getScrollState: () => ({ sheetViewStartRow: 0, sheetViewStartColumn: 0, offsetX: 0, offsetY: 0 }),
        onScroll: () => ({ dispose: jest.fn() })
      }
      const workbook = {
        getActiveSheet: () => activeSheet,
        save: () => ({
          sheetOrder: ['sheet-1'],
          sheets: {
            'sheet-1': {
              defaultColumnWidth: 73,
              defaultRowHeight: 23,
              rowHeader: { width: 48 },
              columnHeader: { height: 28 }
            }
          }
        })
      }

      return {
        univerAPI: {
          createWorkbook: jest.fn(),
          getActiveWorkbook: () => workbook,
          addEvent: (name: string, cb: (payload: any) => void) => {
            eventHandlers[name] = cb
            return { dispose: jest.fn() }
          },
          dispose: jest.fn()
        }
      }
    })
  }),
  { virtual: true }
)

describe('UniverSheetGrid read-only behavior', () => {
  const sheet = {
    id: 'sheet-1',
    name: 'Sheet 1'
  } as any

  const columns = [
    {
      id: 'col-1',
      name: 'name',
      label: 'Name',
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: 0
    }
  ] as any

  const data = [{ _id: 'row-1', name: 'Alice' }]

  beforeEach(() => {
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
  })

  it('shows an interaction-blocking overlay when read-only', () => {
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    expect(screen.getByTestId('univer-readonly-overlay')).toBeInTheDocument()
  })

  it('does not emit local cell changes while read-only', () => {
    const onCellsChange = jest.fn()

    const { rerender } = render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={true}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const sheetValueChanged = eventHandlers.SheetValueChanged
    expect(sheetValueChanged).toBeDefined()
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: { 0: { 0: { v: 'Blocked' } } },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })
    expect(onCellsChange).not.toHaveBeenCalled()

    rerender(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const sheetValueChangedEditable = eventHandlers.SheetValueChanged
    sheetValueChangedEditable?.({
      payload: {
        params: {
          cellValue: { 0: { 0: { v: 'Allowed' } } },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })
    expect(onCellsChange).toHaveBeenCalled()
  })
})
