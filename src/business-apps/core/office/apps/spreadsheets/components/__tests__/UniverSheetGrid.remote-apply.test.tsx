import './setupUniverSheetGridTestMocks'
import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import type { UniverSheetGridHandle } from '../UniverSheetGrid.types'
import {
  executeCommandMock,
  eventHandlers,
  lastCancelFreezeMock,
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

  it('applyRemoteCellUpdatesBulk uses serial path for a single-cell batch', async () => {
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
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(lastRangeSetValueMock?.mock.calls.length).toBeGreaterThanOrEqual(1)
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
