import './setupUniverSheetGridTestMocks'
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UniverSheetGridHandle } from '../UniverSheetGrid.types'
import { extractFormatMenuLabel, getGermanNumfmtPattern } from '../univerSheetGridShared'
import * as univerGridOverlayCellRect from '../univerGridOverlayCellRect'
import {
  eventHandlers,
  executeCommandMock,
  gridTestMockState,
  inactiveSheetSetValueMock,
  lastPresetContainer,
  lastRangeGetCellDataMock,
  lastRangeGetValueMock,
  lastSetNumfmtLocalMock,
  resetUniverSheetGridTestMocks,
  TestUniverSheetGrid as UniverSheetGrid
} from './setupUniverSheetGridTestMocks'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('UniverSheetGrid read-only behavior', () => {
  const sheet = {
    id: 'sheet-1',
    name: 'Sheet 1',
    settings: { mergeData: [] }
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
    resetUniverSheetGridTestMocks()
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

  it('renders remote cursor overlays from legacy spreadsheet cursor paths', () => {
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
        participants={[
          {
            userId: 'user-2',
            userName: 'Alice',
            userColor: '#ff0000',
            socketId: 'socket-2',
            cursor: { path: ['sheet-1', 'row-1', 'name'] },
            lastActiveAt: new Date()
          }
        ]}
      />
    )

    expect(screen.getByTitle('Alice')).toBeInTheDocument()
  })

  it('renders remote cursor overlays from modern spreadsheet cursor paths in multi-sheet mode', () => {
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        multiSheetWorkbookMode={true}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
        participants={[
          {
            userId: 'user-2',
            userName: 'Alice',
            userColor: '#ff0000',
            socketId: 'socket-2',
            cursor: { path: ['sheetId:sheet-1', 'cellRef:A1', 'row:0', 'col:0'] },
            lastActiveAt: new Date()
          }
        ]}
      />
    )

    expect(screen.getByTitle('Alice')).toBeInTheDocument()
  })

  it('renders aliased remote cursor sheet ids after canonicalization', () => {
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        multiSheetWorkbookMode={true}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
        getCanonicalSheetId={sheetId => (sheetId === 'temp-sheet-1' ? 'sheet-1' : sheetId)}
        participants={[
          {
            userId: 'user-2',
            userName: 'Alice',
            userColor: '#ff0000',
            socketId: 'socket-2',
            cursor: { path: ['sheetId:temp-sheet-1', 'cellRef:A1', 'row:0', 'col:0'] },
            lastActiveAt: new Date()
          }
        ]}
      />
    )

    expect(screen.getByTitle('Alice')).toBeInTheDocument()
  })

  it('retries remote cursor rect resolution after bootstrap', () => {
    jest.useFakeTimers()
    // Remote cursor layout uses `resolveCollaborationOverlayCellRect` (canvas + snapshot dims), not Univer `getCellRect`.
    let resolvePass = 0
    const resolveSpy = jest
      .spyOn(univerGridOverlayCellRect, 'resolveCollaborationOverlayCellRect')
      .mockImplementation(() => {
        resolvePass += 1
        if (resolvePass === 1) return null
        return { left: 48, top: 28, width: 73, height: 23 }
      })

    try {
      render(
        <UniverSheetGrid
          sheet={sheet}
          data={data}
          columns={columns}
          multiSheetWorkbookMode={true}
          isReadOnly={false}
          onCellChange={jest.fn()}
          onDataChange={jest.fn()}
          participants={[
            {
              userId: 'user-2',
              userName: 'Alice',
              userColor: '#ff0000',
              socketId: 'socket-2',
              cursor: { path: ['sheetId:sheet-1', 'cellRef:A1', 'row:0', 'col:0'] },
              lastActiveAt: new Date()
            }
          ]}
        />
      )

      expect(screen.queryByTitle('Alice')).not.toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(350)
      })

      expect(screen.getByTitle('Alice')).toBeInTheDocument()
    } finally {
      resolveSpy.mockRestore()
    }
  })

  it('does not render comment badges above the measured grid viewport', () => {
    const viewportSpy = jest.spyOn(univerGridOverlayCellRect, 'resolveGridCanvasViewport').mockReturnValue({
      top: 80,
      left: 40,
      width: 600,
      height: 400
    })
    const rectSpy = jest.spyOn(univerGridOverlayCellRect, 'resolveCollaborationOverlayCellRect').mockReturnValue({
      top: 12,
      left: 88,
      width: 73,
      height: 23
    })

    try {
      render(
        <UniverSheetGrid
          sheet={sheet}
          data={data}
          columns={columns}
          isReadOnly={false}
          onCellChange={jest.fn()}
          onDataChange={jest.fn()}
          commentedCells={[
            {
              cellReference: 'A1',
              content: 'Hello',
              createdByName: 'Alice'
            }
          ]}
        />
      )

      expect(screen.queryByTestId('univer-cell-comment-badge')).not.toBeInTheDocument()
    } finally {
      viewportSpy.mockRestore()
      rectSpy.mockRestore()
    }
  })

  it('renders a comment badge for multi-cell range comments', () => {
    const viewportSpy = jest.spyOn(univerGridOverlayCellRect, 'resolveGridCanvasViewport').mockReturnValue({
      top: 0,
      left: 0,
      width: 600,
      height: 400
    })
    const rectSpy = jest.spyOn(univerGridOverlayCellRect, 'resolveCollaborationOverlayCellRect').mockReturnValue({
      top: 120,
      left: 180,
      width: 73,
      height: 23
    })

    try {
      render(
        <UniverSheetGrid
          sheet={sheet}
          data={data}
          columns={columns}
          isReadOnly={false}
          onCellChange={jest.fn()}
          onDataChange={jest.fn()}
          commentedCells={[
            {
              cellReference: 'B5:C9',
              content: 'Range note',
              createdByName: 'Alice'
            }
          ]}
        />
      )

      expect(screen.getByTestId('univer-cell-comment-badge')).toBeInTheDocument()
    } finally {
      viewportSpy.mockRestore()
      rectSpy.mockRestore()
    }
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
    jest.useFakeTimers()

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

    act(() => {
      jest.advanceTimersByTime(100)
    })

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
    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'name',
        value: 'Allowed',
        univerRow: 0,
        univerCol: 0
      })
    ])
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

  it('applies remote updates to a target worksheet while another sheet is active', async () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()
    const sheetB = { ...sheet, id: 'sheet-2', name: 'Sheet B' }

    const { rerender } = render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    act(() => {
      gridRef.current?.applyRemoteCellUpdate(0, 0, 'Sheet B value', 'row-1', { targetSheetId: 'sheet-2' })
    })

    rerender(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheetB}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(inactiveSheetSetValueMock).toHaveBeenCalledWith('Sheet B value')
    })
  })

  it('inserts a missing remote worksheet through the live workbook handle', () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const ensured = gridRef.current?.ensureWorksheetExists(
      {
        ...sheet,
        id: 'sheet-3',
        name: 'Remote Sheet',
        columns,
        data: [],
        viewType: 'table',
        views: [],
        settings: {
          allowAdd: true,
          allowEdit: true,
          allowDelete: true,
          allowExport: true,
          allowImport: true,
          rowsPerPage: 25,
          showRowNumbers: true
        }
      },
      [],
      columns,
      { index: 1 }
    )

    expect(ensured).toBe(true)
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.insert-sheet',
      expect.objectContaining({
        index: 1,
        sheet: expect.objectContaining({
          id: 'sheet-3',
          name: 'Remote Sheet'
        })
      })
    )
  })

  it('renames an existing remote worksheet through the live workbook handle', () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const renamed = gridRef.current?.renameWorksheet('sheet-2', 'Renamed Sheet')

    expect(renamed).toBe(true)
    expect(executeCommandMock).toHaveBeenCalledWith('sheet.command.set-worksheet-name', {
      subUnitId: 'sheet-2',
      name: 'Renamed Sheet'
    })
  })

  it('removes an existing remote worksheet through the live workbook handle', () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const removed = gridRef.current?.removeWorksheet('sheet-2')

    expect(removed).toBe(true)
    expect(executeCommandMock).toHaveBeenCalledWith('sheet.command.remove-sheet', {
      subUnitId: 'sheet-2'
    })
  })

  it('sets remote worksheet tab visibility through the live workbook handle', () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const hidden = gridRef.current?.setWorksheetVisibility('sheet-2', true)
    const shown = gridRef.current?.setWorksheetVisibility('sheet-2', false)

    expect(hidden).toBe(true)
    expect(shown).toBe(true)
    expect(executeCommandMock).toHaveBeenCalledWith('sheet.command.set-worksheet-hidden', {
      unitId: 'unit-test',
      subUnitId: 'sheet-2'
    })
    expect(executeCommandMock).toHaveBeenCalledWith('sheet.command.set-worksheet-show', {
      unitId: 'unit-test',
      subUnitId: 'sheet-2'
    })
  })

  it('emits worksheet tab visibility changes from Univer mutations', () => {
    jest.useFakeTimers()
    const onUniverSheetVisibilityChanged = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onUniverSheetVisibilityChanged={onUniverSheetVisibilityChanged}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600)
    })

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.set-worksheet-hidden',
      params: { subUnitId: 'sheet-2', hidden: 1 }
    })

    expect(onUniverSheetVisibilityChanged).toHaveBeenCalledWith({
      sheetId: 'sheet-2',
      hidden: true
    })
  })

  it('replaces an early materialized remote worksheet with the copied worksheet snapshot', () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const worksheetSnapshot = {
      id: 'sheet-2',
      name: 'Copied Sheet',
      cellData: { 5: { 2: { v: 5, s: 'style-red' } } },
      mergeData: [{ startRow: 5, endRow: 8, startColumn: 2, endColumn: 4 }]
    }

    const ensured = gridRef.current?.ensureWorksheetExists(
      {
        ...sheet,
        id: 'sheet-2',
        name: 'Copied Sheet',
        columns,
        data: [],
        viewType: 'table',
        views: [],
        settings: {
          allowAdd: true,
          allowEdit: true,
          allowDelete: true,
          allowExport: true,
          allowImport: true,
          rowsPerPage: 25,
          showRowNumbers: true
        }
      },
      [],
      columns,
      { replaceExisting: true, worksheetSnapshot }
    )

    expect(ensured).toBe(true)
    expect(executeCommandMock).toHaveBeenCalledWith('sheet.command.remove-sheet', {
      subUnitId: 'sheet-2'
    })
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.insert-sheet',
      expect.objectContaining({
        index: 1,
        sheet: expect.objectContaining({
          id: 'sheet-2',
          name: 'Copied Sheet',
          cellData: { 5: { 2: { s: 'style-red' } } },
          mergeData: worksheetSnapshot.mergeData
        })
      })
    )
  })

  it('keeps authoritative row values when materializing a style-only copied worksheet snapshot', () => {
    const gridRef = React.createRef<UniverSheetGridHandle>()

    render(
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const worksheetSnapshot = {
      id: 'sheet-2',
      name: 'Copied Sheet',
      cellData: { 0: { 0: { s: 'style-red' } } }
    }

    const ensured = gridRef.current?.ensureWorksheetExists(
      {
        ...sheet,
        id: 'sheet-2',
        name: 'Copied Sheet',
        columns,
        data: [{ name: 'Copied value' }],
        viewType: 'table',
        views: [],
        settings: {
          allowAdd: true,
          allowEdit: true,
          allowDelete: true,
          allowExport: true,
          allowImport: true,
          rowsPerPage: 25,
          showRowNumbers: true
        }
      },
      [{ name: 'Copied value' }],
      columns,
      { replaceExisting: true, worksheetSnapshot }
    )

    expect(ensured).toBe(true)
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.insert-sheet',
      expect.objectContaining({
        sheet: expect.objectContaining({
          id: 'sheet-2',
          cellData: { 0: { 0: { s: 'style-red', v: 'Copied value' } } }
        })
      })
    )
  })

  it('rewrites copied worksheet insert mutations to a UUID while preserving copied sheet payload', () => {
    jest.useFakeTimers()
    const onUniverSheetInserted = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        apiFirstSheetStructure={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onUniverSheetInserted={onUniverSheetInserted}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600)
    })

    const beforeCommandExecute = eventHandlers.BeforeCommandExecute
    const copiedSheet = {
      id: 'univer-copy-1',
      name: 'Original Copy',
      cellData: { 0: { 0: { v: 'Copied value' } } }
    }
    const insertParams = {
      unitId: 'workbook-1',
      index: 1,
      sheet: copiedSheet
    }

    beforeCommandExecute?.({
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    expect(copiedSheet.id).toMatch(UUID_REGEX)
    expect(copiedSheet).toMatchObject({
      name: 'Original Copy',
      cellData: { 0: { 0: { v: 'Copied value' } } }
    })

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    expect(onUniverSheetInserted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'duplicate',
        sheetId: copiedSheet.id,
        sheetName: 'Original Copy',
        index: 1,
        sourceSheetId: 'sheet-1',
        visualWorksheetSnapshot: expect.objectContaining({
          id: copiedSheet.id,
          cellData: { 0: { 0: {} } }
        })
      })
    )
  })

  it('persists copied worksheets when Univer emits a copy command without an insert mutation', async () => {
    jest.useFakeTimers()
    const onUniverSheetInserted = jest.fn()
    gridTestMockState.workbookSnapshotOverride = {
      sheetOrder: ['sheet-1', 'sheet-copy-fallback'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1'
        },
        'sheet-copy-fallback': {
          id: 'sheet-copy-fallback',
          name: 'Sheet 1 Copy',
          cellData: { 0: { 0: { v: 'Copied value' } } }
        }
      }
    }

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        apiFirstSheetStructure={false}
        getSheetContext={sheetId => (sheetId === 'sheet-1' ? { columns, data } : null)}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onUniverSheetInserted={onUniverSheetInserted}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600)
    })

    eventHandlers.BeforeCommandExecute?.({
      id: 'sheet.command.copy-sheet',
      params: {}
    })

    await act(async () => {
      eventHandlers.CommandExecuted?.({
        type: 1,
        id: 'sheet.command.copy-sheet',
        params: {}
      })
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })

    expect(onUniverSheetInserted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'duplicate',
        sheetId: 'sheet-copy-fallback',
        sheetName: 'Sheet 1 Copy',
        index: 1,
        sourceSheetId: 'sheet-1',
        visualWorksheetSnapshot: expect.objectContaining({
          id: 'sheet-copy-fallback',
          cellData: { 0: { 0: {} } }
        })
      })
    )
  })

  it('uses the live workbook worksheet snapshot for copied sheet content', () => {
    jest.useFakeTimers()
    const onUniverSheetInserted = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        apiFirstSheetStructure={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onUniverSheetInserted={onUniverSheetInserted}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600)
    })

    const beforeCommandExecute = eventHandlers.BeforeCommandExecute
    const copiedSheet = {
      id: 'univer-copy-without-cells',
      name: 'Original Copy'
    }
    const insertParams = {
      unitId: 'workbook-1',
      index: 1,
      sheet: copiedSheet
    }

    beforeCommandExecute?.({
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    gridTestMockState.workbookSnapshotOverride = {
      sheetOrder: ['sheet-1', copiedSheet.id],
      styles: { 'style-red': { bg: { rgb: '#ff0000' } } },
      sheets: {
        'sheet-1': {},
        [copiedSheet.id]: {
          id: copiedSheet.id,
          name: 'Original Copy',
          cellData: { 0: { 0: { v: 'Copied from live snapshot', s: 'style-red' } } }
        }
      }
    }

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    expect(onUniverSheetInserted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'duplicate',
        sheetId: copiedSheet.id,
        sourceSheetId: 'sheet-1',
        visualWorksheetSnapshot: expect.objectContaining({
          id: copiedSheet.id,
          cellData: { 0: { 0: { bg: { rgb: '#ff0000' } } } }
        })
      })
    )
  })

  it('does not persist copied worksheet value mutations as new rows', () => {
    jest.useFakeTimers()
    const onDataChange = jest.fn()
    const onUniverSheetInserted = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        apiFirstSheetStructure={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={onDataChange}
        onUniverSheetInserted={onUniverSheetInserted}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600)
    })

    const copiedSheet = {
      id: 'univer-copy-with-values',
      name: 'Original Copy',
      cellData: { 10: { 0: { v: 'Copied tail value' } } }
    }
    const insertParams = {
      unitId: 'workbook-1',
      index: 1,
      sheet: copiedSheet
    }

    eventHandlers.BeforeCommandExecute?.({
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.set-range-values',
      params: {
        subUnitId: copiedSheet.id,
        range: [{ startRow: 10, endRow: 10, startColumn: 0, endColumn: 0 }],
        cellValue: { 10: { 0: { v: 'Copied tail value' } } }
      }
    })

    expect(onUniverSheetInserted).toHaveBeenCalledWith(expect.objectContaining({ kind: 'duplicate' }))
    expect(onDataChange).not.toHaveBeenCalled()
  })

  it('classifies localized copied worksheet names from payload content, not copy text', () => {
    jest.useFakeTimers()
    const onUniverSheetInserted = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        apiFirstSheetStructure={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onUniverSheetInserted={onUniverSheetInserted}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600)
    })

    const copiedSheet = {
      id: 'univer-kopie-1',
      name: 'Sheet1 (Kopie)',
      cellData: { 0: { 0: { v: 'lokaler Wert', s: 'style-red' } } }
    }
    const insertParams = {
      unitId: 'workbook-1',
      index: 1,
      sheet: copiedSheet
    }

    eventHandlers.BeforeCommandExecute?.({
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    expect(onUniverSheetInserted).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'duplicate',
        sheetId: copiedSheet.id,
        sourceSheetId: 'sheet-1',
        visualWorksheetSnapshot: expect.objectContaining({
          cellData: { 0: { 0: { s: 'style-red' } } }
        })
      })
    )
  })

  it('routes native column insert mutations to the dedicated callback', () => {
    const onColumnsInsert = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onColumnsInsert={onColumnsInsert}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.command.insert-column-right',
      params: {
        range: [{ startRow: 0, endRow: 99, startColumn: 3, endColumn: 4 }]
      }
    })

    expect(onColumnsInsert).toHaveBeenCalledWith(3, 2, 'rightbottom')
  })

  it('routes native column delete mutations to the dedicated callback', () => {
    const onColumnsDelete = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onColumnsDelete={onColumnsDelete}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.command.delete-column',
      params: {
        range: [{ startRow: 0, endRow: 99, startColumn: 1, endColumn: 2 }]
      }
    })

    expect(onColumnsDelete).toHaveBeenCalledWith(1, 2)
  })

  it('routes native column move mutations to the dedicated callback', () => {
    const onColumnsMove = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onColumnsMove={onColumnsMove}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.move-column',
      params: {
        range: [{ startRow: 0, endRow: 99, startColumn: 1, endColumn: 2 }],
        targetRange: { startRow: 0, endRow: 99, startColumn: 4, endColumn: 5 }
      }
    })

    expect(onColumnsMove).toHaveBeenCalledWith(1, 2, 4)
  })

  it('routes native row move mutations to the dedicated callback', () => {
    const onRowsMove = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onRowsMove={onRowsMove}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.command.move-rows',
      params: {
        fromRange: { startRow: 1, endRow: 2, startColumn: 0, endColumn: 99 },
        destinationRow: 5
      }
    })

    expect(onRowsMove).toHaveBeenCalledWith(1, 2, 5)
  })

  it('routes native cell-range move mutations to onCellRangeMove without firing the unified planner', () => {
    const onCellRangeMove = jest.fn()
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onCellRangeMove={onCellRangeMove}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.move-range',
      params: {
        fromRange: { startRow: 1, endRow: 2, startColumn: 1, endColumn: 2 },
        toRange: { startRow: 5, endRow: 6, startColumn: 4, endColumn: 5 }
      }
    })

    expect(onCellRangeMove).toHaveBeenCalledTimes(1)
    expect(onCellRangeMove).toHaveBeenCalledWith(
      { startRow: 1, endRow: 2, startColumn: 1, endColumn: 2 },
      { startRow: 5, endRow: 6, startColumn: 4, endColumn: 5 }
    )
    const plannerCellOps = onMutationBatchOp.mock.calls
      .flatMap(([request]) => (request as { operations?: Array<{ type: string }> })?.operations ?? [])
      .filter(op => op.type === 'set_range' || op.type === 'clear_cell')
    expect(plannerCellOps).toHaveLength(0)
  })

  it('emits a normalized freeze_panes batch for selection freeze commands', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-selection-frozen',
      params: {
        range: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              sheetId: 'sheet-1',
              commandId: 'sheet.command.set-selection-frozen',
              startRow: 2,
              startColumn: 3,
              ySplit: 2,
              xSplit: 3,
              range: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 }
            })
          }
        ]
      })
    )
    const plannerCellOps = onMutationBatchOp.mock.calls
      .flatMap(([request]) => (request as { operations?: Array<{ type: string }> })?.operations ?? [])
      .filter(op => op.type === 'set_range' || op.type === 'clear_cell')
    expect(plannerCellOps).toHaveLength(0)
  })

  it('emits row-only freeze with the column sentinel preserved', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-row-frozen',
      params: {
        range: { startRow: 4, endRow: 4, startColumn: 0, endColumn: 0 },
        startColumn: -1,
        xSplit: 0
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              startRow: 4,
              ySplit: 4,
              startColumn: -1,
              xSplit: 0
            })
          }
        ]
      })
    )
    const rowFreezePayload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }
    expect(rowFreezePayload.operations[0]?.data).not.toHaveProperty('range')
  })

  it('emits cleared freeze_panes for cancel freeze commands', () => {
    jest.useFakeTimers()
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.cancel-frozen',
      params: {}
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              sheetId: 'sheet-1',
              commandId: 'sheet.command.cancel-frozen',
              cleared: true
            })
          }
        ]
      })
    )
  })

  it('ignores set-selection-frozen wrapper commands when the authoritative column freeze follows', () => {
    jest.useFakeTimers()
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-selection-frozen',
      params: {
        type: 2
      }
    })

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.cancel-frozen',
      params: {}
    })

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-col-frozen',
      params: {
        startRow: -1,
        ySplit: 0,
        range: { startRow: 0, endRow: 1011, startColumn: 2, endColumn: 2 }
      }
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              commandId: 'sheet.command.set-col-frozen',
              startRow: -1,
              startColumn: 2,
              ySplit: 0,
              xSplit: 2
            })
          }
        ]
      })
    )
  })

  it('suppresses a transient clear when freeze first column resolves to column A', () => {
    jest.useFakeTimers()
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.cancel-frozen',
      params: {}
    })

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-col-frozen',
      params: {
        startRow: -1,
        ySplit: 0,
        range: { startRow: 0, endRow: 1011, startColumn: 0, endColumn: 0 }
      }
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              commandId: 'sheet.command.set-col-frozen',
              startRow: -1,
              startColumn: 1,
              ySplit: 0,
              xSplit: 1
            })
          }
        ]
      })
    )
  })

  it('emits first-row freeze from a wrapper-only set-selection-frozen command', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-first-row-frozen',
      params: {}
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              commandId: 'sheet.command.set-first-row-frozen',
              startRow: 1,
              startColumn: -1,
              ySplit: 1,
              xSplit: 0
            })
          }
        ]
      })
    )
  })

  it('emits first-column freeze from a wrapper-only set-selection-frozen command', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-first-column-frozen',
      params: {}
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              commandId: 'sheet.command.set-first-column-frozen',
              startRow: -1,
              startColumn: 1,
              ySplit: 0,
              xSplit: 1
            })
          }
        ]
      })
    )
  })

  it('dedupes the special first-column command against the following frozen-state mutation', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-first-column-frozen',
      params: {}
    })
    eventHandlers.CommandExecuted?.({
      type: 0,
      id: 'sheet.command.set-selection-frozen',
      params: {
        type: 4
      }
    })
    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.set-frozen',
      params: {
        subUnitId: 'sheet-1',
        startRow: -1,
        startColumn: 1,
        ySplit: 0,
        xSplit: 1,
        trigger: 'sheet.command.set-selection-frozen'
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          {
            type: 'freeze_panes',
            data: expect.objectContaining({
              commandId: 'sheet.command.set-first-column-frozen',
              startRow: -1,
              startColumn: 1,
              ySplit: 0,
              xSplit: 1
            })
          }
        ]
      })
    )
  })

  it('dedupes a paired sheet.command + sheet.mutation move-range to a single onCellRangeMove call', () => {
    const onCellRangeMove = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onCellRangeMove={onCellRangeMove}
      />
    )

    const params = {
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 3, endRow: 3, startColumn: 3, endColumn: 3 }
    }

    eventHandlers.CommandExecuted?.({ type: 0, id: 'sheet.command.move-range', params })
    eventHandlers.CommandExecuted?.({ type: 2, id: 'sheet.mutation.move-range', params })

    expect(onCellRangeMove).toHaveBeenCalledTimes(1)
  })

  it('retargets copied worksheet follow-up mutations to the rewritten UUID', () => {
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        multiSheetWorkbookMode={true}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    const beforeCommandExecute = eventHandlers.BeforeCommandExecute
    const insertParams = {
      unitId: 'workbook-1',
      index: 1,
      sheet: {
        id: 'univer-copy-2',
        name: 'Large Sheet Copy'
      }
    }

    beforeCommandExecute?.({
      id: 'sheet.mutation.insert-sheet',
      params: insertParams
    })

    const rewrittenId = insertParams.sheet.id
    const followUpParams = {
      unitId: 'workbook-1',
      subUnitId: 'univer-copy-2',
      cellValue: { 10: { 0: { v: 'Chunked copy value' } } }
    }

    beforeCommandExecute?.({
      id: 'sheet.mutation.set-range-values',
      params: followUpParams
    })

    expect(followUpParams.subUnitId).toBe(rewrittenId)
  })

  it('prefers the worksheet post-mutation value over a stale event payload value', () => {
    const onCellsChange = jest.fn()

    render(
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

    lastRangeGetValueMock?.mockReturnValue('Current')

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: { 0: { 0: { v: 'Previous' } } },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'name',
        value: 'Current',
        univerRow: 0,
        univerCol: 0
      })
    ])
  })

  it('does not emit a style batch for multi-cell value clears that only carry an existing style id', () => {
    const onCellsChange = jest.fn()
    const onStyleBatchOp = jest.fn()
    const multiRowData = [
      { _id: 'row-1', name: 'Alice' },
      { _id: 'row-2', name: 'Bob' }
    ]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={multiRowData}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onStyleBatchOp={onStyleBatchOp}
      />
    )

    lastRangeGetCellDataMock?.mockReturnValue({ s: 'style-1' })

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        id: 'deleteSelectionCommand',
        params: {
          cellValue: {
            0: { 0: { v: null, s: 'style-1' } },
            1: { 0: { v: null, s: 'style-1' } }
          },
          range: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'name',
        value: null,
        univerRow: 0,
        univerCol: 0
      }),
      expect.objectContaining({
        rowId: 'row-2',
        sheetId: 'sheet-1',
        columnName: 'name',
        value: null,
        univerRow: 1,
        univerCol: 0
      })
    ])
    expect(onStyleBatchOp).not.toHaveBeenCalled()
  })

  it('emits one unified batch for paste-replace blank clears with matching style patches', () => {
    const onCellsChange = jest.fn()
    const onStyleBatchOp = jest.fn()
    const onMutationBatchOp = jest.fn()
    const multiRowData = [
      { _id: 'row-1', name: 'Alice' },
      { _id: 'row-2', name: 'Bob' }
    ]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={multiRowData}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onStyleBatchOp={onStyleBatchOp}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    lastRangeGetCellDataMock?.mockReturnValue({ s: 'style-1' })
    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.command.paste',
        params: {
          cellValue: {
            0: { 0: { v: null, s: 'style-1' } },
            1: { 0: { v: null, s: 'style-1' } }
          },
          range: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }
    const setRange = payload.operations.find(operation => operation.type === 'set_range')
    expect(setRange).toBeDefined()
    expect((setRange?.data as { cells?: Array<{ value?: unknown }> }).cells?.some(cell => cell.value === null)).toBe(
      true
    )
    expect(payload.operations.some(operation => operation.type === 'set_style')).toBe(true)
    expect(onCellsChange).not.toHaveBeenCalled()
    expect(onStyleBatchOp).not.toHaveBeenCalled()
  })

  it('mirrors DOM paste formatting from Univer post-paste cells into set_style', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    act(() => {
      document.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    })

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.mutation.set-range-values',
        params: {
          cellValue: {
            0: {
              0: {
                v: 'Excel pasted',
                bg: { rgb: '#00ff00' },
                cl: { rgb: '#ff0000' }
              }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: { cells?: Array<{ stylePatch?: Record<string, unknown> }> } }>
    }
    expect(payload.operations.some(operation => operation.type === 'set_range')).toBe(true)
    const styleOperation = payload.operations.find(operation => operation.type === 'set_style')
    expect(styleOperation?.data.cells?.[0]?.stylePatch).toEqual(
      expect.objectContaining({
        set: expect.objectContaining({
          bg: { rgb: '#00ff00' },
          cl: { rgb: '#ff0000' }
        }),
        unset: expect.arrayContaining(['s', 'bl', 'it'])
      })
    )
  })

  it('reads pasted formatting from live Univer cell data when SheetValueChanged only carries values', () => {
    const onMutationBatchOp = jest.fn()
    gridTestMockState.worksheetCellDataByCoord = new Map([
      [
        '0:0',
        {
          v: 'Excel pasted',
          bg: { rgb: '#00ff00' },
          cl: { rgb: '#ff0000' }
        }
      ]
    ])

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    act(() => {
      document.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    })

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.mutation.set-range-values',
        params: {
          cellValue: {
            0: { 0: { v: 'Excel pasted' } }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: { cells?: Array<{ stylePatch?: Record<string, unknown> }> } }>
    }
    const styleOperation = payload.operations.find(operation => operation.type === 'set_style')
    expect(styleOperation?.data.cells?.[0]?.stylePatch).toEqual(
      expect.objectContaining({
        set: expect.objectContaining({
          bg: { rgb: '#00ff00' },
          cl: { rgb: '#ff0000' }
        })
      })
    )
  })

  it('reads pasted formatting from live Univer cell data at relative payload coordinates', () => {
    const onMutationBatchOp = jest.fn()
    const wideColumns = Array.from({ length: 13 }, (_, index) => ({
      id: `col-${index}`,
      name: `col_${index}`,
      label: `Column ${index}`,
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: index
    })) as any
    gridTestMockState.worksheetCellDataByCoord = new Map([
      [
        '6:12',
        {
          v: 'Excel pasted away from A1',
          bg: { rgb: '#00ff00' }
        }
      ]
    ])

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={Array.from({ length: 10 }, (_, index) => ({
          _id: `row-${index + 1}`,
          col_12: index === 6 ? 'Old' : `Row ${index + 1}`
        }))}
        columns={wideColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    act(() => {
      document.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    })

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.mutation.set-range-values',
        params: {
          cellValue: {
            0: { 0: { v: 'Excel pasted away from A1' } }
          },
          range: [{ startRow: 6, endRow: 6, startColumn: 12, endColumn: 12 }]
        }
      }
    })

    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: { cells?: Array<{ row?: number; col?: number; stylePatch?: unknown }> } }>
    }
    const styleOperation = payload.operations.find(operation => operation.type === 'set_style')
    expect(styleOperation?.data.cells?.[0]).toEqual(
      expect.objectContaining({
        row: 6,
        col: 12,
        stylePatch: expect.objectContaining({
          set: expect.objectContaining({ bg: { rgb: '#00ff00' } })
        })
      })
    )
  })

  it('does not turn a plain DOM paste into a formatting wipe or stale paste intent', () => {
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    act(() => {
      document.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    })

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.mutation.set-range-values',
        params: {
          cellValue: {
            0: { 0: { v: 'Plain pasted' } }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    let payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string }>
    }
    expect(payload.operations.some(operation => operation.type === 'set_range')).toBe(true)
    expect(payload.operations.some(operation => operation.type === 'set_style')).toBe(false)

    onMutationBatchOp.mockClear()
    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.mutation.set-range-values',
        params: {
          cellValue: {
            0: { 0: { v: 'Styled edit', s: 'style-1' } }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string }>
    }
    expect(payload.operations.some(operation => operation.type === 'set_range')).toBe(true)
    expect(payload.operations.some(operation => operation.type === 'set_style')).toBe(false)
  })

  it('includes referenced style definitions for pasted style ids', () => {
    const onMutationBatchOp = jest.fn()
    gridTestMockState.workbookSnapshotOverride = {
      sheetOrder: ['sheet-1'],
      styles: {
        'style-1': { bg: { rgb: '#111111' }, cl: { rgb: '#eeeeee' } }
      },
      sheets: {
        'sheet-1': {
          defaultColumnWidth: 73,
          defaultRowHeight: 23,
          rowHeader: { width: 48 },
          columnHeader: { height: 28 }
        }
      }
    }

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.command.paste',
        params: {
          cellValue: {
            0: { 0: { v: 'Excel pasted', s: 'style-1' } }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }
    const styleOperation = payload.operations.find(operation => operation.type === 'set_style')
    expect(styleOperation?.data.styles).toEqual({
      'style-1': { bg: { rgb: '#111111' }, cl: { rgb: '#eeeeee' } }
    })
  })

  it('emits unified value batch instead of onCellsChange when mutation batch callback is provided', () => {
    const onCellsChange = jest.fn()
    const onMutationBatchOp = jest.fn()

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.mutation.set-range-values',
        params: {
          cellValue: {
            0: { 0: { v: 'Updated' } }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledTimes(1)
    const payload = onMutationBatchOp.mock.calls[0]?.[0] as {
      operations: Array<{ type: string; data: Record<string, unknown> }>
    }
    expect(payload.operations.some(operation => operation.type === 'set_range')).toBe(true)
    expect(onCellsChange).not.toHaveBeenCalled()
  })

  it('skips already blank cells when a clear-range mutation targets a whole column', () => {
    const onCellsChange = jest.fn()
    const mixedData = [
      { _id: 'row-1', name: 'Alice' },
      { _id: 'row-2', name: '' }
    ]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={mixedData}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    gridTestMockState.worksheetValueByCoord = new Map([
      ['0:0', null],
      ['1:0', null]
    ])

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        id: 'deleteSelectionCommand',
        params: {
          cellValue: {
            0: { 0: { v: null } },
            1: { 0: { v: null } }
          },
          range: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledTimes(1)
    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'name',
        value: null,
        univerRow: 0,
        univerCol: 0
      })
    ])
  })

  it('does not persist multi-cell clear values from command-executed before sheet-value-changed arrives', () => {
    const onCellsChange = jest.fn()
    const multiRowData = [
      { _id: 'row-1', name: 'Alice' },
      { _id: 'row-2', name: 'Bob' }
    ]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={multiRowData}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const commandExecuted = eventHandlers.CommandExecuted
    commandExecuted?.({
      type: 2,
      id: 'deleteSelectionCommand',
      params: {
        cellValue: {
          0: { 0: { v: null } },
          1: { 0: { v: null } }
        },
        range: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }]
      }
    })

    expect(onCellsChange).not.toHaveBeenCalled()
  })

  it('persists non-blank multi-cell values when sheet-value-changed arrives after autofill', () => {
    const onCellsChange = jest.fn()
    const multiColumns = [
      { id: 'col-a', name: 'colA', label: 'A', type: 'text', isVisible: true, order: 0 },
      { id: 'col-b', name: 'colB', label: 'B', type: 'text', isVisible: true, order: 1 },
      { id: 'col-c', name: 'colC', label: 'C', type: 'text', isVisible: true, order: 2 }
    ] as any
    const rowData = [{ _id: 'row-1', colA: '', colB: '', colC: '' }]
    gridTestMockState.worksheetValueByCoord = new Map<string, unknown>([
      ['0:0', 7],
      ['0:1', 8],
      ['0:2', 9]
    ])

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={multiColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const commandExecuted = eventHandlers.CommandExecuted
    commandExecuted?.({
      type: 2,
      id: 'sheet.command.autofill',
      params: {
        cellValue: {
          0: {
            0: { v: 7 },
            1: { v: 8 },
            2: { v: 9 }
          }
        },
        range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 2 }]
      }
    })

    expect(onCellsChange).not.toHaveBeenCalled()

    eventHandlers.SheetValueChanged?.({
      payload: {
        id: 'sheet.command.autofill',
        params: {
          cellValue: {
            0: {
              0: { v: 7 },
              1: { v: 8 },
              2: { v: 9 }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 2 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({ rowId: 'row-1', columnName: 'colA', value: 7 }),
      expect.objectContaining({ rowId: 'row-1', columnName: 'colB', value: 8 }),
      expect.objectContaining({ rowId: 'row-1', columnName: 'colC', value: 9 })
    ])
  })

  it('does not persist blank-like mixed style payloads for non-clear multi-cell mutations', () => {
    const onCellsChange = jest.fn()
    const multiRowData = [
      { _id: 'row-1', name: 'Alice' },
      { _id: 'row-2', name: 'Bob' }
    ]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={multiRowData}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
        collaborationEnabled={true}
        onStyleBatchOp={jest.fn()}
      />
    )

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: {
            0: { 0: { v: null, s: 'style-1' } },
            1: { 0: { v: null, s: 'style-1' } }
          },
          range: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }]
        }
      }
    })

    expect(onCellsChange).not.toHaveBeenCalled()
  })

  it('fills blank gaps without clearing existing non-blank cells during non-clear multi-cell mutations', () => {
    const onCellsChange = jest.fn()
    const multiColumns = [
      {
        id: 'col-a',
        name: 'colA',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      },
      {
        id: 'col-b',
        name: 'colB',
        label: 'B',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      },
      {
        id: 'col-c',
        name: 'colC',
        label: 'C',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 2
      },
      {
        id: 'col-d',
        name: 'colD',
        label: 'D',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 3
      },
      {
        id: 'col-e',
        name: 'colE',
        label: 'E',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 4
      },
      {
        id: 'col-f',
        name: 'colF',
        label: 'F',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 5
      }
    ] as any
    const rowData = [{ _id: 'row-1', colA: '', colB: '', colC: 'C', colD: 'D', colE: '', colF: '' }]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={multiColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    lastRangeGetValueMock?.mockReturnValue(undefined)

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: {
            0: {
              0: { v: 'C' },
              1: { v: null },
              2: { v: 'C' },
              3: { v: 'C' }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 5 }]
        }
      }
    })

    const emittedCells = onCellsChange.mock.calls[0]?.[0] as Array<{ value: unknown }>
    expect(Array.isArray(emittedCells)).toBe(true)
    expect(emittedCells.length).toBeGreaterThan(0)
    expect(emittedCells.every(cell => cell.value === 'C')).toBe(true)
  })

  it('ignores the blank-only command phase of a drag-fill before the later value phase arrives', () => {
    const onCellsChange = jest.fn()
    const multiColumns = [
      {
        id: 'col-a',
        name: 'colA',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      },
      {
        id: 'col-b',
        name: 'colB',
        label: 'B',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      },
      {
        id: 'col-c',
        name: 'colC',
        label: 'C',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 2
      },
      {
        id: 'col-d',
        name: 'colD',
        label: 'D',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 3
      },
      {
        id: 'col-e',
        name: 'colE',
        label: 'E',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 4
      },
      {
        id: 'col-f',
        name: 'colF',
        label: 'F',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 5
      }
    ] as any
    const rowData = [{ _id: 'row-1', colA: '', colB: '', colC: 'C', colD: 'D', colE: '', colF: '' }]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={multiColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const commandExecuted = eventHandlers.CommandExecuted
    commandExecuted?.({
      type: 2,
      id: 'sheet.command.autofill',
      params: {
        cellValue: {
          0: {
            0: { v: '' },
            1: { v: '' },
            2: { v: '' },
            3: { v: '' }
          }
        },
        range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 5 }]
      }
    })

    expect(onCellsChange).not.toHaveBeenCalled()

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: {
            0: {
              2: { v: 'C' },
              3: { v: 'C' }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 5 }]
        }
      }
    })

    const emittedCells = onCellsChange.mock.calls[0]?.[0] as Array<{ value: unknown }>
    expect(Array.isArray(emittedCells)).toBe(true)
    expect(emittedCells.length).toBeGreaterThan(0)
    expect(emittedCells.every(cell => cell.value === 'C')).toBe(true)
  })

  it('does not clear existing values from worksheet-derived blanks when the payload only explicitly fills gaps', () => {
    const onCellsChange = jest.fn()
    const multiColumns = [
      {
        id: 'col-a',
        name: 'colA',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      },
      {
        id: 'col-b',
        name: 'colB',
        label: 'B',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      },
      {
        id: 'col-c',
        name: 'colC',
        label: 'C',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 2
      },
      {
        id: 'col-d',
        name: 'colD',
        label: 'D',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 3
      },
      {
        id: 'col-e',
        name: 'colE',
        label: 'E',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 4
      },
      {
        id: 'col-f',
        name: 'colF',
        label: 'F',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 5
      }
    ] as any
    const rowData = [{ _id: 'row-1', colA: '', colB: '', colC: 'C', colD: 'D', colE: '', colF: '' }]

    gridTestMockState.worksheetValueByCoord = new Map<string, unknown>([
      ['0:2', 'C'],
      ['0:3', ''],
      ['0:4', 'C'],
      ['0:5', 'C']
    ])

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={multiColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: {
            0: {
              4: { v: 'C' },
              5: { v: 'C' }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 5 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'colE',
        value: 'C',
        univerRow: 0,
        univerCol: 4
      }),
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'colF',
        value: 'C',
        univerRow: 0,
        univerCol: 5
      })
    ])
  })

  it('prefers the live workbook snapshot over an inverted multi-cell sheet-value-changed payload', () => {
    const onCellsChange = jest.fn()
    const multiColumns = [
      {
        id: 'col-a',
        name: 'colA',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      },
      {
        id: 'col-b',
        name: 'colB',
        label: 'B',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      },
      {
        id: 'col-c',
        name: 'colC',
        label: 'C',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 2
      },
      {
        id: 'col-d',
        name: 'colD',
        label: 'D',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 3
      },
      {
        id: 'col-e',
        name: 'colE',
        label: 'E',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 4
      },
      {
        id: 'col-f',
        name: 'colF',
        label: 'F',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 5
      },
      {
        id: 'col-g',
        name: 'colG',
        label: 'G',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 6
      }
    ] as any
    const rowData = [{ _id: 'row-1', colA: 1, colB: 5, colC: '', colD: '', colE: '', colF: '', colG: '' }]

    gridTestMockState.worksheetValueByCoord = new Map<string, unknown>([
      ['0:2', null],
      ['0:3', null],
      ['0:4', null],
      ['0:5', 5],
      ['0:6', 5]
    ])
    gridTestMockState.workbookSnapshotOverride = {
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1',
          cellData: {
            0: {
              0: { v: 1 },
              1: { v: 5 },
              2: { v: 5 },
              3: { v: 5 },
              4: { v: 5 },
              5: { s: 'style-1' },
              6: { s: 'style-1' },
              7: { v: 5 },
              8: { v: 5 },
              9: { v: 5 },
              10: { v: 5 }
            }
          },
          defaultColumnWidth: 73,
          defaultRowHeight: 23,
          rowHeader: { width: 48 },
          columnHeader: { height: 28 }
        }
      }
    } as any

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={multiColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: {
            0: {
              2: { v: null },
              3: { v: null },
              4: { v: null },
              5: { v: 5 },
              6: { v: 5 }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 10 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledTimes(1)
    expect(onCellsChange.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          sheetId: 'sheet-1',
          columnName: 'colC',
          value: 5,
          univerRow: 0,
          univerCol: 2
        }),
        expect.objectContaining({
          rowId: 'row-1',
          sheetId: 'sheet-1',
          columnName: 'colD',
          value: 5,
          univerRow: 0,
          univerCol: 3
        }),
        expect.objectContaining({
          rowId: 'row-1',
          sheetId: 'sheet-1',
          columnName: 'colE',
          value: 5,
          univerRow: 0,
          univerCol: 4
        })
      ])
    )
  })

  it('drops blank cells from non-clear multi-cell sheet-value-changed persistence', () => {
    const onCellsChange = jest.fn()
    const multiColumns = [
      {
        id: 'col-a',
        name: 'colA',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      },
      {
        id: 'col-b',
        name: 'colB',
        label: 'B',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      },
      {
        id: 'col-c',
        name: 'colC',
        label: 'C',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 2
      },
      {
        id: 'col-d',
        name: 'colD',
        label: 'D',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 3
      }
    ] as any
    const rowData = [{ _id: 'row-1', colA: '', colB: 7778, colC: 7778, colD: '' }]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={multiColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        params: {
          cellValue: {
            0: {
              1: { v: null },
              2: { v: 7778 },
              3: { v: 7778 }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 3 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'colD',
        value: 7778,
        univerRow: 0,
        univerCol: 3
      })
    ])
  })

  it('treats autofill command payload coordinates as absolute when that avoids shifting values across a non-zero range', () => {
    const onCellsChange = jest.fn()
    const fillColumns = [
      {
        id: 'col-a',
        name: 'colA',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      },
      {
        id: 'col-b',
        name: 'colB',
        label: 'B',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      },
      {
        id: 'col-c',
        name: 'colC',
        label: 'C',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 2
      },
      {
        id: 'col-d',
        name: 'colD',
        label: 'D',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 3
      },
      {
        id: 'col-e',
        name: 'colE',
        label: 'E',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 4
      }
    ] as any
    const rowData = [{ _id: 'row-1', colA: '', colB: 'A', colC: 'B', colD: '', colE: '' }]

    gridTestMockState.worksheetValueByCoord = new Map<string, unknown>([
      ['0:1', 'A'],
      ['0:2', 'B'],
      ['0:3', 'A'],
      ['0:4', 'B']
    ])

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={rowData}
        columns={fillColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    const commandExecuted = eventHandlers.CommandExecuted
    commandExecuted?.({
      type: 2,
      id: 'sheet.command.autofill',
      params: {
        cellValue: {
          0: {
            1: { v: 'A' },
            2: { v: 'B' },
            3: { v: 'A' },
            4: { v: 'B' }
          }
        },
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 4 }]
      }
    })

    expect(onCellsChange).not.toHaveBeenCalled()

    const sheetValueChanged = eventHandlers.SheetValueChanged
    sheetValueChanged?.({
      payload: {
        id: 'sheet.command.autofill',
        params: {
          cellValue: {
            0: {
              1: { v: 'A' },
              2: { v: 'B' },
              3: { v: 'A' },
              4: { v: 'B' }
            }
          },
          range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 4 }]
        }
      }
    })

    expect(onCellsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'colD',
        value: 'A',
        univerRow: 0,
        univerCol: 3
      }),
      expect.objectContaining({
        rowId: 'row-1',
        sheetId: 'sheet-1',
        columnName: 'colE',
        value: 'B',
        univerRow: 0,
        univerCol: 4
      })
    ])
  })

  it('does not emit a clear when selection reconcile reads an untouched blank cell', () => {
    jest.useFakeTimers()
    const onCellsChange = jest.fn()
    const blankColumns = [
      columns[0],
      {
        id: 'col-2',
        name: 'city',
        label: 'City',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 150,
        order: 1
      }
    ] as any
    const blankData = [{ _id: 'row-1', name: '', city: '' }]

    render(
      <UniverSheetGrid
        sheet={sheet}
        data={blankData}
        columns={blankColumns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={onCellsChange}
        onDataChange={jest.fn()}
      />
    )

    lastRangeGetValueMock?.mockReturnValue(undefined)

    gridTestMockState.selectionState = { actualRow: 0, actualColumn: 0 }
    act(() => {
      eventHandlers.SelectionChanged?.({})
      jest.advanceTimersByTime(100)
    })

    gridTestMockState.selectionState = { actualRow: 0, actualColumn: 1 }
    act(() => {
      eventHandlers.SelectionChanged?.({})
      jest.advanceTimersByTime(100)
    })

    expect(onCellsChange).not.toHaveBeenCalled()
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
      popup.tabIndex = -1
      popup.addEventListener('keydown', event => {
        if ((event as KeyboardEvent).key === 'Escape') {
          popup.remove()
        }
      })

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
    expect(document.querySelector('.mock-univer-popup')).toBeTruthy()

    if (injected) fireEvent.click(injected)
    expect(onOpenCommentRequest).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.mock-univer-popup')).toBeNull()
  })

  it('injects Merge for unmerged selections and runs Univer merge command', () => {
    jest.useFakeTimers()
    const { getByTestId } = render(
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

    gridTestMockState.selectionState = { actualRow: 0, actualColumn: 0 }

    act(() => {
      eventHandlers.SelectionChanged?.({})
      jest.advanceTimersByTime(100)
    })

    const gridContainer = getByTestId('univer-sheet-grid-container')

    setTimeout(() => {
      const popup = document.createElement('div')
      popup.className = 'mock-univer-popup'
      popup.tabIndex = -1
      popup.addEventListener('keydown', event => {
        if ((event as KeyboardEvent).key === 'Escape') {
          popup.remove()
        }
      })
      const mainList = document.createElement('ul')
      const staleUnmerge = document.createElement('li')
      staleUnmerge.setAttribute('data-univer-unmerge-item', 'true')
      staleUnmerge.textContent = 'Unmerge'
      mainList.appendChild(staleUnmerge)
      ;['Copy Special', 'Paste Special', 'Clear', 'Insert', 'Delete', 'Freeze'].forEach(label => {
        const item = document.createElement('li')
        item.textContent = label
        mainList.appendChild(item)
      })
      popup.appendChild(mainList)
      document.body.appendChild(popup)
    }, 20)

    fireEvent.contextMenu(gridContainer, { clientX: 130, clientY: 150 })

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    const mergeItem = document.querySelector<HTMLElement>('[data-univer-merge-item]')
    expect(mergeItem).toBeTruthy()
    expect(mergeItem?.textContent).toContain('Merge')
    expect(mergeItem?.querySelector('svg')).toBeTruthy()
    expect(document.querySelector('.mock-univer-popup')).toBeTruthy()

    const unmergeItem = document.querySelector<HTMLElement>('[data-univer-unmerge-item]')
    expect(unmergeItem).toBeNull()

    if (mergeItem) fireEvent.click(mergeItem)
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.add-worksheet-merge',
      expect.objectContaining({
        subUnitId: 'sheet-1',
        selections: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        defaultMerge: true
      })
    )
    expect(document.querySelector('.mock-univer-popup')).toBeNull()
  })

  it('injects Unmerge for merged selections and runs Univer unmerge command', () => {
    jest.useFakeTimers()
    const { getByTestId } = render(
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

    gridTestMockState.selectionState = { actualRow: 0, actualColumn: 0 }
    gridTestMockState.workbookSnapshotOverride = {
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
        }
      }
    }

    act(() => {
      eventHandlers.SelectionChanged?.({})
      jest.advanceTimersByTime(100)
    })

    const gridContainer = getByTestId('univer-sheet-grid-container')

    setTimeout(() => {
      const popup = document.createElement('div')
      popup.className = 'mock-univer-popup'
      popup.tabIndex = -1
      popup.addEventListener('keydown', event => {
        if ((event as KeyboardEvent).key === 'Escape') {
          popup.remove()
        }
      })
      const mainList = document.createElement('ul')
      const staleMerge = document.createElement('li')
      staleMerge.setAttribute('data-univer-merge-item', 'true')
      staleMerge.textContent = 'Merge'
      mainList.appendChild(staleMerge)
      ;['Copy Special', 'Paste Special', 'Clear', 'Insert', 'Delete', 'Freeze'].forEach(label => {
        const item = document.createElement('li')
        item.textContent = label
        mainList.appendChild(item)
      })
      popup.appendChild(mainList)
      document.body.appendChild(popup)
    }, 20)

    fireEvent.contextMenu(gridContainer, { clientX: 130, clientY: 150 })

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    const mergeItem = document.querySelector<HTMLElement>('[data-univer-merge-item]')
    expect(mergeItem).toBeNull()

    const unmergeItem = document.querySelector<HTMLElement>('[data-univer-unmerge-item]')
    expect(unmergeItem).toBeTruthy()
    expect(unmergeItem?.textContent).toContain('Unmerge')
    expect(unmergeItem?.querySelector('svg')).toBeTruthy()

    if (unmergeItem) fireEvent.click(unmergeItem)
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.remove-worksheet-merge',
      expect.objectContaining({
        subUnitId: 'sheet-1',
        sheetId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
      })
    )
    expect(document.querySelector('.mock-univer-popup')).toBeNull()
  })

  it('simplifies the merge toolbar dropdown to Merge and Unmerge', () => {
    jest.useFakeTimers()
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

    const menu = document.createElement('div')
    ;['Merge all', 'Vertical merge', 'Horizontal merge', 'Cancel merge'].forEach(label => {
      const item = document.createElement('button')
      const icon = document.createElement('span')
      icon.appendChild(document.createElement('svg'))
      const text = document.createElement('span')
      text.textContent = label
      item.append(icon, text)
      menu.appendChild(item)
    })
    document.body.appendChild(menu)

    act(() => {
      jest.advanceTimersByTime(250)
    })

    const items = Array.from(menu.querySelectorAll<HTMLElement>('button'))
    expect(items[0].textContent).toContain('Merge')
    expect(items[0].textContent).not.toContain('Merge all')
    expect(items[1].style.display).toBe('none')
    expect(items[2].style.display).toBe('none')
    expect(items[3].textContent).toContain('Unmerge')
  })

  it('emits unmerge_ranges for Univer remove-worksheet-merge commands', () => {
    const onMutationBatchOp = jest.fn()
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.command.remove-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: [
          {
            type: 'unmerge_ranges',
            data: expect.objectContaining({
              sheetId: 'sheet-1',
              commandId: 'sheet.command.remove-worksheet-merge',
              ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
            })
          }
        ]
      })
    )
  })

  it('emits column visibility_update for Univer visible commands', () => {
    const onMutationBatchOp = jest.fn()
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.command.set-selected-cols-visible',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: [
          {
            type: 'visibility_update',
            data: expect.objectContaining({
              sheetId: 'sheet-1',
              commandId: 'sheet.command.set-selected-cols-visible',
              axis: 'column',
              hidden: false,
              ranges: [{ start: 1, end: 2 }]
            })
          }
        ]
      })
    )
  })

  it('emits column visibility_update from Univer hidden mutation ranges', () => {
    const onMutationBatchOp = jest.fn()
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.mutation.set-col-hidden',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 999, startColumn: 3, endColumn: 3 }]
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: [
          {
            type: 'visibility_update',
            data: expect.objectContaining({
              sheetId: 'sheet-1',
              commandId: 'sheet.mutation.set-col-hidden',
              axis: 'column',
              hidden: true,
              ranges: [{ start: 3, end: 3 }]
            })
          }
        ]
      })
    )
  })

  it('does not infer visibility_update ranges from post-hide active selection', () => {
    const onMutationBatchOp = jest.fn()
    render(
      <UniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onCellsChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )

    eventHandlers.CommandExecuted?.({
      type: 2,
      id: 'sheet.command.set-col-hidden',
      params: {
        subUnitId: 'sheet-1'
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
  })
})
