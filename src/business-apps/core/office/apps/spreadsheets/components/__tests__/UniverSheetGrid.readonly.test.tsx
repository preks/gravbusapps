import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
  UniverSheetGrid,
  extractFormatMenuLabel,
  getGermanNumfmtPattern,
  type UniverSheetGridHandle
} from '../UniverSheetGrid'

const eventHandlers: Record<string, (payload: any) => void> = {}

jest.mock(
  '@univerjs/core',
  () => ({
    CommandType: { MUTATION: 2 }
  }),
  { virtual: true }
)

jest.mock('@univerjs/preset-sheets-core/locales/en-US', () => ({}), { virtual: true })

let lastPresetContainer: unknown
let lastSetNumfmtLocalMock: jest.Mock | undefined
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
        getCellData: jest.fn(() => ({ v: undefined }))
      }
      const activeSheet = {
        getScrollState: () => ({ sheetViewStartRow: 0, sheetViewStartColumn: 0, offsetX: 0, offsetY: 0 }),
        onScroll: () => ({ dispose: jest.fn() }),
        getRange: () => range
      }
      const workbook = {
        setNumfmtLocal: jest.fn(),
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
      lastSetNumfmtLocalMock = workbook.setNumfmtLocal

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
    lastPresetContainer = undefined
    lastSetNumfmtLocalMock = undefined
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.useRealTimers()
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

  it('passes the mounted grid host element to Univer (not null from early effect)', () => {
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

    expect(lastPresetContainer).toBeInstanceOf(HTMLDivElement)
    expect(screen.getByTestId('univer-sheet-grid-container')).toBe(lastPresetContainer)
  })

  it('forces German number-format locale for currency/date/time defaults', () => {
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    expect(lastSetNumfmtLocalMock).toHaveBeenCalledWith('de_DE')
  })

  it('continues rendering when setting German number-format locale fails', () => {
    lastSetNumfmtLocalMock?.mockImplementationOnce(() => {
      throw new Error('numfmt unavailable')
    })

    expect(() =>
      render(
        <UniverSheetGrid
          sheet={sheet}
          data={data}
          columns={columns}
          isReadOnly={false}
          onCellChange={jest.fn()}
          onCellsChange={jest.fn()}
          onDataChange={jest.fn()}
        />
      )
    ).not.toThrow()
  })

  it('extracts number-format menu labels from preview rows', () => {
    expect(extractFormatMenuLabel('Date and time 1903-5-4 AM 12:00')).toBe('Date and time')
    expect(extractFormatMenuLabel('Currency $1,220.00')).toBe('Currency')
    expect(extractFormatMenuLabel('Unknown row')).toBeNull()
  })

  it('returns German override patterns for key format labels', () => {
    expect(getGermanNumfmtPattern('Currency')).toBe('#,##0.00 "EUR"')
    expect(getGermanNumfmtPattern('Date')).toBe('dd.mm.yyyy')
    expect(getGermanNumfmtPattern('Time')).toBe('hh:mm:ss')
    expect(getGermanNumfmtPattern('Nope')).toBeUndefined()
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

  it('suppresses remote echo updates without blocking subsequent local edits', () => {
    const onCellsChange = jest.fn()
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    act(() => {
      gridRef.current?.applyRemoteCellUpdate(0, 0, { v: 'Remote' })
    })

    const sheetValueChanged = eventHandlers.SheetValueChanged
    expect(sheetValueChanged).toBeDefined()

    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: { 0: { 0: { v: 'Remote' } } },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })
    expect(onCellsChange).not.toHaveBeenCalled()

    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: { 0: { 0: { v: 'Local' } } },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })
    expect(onCellsChange).toHaveBeenCalled()
  })

  it('injects Add comment into the vertical context menu list', () => {
    jest.useFakeTimers()
    const onOpenCommentRequest = jest.fn()
    const { getByTestId } = render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onOpenCommentRequest={onOpenCommentRequest}
      />
    )

    const setRect = (el: HTMLElement, left: number, top: number, width: number, height: number) => {
      Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          x: left,
          y: top,
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          toJSON: () => ({})
        })
      })
    }

    const gridContainer = getByTestId('univer-sheet-grid-container')
    setRect(gridContainer, 0, 0, 1200, 800)

    // Simulate Univer popup showing after native context menu opens.
    setTimeout(() => {
      const popup = document.createElement('div')
      popup.className = 'mock-univer-popup'

      const quickRow = document.createElement('div')
      const quickCopy = document.createElement('button')
      quickCopy.textContent = 'Copy'
      const quickCut = document.createElement('button')
      quickCut.textContent = 'Cut'
      const quickPaste = document.createElement('button')
      quickPaste.textContent = 'Paste'
      quickRow.append(quickCopy, quickCut, quickPaste)

      const mainList = document.createElement('ul')
      ;['Copy Special', 'Paste Special', 'Clear', 'Insert', 'Delete', 'Freeze'].forEach((label, index) => {
        const item = document.createElement('li')
        item.textContent = label
        setRect(item, 120, 180 + index * 34, 220, 30)
        mainList.appendChild(item)
      })

      popup.append(quickRow, mainList)
      document.body.appendChild(popup)

      setRect(popup, 100, 100, 280, 360)
      setRect(quickRow, 110, 120, 250, 70)
      setRect(quickCopy, 120, 130, 70, 28)
      setRect(quickCut, 200, 130, 70, 28)
      setRect(quickPaste, 280, 130, 70, 28)
      setRect(mainList, 110, 170, 250, 240)
    }, 20)

    fireEvent.contextMenu(gridContainer, { clientX: 130, clientY: 150 })

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    const injected = document.querySelector<HTMLElement>('[data-univer-custom-comment-item]')
    expect(injected).toBeTruthy()
    expect(injected?.textContent).toContain('Add comment')
    expect(injected?.parentElement?.tagName).toBe('UL')

    if (injected) fireEvent.click(injected)
    expect(onOpenCommentRequest).toHaveBeenCalledTimes(1)
  })
})
