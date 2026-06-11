import './setupUniverSheetGridTestMocks'
import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import type { UniverSheetGridHandle } from '../UniverSheetGrid.types'
import { repairAuthoritativeMergeRegistryAfterBootstrap } from '../UniverSheetGrid'
import {
  executeCommandMock,
  eventHandlers,
  gridTestMockState,
  lastCancelFreezeMock,
  lastRequestedRangeCoords,
  lastRangeSetValueMock,
  lastSetFreezeMock,
  resetUniverSheetGridTestMocks,
  TestUniverSheetGrid
} from './setupUniverSheetGridTestMocks'

describe('UniverSheetGrid remote apply', () => {
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
  })

  it('applyRemoteCellUpdate writes via Univer range after microtask', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteCellUpdate).toBeDefined())
    lastRangeSetValueMock?.mockClear()
    await act(async () => {
      ref.current?.applyRemoteCellUpdate?.(0, 0, 'RemoteVal')
      await Promise.resolve()
    })
    expect(lastRangeSetValueMock).toHaveBeenCalled()
  })

  it('applyRemoteCellUpdate clears stale text format metadata on numeric overwrite', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    gridTestMockState.worksheetCellDataByCoord = new Map([['0:0', { v: 'old', s: 'style-1', ct: { fa: '@' }, t: 1 }]])
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteCellUpdate).toBeDefined())
    lastRangeSetValueMock?.mockClear()
    await act(async () => {
      ref.current?.applyRemoteCellUpdate?.(0, 0, 42)
      await Promise.resolve()
    })
    expect(lastRangeSetValueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        v: 42,
        s: 'style-1',
        ct: null
      })
    )
    const lastCall = lastRangeSetValueMock?.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(lastCall).not.toHaveProperty('t')
  })

  it('applyRemoteCellUpdate preserves sender row coordinates when useSenderA1Row is set', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    const shiftedData = [{ _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 5, name: 'Alice' }]
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={shiftedData}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteCellUpdate).toBeDefined())
    await act(async () => {
      ref.current?.applyRemoteCellUpdate?.(5, 0, 'RemoteVal', 'row-1', { useSenderA1Row: true })
      await Promise.resolve()
    })

    expect(lastRequestedRangeCoords).toEqual({
      sheetId: 'sheet-1',
      row: 5,
      col: 0
    })
    expect(lastRangeSetValueMock).toHaveBeenCalled()
  })

  it('applyRemoteCellUpdatesBulk routes a single-cell batch through the deferred bulk path', async () => {
    // With `SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH = 1` the previous serial
    // bypass for `items.length < 2` was removed. Single-cell broadcasts now
    // take the same `queueMicrotask` + chunked-rAF path as larger batches.
    // The test waits for the rAF chunk to fire (instead of relying on the
    // immediate synchronous `setValue`) and asserts the cell still lands.
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteCellUpdatesBulk).toBeDefined())
    lastRangeSetValueMock?.mockClear()
    await act(async () => {
      ref.current?.applyRemoteCellUpdatesBulk?.([{ rowIndex: 0, colIndex: 0, value: 'A', rowId: 'row-1' }], {
        onApplyComplete: jest.fn()
      })
    })
    await waitFor(() => {
      expect(lastRangeSetValueMock?.mock.calls.length ?? 0).toBeGreaterThanOrEqual(1)
    })
  })

  it('applyRemoteClearAllRange dispatches set-range-values mutation', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteClearAllRange).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()
    act(() => {
      ref.current?.applyRemoteClearAllRange?.({
        sheetId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
      })
    })
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.mutation.set-range-values',
      expect.objectContaining({
        unitId: expect.anything(),
        subUnitId: expect.anything(),
        cellValue: expect.any(Object)
      })
    )
  })

  it('applyRemoteClearFormatRange dispatches format clear via mutation', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteClearFormatRange).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()
    act(() => {
      ref.current?.applyRemoteClearFormatRange?.({
        sheetId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
      })
    })
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.mutation.set-range-values',
      expect.objectContaining({
        cellValue: { '0': { '0': { s: null } } }
      })
    )
  })

  it('applyRemoteSpreadsheetFeatureOperation dispatches merge mutation', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()
    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'merge_ranges',
        data: {
          sheetId: 'sheet-1',
          ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
        }
      })
    })
    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.mutation.add-worksheet-merge',
      expect.objectContaining({
        unitId: expect.anything(),
        subUnitId: expect.anything(),
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
      })
    )
  })

  it('applyCommittedWorksheetMergePatch dispatches unmerge before merge deltas', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyCommittedWorksheetMergePatch).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()

    act(() => {
      ref.current?.applyCommittedWorksheetMergePatch?.(
        'sheet-1',
        [{ startRow: 0, endRow: 2, startColumn: 1, endColumn: 2 }],
        [{ startRow: 0, endRow: 2, startColumn: 1, endColumn: 1 }]
      )
    })

    expect(executeCommandMock?.mock.calls).toEqual([
      [
        'sheet.mutation.remove-worksheet-merge',
        expect.objectContaining({
          unitId: expect.anything(),
          subUnitId: expect.anything(),
          ranges: [{ startRow: 0, endRow: 2, startColumn: 1, endColumn: 2 }]
        })
      ],
      [
        'sheet.mutation.add-worksheet-merge',
        expect.objectContaining({
          unitId: expect.anything(),
          subUnitId: expect.anything(),
          ranges: [{ startRow: 0, endRow: 2, startColumn: 1, endColumn: 1 }]
        })
      ]
    ])
  })

  it('repairs authoritative merge registry after bootstrap when live snapshot mergeData is stale', async () => {
    const sheetWithMerge = {
      ...sheet,
      settings: {
        ...sheet.settings,
        mergeData: [{ startRow: 6, endRow: 14, startColumn: 1, endColumn: 1 }]
      }
    } as any
    gridTestMockState.workbookSnapshotOverride = {
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          mergeData: []
        }
      }
    }

    const applyRemoteSpreadsheetFeatureOperation = jest.fn()

    expect(
      repairAuthoritativeMergeRegistryAfterBootstrap({
        liveSnapshot: gridTestMockState.workbookSnapshotOverride,
        sheet: sheetWithMerge,
        snapshotSeed: 'snapshot-with-merge',
        applyRemoteSpreadsheetFeatureOperation
      })
    ).toBe(true)
    expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith({
      type: 'merge_ranges',
      data: {
        sheetId: 'sheet-1',
        ranges: [{ startRow: 6, endRow: 14, startColumn: 1, endColumn: 1 }]
      }
    })
  })

  it('applyRemoteSpreadsheetFeatureOperation maps recorded column hide mutations to command replay', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'visibility_update',
        data: {
          sheetId: 'sheet-1',
          commandId: 'sheet.mutation.set-col-hidden',
          axis: 'column',
          hidden: true,
          ranges: [{ start: 3, end: 3 }],
          params: {
            ranges: [{ startRow: 0, startColumn: 3, endRow: 1027, endColumn: 3 }]
          }
        }
      })
    })

    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.set-col-hidden',
      expect.objectContaining({
        ranges: [{ startRow: 0, startColumn: 3, endRow: 1027, endColumn: 3 }]
      })
    )
  })

  it('applies remote visibility updates to the targeted non-visible sheet in multi-sheet mode', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    const visibleSheet = { ...sheet, id: 'sheet-2', name: 'Sheet 2' }
    const activeSheetIdsDuringCommand: string[] = []
    gridTestMockState.activeSheetId = 'sheet-2'
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={visibleSheet}
        data={data}
        columns={columns}
        multiSheetWorkbookMode={true}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()
    executeCommandMock?.mockImplementation(() => {
      activeSheetIdsDuringCommand.push(gridTestMockState.activeSheetId)
    })

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'visibility_update',
        data: {
          sheetId: 'sheet-1',
          commandId: 'sheet.mutation.set-col-hidden',
          axis: 'column',
          hidden: true,
          ranges: [{ start: 4, end: 4 }],
          params: {
            ranges: [{ startRow: 0, startColumn: 4, endRow: 1002, endColumn: 4 }]
          }
        }
      })
    })

    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.set-col-hidden',
      expect.objectContaining({
        subUnitId: 'sheet-1',
        sheetId: 'sheet-1'
      })
    )
    expect(activeSheetIdsDuringCommand).toContain('sheet-1')
    expect(gridTestMockState.activeSheetId).toBe('sheet-2')
    expect(executeCommandMock).not.toHaveBeenCalledWith(
      'sheet.command.set-col-hidden',
      expect.objectContaining({
        subUnitId: 'sheet-2'
      })
    )
  })

  it('applyRemoteSpreadsheetFeatureOperation dispatches deterministic visibility command with ranges', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockClear()

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'visibility_update',
        data: {
          sheetId: 'sheet-1',
          commandId: 'sheet.command.set-selected-cols-visible',
          axis: 'column',
          hidden: false,
          ranges: [{ start: 1, end: 2 }]
        }
      })
    })

    expect(executeCommandMock).toHaveBeenCalledWith(
      'sheet.command.set-col-visible-on-cols',
      expect.objectContaining({
        unitId: expect.anything(),
        subUnitId: expect.anything(),
        sheetId: 'sheet-1',
        ranges: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]
      })
    )
  })

  it('applyRemoteSpreadsheetFeatureOperation uses deterministic worksheet freeze replay', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(lastSetFreezeMock).toBeDefined())
    executeCommandMock?.mockClear()
    lastSetFreezeMock?.mockClear()

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'freeze_panes',
        data: {
          sheetId: 'sheet-1',
          startRow: 2,
          startColumn: -1,
          ySplit: 2,
          xSplit: 0
        }
      })
    })

    expect(lastSetFreezeMock).toHaveBeenCalledWith({
      startRow: 2,
      startColumn: -1,
      ySplit: 2,
      xSplit: 0
    })
    expect(executeCommandMock).not.toHaveBeenCalled()
  })

  it('applyRemoteSpreadsheetFeatureOperation cancels freeze without re-emitting a local mutation', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    const onMutationBatchOp = jest.fn()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(lastCancelFreezeMock).toBeDefined())
    lastCancelFreezeMock?.mockImplementation(() => {
      eventHandlers.CommandExecuted?.({
        type: 0,
        id: 'sheet.command.cancel-frozen',
        params: {}
      })
    })
    lastCancelFreezeMock?.mockClear()

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'freeze_panes',
        data: {
          sheetId: 'sheet-1',
          cleared: true
        }
      })
    })

    expect(lastCancelFreezeMock).toHaveBeenCalledTimes(1)
    expect(onMutationBatchOp).not.toHaveBeenCalled()
  })

  it('applyRemoteSpreadsheetFeatureOperation normalizes explicit zero first-column freeze state', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(lastSetFreezeMock).toBeDefined())
    executeCommandMock?.mockClear()
    lastSetFreezeMock?.mockClear()

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'freeze_panes',
        data: {
          sheetId: 'sheet-1',
          commandId: 'sheet.command.set-col-frozen',
          startRow: -1,
          startColumn: 0,
          ySplit: 0,
          xSplit: 0
        }
      })
    })

    expect(lastSetFreezeMock).toHaveBeenCalledWith({
      startRow: -1,
      startColumn: 1,
      ySplit: 0,
      xSplit: 1
    })
    expect(executeCommandMock).not.toHaveBeenCalled()
  })

  it('does not re-emit remote visibility replay as a local mutation', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    const onMutationBatchOp = jest.fn()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly={false}
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
        onMutationBatchOp={onMutationBatchOp}
      />
    )
    await waitFor(() => expect(ref.current?.applyRemoteSpreadsheetFeatureOperation).toBeDefined())
    await waitFor(() => expect(executeCommandMock).toBeDefined())
    executeCommandMock?.mockImplementation((commandId: string, params: unknown) => {
      eventHandlers.CommandExecuted?.({
        type: 2,
        id: commandId,
        params
      })
    })

    act(() => {
      ref.current?.applyRemoteSpreadsheetFeatureOperation?.({
        type: 'visibility_update',
        data: {
          sheetId: 'sheet-1',
          axis: 'row',
          hidden: true,
          ranges: [{ start: 0, end: 0 }]
        }
      })
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
  })
})
