import { registerUniverMountCommandExecuted } from '../univerMountCommandExecuted'
import { peekSpreadsheetAutofillIntent } from '../univerAutofillIntent'
import { peekDimensionUserIntent } from '../univerDimensionUserIntent'

function createCommandExecutedHarness(
  callbacks: Record<string, unknown> = {},
  propsOverrides: Record<string, unknown> = {}
) {
  let commandExecutedHandler:
    | ((event: { type?: number; id?: string; commandId?: string; params?: unknown }) => void)
    | undefined

  const pendingAutofillIntentRef = {
    current: null as import('../univerAutofillIntent').SpreadsheetAutofillIntent | null
  }
  const pendingDimensionUserIntentRef = {
    current: null as import('../univerDimensionUserIntent').SpreadsheetDimensionUserIntent | null
  }
  const updateCellDimensions = jest.fn(() => ({ changed: false, dimensions: null, sheetId: 'sheet-1' }))
  const markDirtyAndScheduleSnapshot = jest.fn()
  const handleDetectedCellMutation = jest.fn()
  const cutPasteCollabSuppressUntilMsRef = { current: 0 }
  const recentMoveCellRangeFollowUpRef = { current: null }
  const rowInsertFormulaFollowUpSuppressUntilMsRef = { current: 0 }
  const recentInsertRowFormulaFollowUpRef = { current: null }
  const rowDeleteFormulaFollowUpSuppressUntilMsRef = { current: 0 }
  const recentDeleteRowFormulaFollowUpRef = { current: null }
  const rowMoveFormulaFollowUpSuppressUntilMsRef = { current: 0 }
  const recentMoveRowFormulaFollowUpRef = { current: null }
  const columnInsertFormulaFollowUpSuppressUntilMsRef = { current: 0 }
  const recentInsertColumnFormulaFollowUpRef = { current: null }
  const columnDeleteFormulaFollowUpSuppressUntilMsRef = { current: 0 }
  const recentDeleteColumnFormulaFollowUpRef = { current: null }
  const columnMoveFormulaFollowUpSuppressUntilMsRef = { current: 0 }
  const recentMoveColumnFormulaFollowUpRef = { current: null }
  const recentNativeColumnMoveEmitRef = { current: null }

  registerUniverMountCommandExecuted({
    univerAPI: {
      Event: { CommandExecuted: 'CommandExecuted' },
      addEvent: (
        _event: string,
        cb: (event: { type?: number; id?: string; commandId?: string; params?: unknown }) => void
      ) => {
        commandExecutedHandler = cb
        return { dispose() {} }
      }
    } as never,
    univerAPIRef: { current: null },
    propsRef: {
      current: {
        sheet: { id: 'sheet-1' },
        apiFirstSheetStructure: true,
        multiSheetWorkbookMode: false,
        ...propsOverrides
      }
    } as never,
    callbacksRef: { current: callbacks } as never,
    readOnlyRef: { current: false },
    recentSheetMutationIdsRef: { current: new Set<string>() },
    univerBootstrapCompleteRef: { current: false },
    isApplyingRemoteUpdateRef: { current: false },
    collabPersistedBulkApplyDepthRef: { current: 0 },
    lastFeatureEmitAtBySignatureRef: { current: new Map() },
    pendingFreezeClearEmitTimeoutBySheetRef: { current: new Map() },
    lastClearAllEmitAtBySignatureRef: { current: new Map() },
    lastClearFormatEmitAtBySignatureRef: { current: new Map() },
    lastCellValueMutationAtRef: { current: 0 },
    pendingCutCellRangeRef: { current: null },
    cutPasteCollabSuppressUntilMsRef,
    recentMoveCellRangeFollowUpRef,
    rowInsertFormulaFollowUpSuppressUntilMsRef,
    recentInsertRowFormulaFollowUpRef,
    rowDeleteFormulaFollowUpSuppressUntilMsRef,
    recentDeleteRowFormulaFollowUpRef,
    rowMoveFormulaFollowUpSuppressUntilMsRef,
    recentMoveRowFormulaFollowUpRef,
    columnInsertFormulaFollowUpSuppressUntilMsRef,
    recentInsertColumnFormulaFollowUpRef,
    columnDeleteFormulaFollowUpSuppressUntilMsRef,
    recentDeleteColumnFormulaFollowUpRef,
    columnMoveFormulaFollowUpSuppressUntilMsRef,
    recentMoveColumnFormulaFollowUpRef,
    recentNativeColumnMoveEmitRef,
    mergeGestureSuppressBySheetRef: { current: new Map() },
    pendingAutofillIntentRef,
    pendingDimensionUserIntentRef,
    insertSheetSourceIds: new Map(),
    latestNativeSheetCopySourceIdRef: { current: null },
    getActiveWorksheetIdFromUniver: () => 'sheet-1',
    captureCopiedSelectionAnchor: jest.fn(),
    emitWorksheetFromUniver: jest.fn(),
    detectUnreportedInsertedWorksheets: jest.fn(),
    emitInsertedWorksheet: jest.fn(),
    handleDetectedCellMutation,
    updateCellDimensions,
    toCellDimensionsPayload: jest.fn(),
    markDirtyAndScheduleSnapshot
  })

  return {
    commandExecutedHandler,
    cutPasteCollabSuppressUntilMsRef,
    recentMoveCellRangeFollowUpRef,
    rowInsertFormulaFollowUpSuppressUntilMsRef,
    recentInsertRowFormulaFollowUpRef,
    rowDeleteFormulaFollowUpSuppressUntilMsRef,
    recentDeleteRowFormulaFollowUpRef,
    rowMoveFormulaFollowUpSuppressUntilMsRef,
    recentMoveRowFormulaFollowUpRef,
    columnInsertFormulaFollowUpSuppressUntilMsRef,
    recentInsertColumnFormulaFollowUpRef,
    columnDeleteFormulaFollowUpSuppressUntilMsRef,
    recentDeleteColumnFormulaFollowUpRef,
    columnMoveFormulaFollowUpSuppressUntilMsRef,
    recentMoveColumnFormulaFollowUpRef,
    recentNativeColumnMoveEmitRef,
    handleDetectedCellMutation,
    pendingAutofillIntentRef,
    pendingDimensionUserIntentRef,
    updateCellDimensions,
    markDirtyAndScheduleSnapshot
  }
}

describe('registerUniverMountCommandExecuted', () => {
  it('marks autofill intent from CommandExecuted as a fallback', () => {
    const { commandExecutedHandler, pendingAutofillIntentRef } = createCommandExecutedHarness()

    expect(commandExecutedHandler).toBeDefined()
    commandExecutedHandler?.({
      id: 'sheet.command.auto-fill',
      params: {
        subUnitId: 'sheet-1',
        applyType: 'COPY',
        sourceRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
        targetRange: { startRow: 1, endRow: 2, startColumn: 0, endColumn: 0 }
      }
    })

    expect(
      peekSpreadsheetAutofillIntent(pendingAutofillIntentRef, 'sheet-1', {
        ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }]
      })
    ).toBe('COPY')
  })

  it('skips dimension snapshots for autofill-triggered row auto-height mutations', () => {
    jest.useFakeTimers()
    const { commandExecutedHandler, updateCellDimensions } = createCommandExecutedHarness()

    commandExecutedHandler?.({
      id: 'sheet.command.auto-fill',
      params: {
        subUnitId: 'sheet-1',
        applyType: 'COPY',
        targetRange: { startRow: 3, endRow: 5, startColumn: 0, endColumn: 0 }
      }
    })

    commandExecutedHandler?.({
      id: 'sheet.mutation.set-worksheet-row-auto-height',
      type: 2,
      params: {
        subUnitId: 'sheet-1',
        range: { startRow: 4, endRow: 4, startColumn: 0, endColumn: 0 }
      }
    })

    jest.advanceTimersByTime(200)
    expect(updateCellDimensions).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('defers auto-fit snapshots and consumes dimension intent on the mutation path', () => {
    jest.useFakeTimers()
    const { commandExecutedHandler, pendingDimensionUserIntentRef, updateCellDimensions } =
      createCommandExecutedHarness()

    commandExecutedHandler?.({
      id: 'sheet.command.set-row-is-auto-height',
      params: {
        subUnitId: 'sheet-1'
      }
    })

    expect(peekDimensionUserIntent(pendingDimensionUserIntentRef, 'sheet-1', 'row')).toBe('row')
    expect(updateCellDimensions).not.toHaveBeenCalled()

    commandExecutedHandler?.({
      id: 'sheet.mutation.set-worksheet-row-auto-height',
      type: 2,
      params: {
        subUnitId: 'sheet-1'
      }
    })

    expect(peekDimensionUserIntent(pendingDimensionUserIntentRef, 'sheet-1', 'row')).toBeNull()
    jest.advanceTimersByTime(79)
    expect(updateCellDimensions).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(updateCellDimensions).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('retries deferred auto-fit snapshots when the first read sees no dimension change yet', () => {
    jest.useFakeTimers()
    const { commandExecutedHandler, updateCellDimensions } = createCommandExecutedHarness()

    commandExecutedHandler?.({
      id: 'sheet.command.set-row-is-auto-height',
      params: {
        subUnitId: 'sheet-1'
      }
    })

    jest.advanceTimersByTime(80)
    expect(updateCellDimensions).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(80)
    expect(updateCellDimensions).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })

  it('arms follow-up suppression for native move-range and drops derived multi-cell set-range-values', () => {
    const onCellRangeMove = jest.fn()
    const { commandExecutedHandler, cutPasteCollabSuppressUntilMsRef, handleDetectedCellMutation } =
      createCommandExecutedHarness({ onCellRangeMove })

    expect(cutPasteCollabSuppressUntilMsRef.current).toBe(0)

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.move-range',
      params: {
        subUnitId: 'sheet-1',
        fromRange: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 },
        toRange: { startRow: 0, endRow: 1, startColumn: 1, endColumn: 1 }
      }
    })

    expect(onCellRangeMove).toHaveBeenCalledTimes(1)
    expect(cutPasteCollabSuppressUntilMsRef.current).toBeGreaterThan(Date.now())

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.set-range-values',
      params: {
        subUnitId: 'sheet-1',
        cellValue: {
          0: { 1: { v: 'A1 moved' } },
          1: { 1: { v: 'A2 moved' } }
        },
        range: [{ startRow: 0, endRow: 1, startColumn: 1, endColumn: 1 }]
      }
    })

    expect(handleDetectedCellMutation).not.toHaveBeenCalled()
  })

  it('still persists a plain single-cell set-range-values edit during the suppression window', () => {
    const { commandExecutedHandler, cutPasteCollabSuppressUntilMsRef, handleDetectedCellMutation } =
      createCommandExecutedHarness()

    cutPasteCollabSuppressUntilMsRef.current = Date.now() + 1_000

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.set-range-values',
      params: {
        subUnitId: 'sheet-1',
        cellValue: {
          0: { 0: { v: 'typed right after move' } }
        },
        range: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }]
      }
    })

    expect(handleDetectedCellMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'command-executed',
        commandId: 'sheet.mutation.set-range-values'
      })
    )
  })

  it('routes native row insert mutations through onRowsInsert', () => {
    const onRowsInsert = jest.fn()
    const { commandExecutedHandler, rowInsertFormulaFollowUpSuppressUntilMsRef, recentInsertRowFormulaFollowUpRef } =
      createCommandExecutedHarness({ onRowsInsert })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.insert-row',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 3, endRow: 3, startColumn: 0, endColumn: 0 }]
      }
    })

    expect(onRowsInsert).toHaveBeenCalledWith(3, 1, 'lefttop')
    expect(rowInsertFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentInsertRowFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 3,
          endRow: 4,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    })
  })

  it('arms row-delete follow-up suppression while routing native row delete through onRowsDelete', () => {
    const onRowsDelete = jest.fn()
    const { commandExecutedHandler, rowDeleteFormulaFollowUpSuppressUntilMsRef, recentDeleteRowFormulaFollowUpRef } =
      createCommandExecutedHarness({ onRowsDelete })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-rows',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 4, endRow: 5, startColumn: 0, endColumn: 0 }]
      }
    })

    expect(onRowsDelete).toHaveBeenCalledWith(4, 2)
    expect(rowDeleteFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentDeleteRowFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 4,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    })
  })

  it('arms row-move follow-up suppression while routing native row move through onRowsMove', () => {
    const onRowsMove = jest.fn()
    const { commandExecutedHandler, rowMoveFormulaFollowUpSuppressUntilMsRef, recentMoveRowFormulaFollowUpRef } =
      createCommandExecutedHarness({ onRowsMove })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.move-rows',
      params: {
        subUnitId: 'sheet-1',
        fromRange: { startRow: 2, endRow: 3, startColumn: 0, endColumn: 0 },
        toRange: { startRow: 6, endRow: 7, startColumn: 0, endColumn: 0 }
      }
    })

    expect(onRowsMove).toHaveBeenCalledWith(2, 2, 6)
    expect(rowMoveFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentMoveRowFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 2,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        },
        {
          startRow: 2,
          endRow: 3,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        },
        {
          startRow: 6,
          endRow: 7,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    })
  })

  it('arms column-insert follow-up suppression while routing native column insert through onColumnsInsert', () => {
    const onColumnsInsert = jest.fn()
    const {
      commandExecutedHandler,
      columnInsertFormulaFollowUpSuppressUntilMsRef,
      recentInsertColumnFormulaFollowUpRef
    } = createCommandExecutedHarness({ onColumnsInsert })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.insert-col',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 2 }]
      }
    })

    expect(onColumnsInsert).toHaveBeenCalledWith(2, 1, 'lefttop')
    expect(columnInsertFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentInsertColumnFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 2,
          endColumn: 3
        }
      ]
    })
  })

  it('arms column-delete follow-up suppression while routing native column delete through onColumnsDelete', () => {
    const onColumnsDelete = jest.fn()
    const {
      commandExecutedHandler,
      columnDeleteFormulaFollowUpSuppressUntilMsRef,
      recentDeleteColumnFormulaFollowUpRef
    } = createCommandExecutedHarness({ onColumnsDelete })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-col',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }]
      }
    })

    expect(onColumnsDelete).toHaveBeenCalledWith(1, 1)
    expect(columnDeleteFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentDeleteColumnFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    })
  })

  it('deduplicates repeated native column delete commands for the same range', () => {
    const onColumnsDelete = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness({ onColumnsDelete })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-col',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }]
      }
    })
    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-col',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }]
      }
    })

    expect(onColumnsDelete).toHaveBeenCalledTimes(1)
    expect(onColumnsDelete).toHaveBeenCalledWith(1, 1)
  })

  it('arms column-move follow-up suppression while routing native column move through onColumnsMove', () => {
    const onColumnsMove = jest.fn()
    const { commandExecutedHandler, columnMoveFormulaFollowUpSuppressUntilMsRef, recentMoveColumnFormulaFollowUpRef } =
      createCommandExecutedHarness({ onColumnsMove })

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.move-cols',
      params: {
        subUnitId: 'sheet-1',
        fromRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 },
        toRange: { startRow: 0, endRow: 0, startColumn: 4, endColumn: 5 }
      }
    })

    expect(onColumnsMove).toHaveBeenCalledWith(1, 2, 4)
    expect(columnMoveFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentMoveColumnFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        },
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: 2
        },
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 4,
          endColumn: 5
        }
      ]
    })
  })

  it('routes command-style native column move events through onColumnsMove', () => {
    const onColumnsMove = jest.fn()
    const { commandExecutedHandler, columnMoveFormulaFollowUpSuppressUntilMsRef, recentMoveColumnFormulaFollowUpRef } =
      createCommandExecutedHarness({ onColumnsMove })

    commandExecutedHandler?.({
      type: 0,
      id: 'sheet.command.move-cols',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }],
        targetRange: { startRow: 0, endRow: 0, startColumn: 4, endColumn: 5 }
      }
    })

    expect(onColumnsMove).toHaveBeenCalledWith(1, 2, 4)
    expect(columnMoveFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentMoveColumnFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        },
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: 2
        },
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 4,
          endColumn: 5
        }
      ]
    })
  })

  it('routes native column move events through onColumnsMove even when Univer omits the command type', () => {
    const onColumnsMove = jest.fn()
    const { commandExecutedHandler, columnMoveFormulaFollowUpSuppressUntilMsRef, recentMoveColumnFormulaFollowUpRef } =
      createCommandExecutedHarness({ onColumnsMove })

    commandExecutedHandler?.({
      id: 'sheet.command.move-cols',
      params: {
        subUnitId: 'sheet-1',
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }],
        targetRange: { startRow: 0, endRow: 0, startColumn: 4, endColumn: 5 }
      }
    })

    expect(onColumnsMove).toHaveBeenCalledWith(1, 2, 4)
    expect(columnMoveFormulaFollowUpSuppressUntilMsRef.current).toBeGreaterThan(Date.now())
    expect(recentMoveColumnFormulaFollowUpRef.current).toEqual({
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        },
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: 2
        },
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 4,
          endColumn: 5
        }
      ]
    })
  })

  it('suppresses move-derived merge mutation feature emits after a column move', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler, columnMoveFormulaFollowUpSuppressUntilMsRef, recentMoveColumnFormulaFollowUpRef } =
      createCommandExecutedHarness(
        {
          onDiagnosticsTraceEvent
        },
        {
          onMutationBatchOp
        }
      )

    columnMoveFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentMoveColumnFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 12, endRow: 16, startColumn: 4, endColumn: 4 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_move_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses delete-derived merge mutation feature emits after a column delete', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const {
      commandExecutedHandler,
      columnDeleteFormulaFollowUpSuppressUntilMsRef,
      recentDeleteColumnFormulaFollowUpRef
    } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    columnDeleteFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentDeleteColumnFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 12, endRow: 16, startColumn: 4, endColumn: 4 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses delete-derived unmerge feature emits after a column delete even for command events', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const {
      commandExecutedHandler,
      columnDeleteFormulaFollowUpSuppressUntilMsRef,
      recentDeleteColumnFormulaFollowUpRef
    } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    columnDeleteFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentDeleteColumnFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 0,
      id: 'sheet.command.remove-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 12, endRow: 16, startColumn: 4, endColumn: 4 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.command.remove-worksheet-merge',
          operationType: 'unmerge_ranges'
        })
      })
    )
  })

  it('suppresses delete-triggered unmerge feature emits from command trigger provenance without suppression timing', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        trigger: 'sheet.command.remove-col-by-range',
        ranges: [{ startRow: 6, endRow: 14, startColumn: 1, endColumn: 2 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.remove-worksheet-merge',
          operationType: 'unmerge_ranges'
        })
      })
    )
  })

  it('suppresses delete-triggered merge feature emits from command trigger provenance without suppression timing', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        trigger: 'sheet.command.remove-col',
        ranges: [{ startRow: 6, endRow: 14, startColumn: 1, endColumn: 1 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses delete-derived merge mutation feature emits after a row delete', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler, rowDeleteFormulaFollowUpSuppressUntilMsRef, recentDeleteRowFormulaFollowUpRef } =
      createCommandExecutedHarness(
        {
          onDiagnosticsTraceEvent
        },
        {
          onMutationBatchOp
        }
      )

    rowDeleteFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentDeleteRowFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 1,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 4, endRow: 4, startColumn: 2, endColumn: 6 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses delete-triggered unmerge feature emits from row-delete command trigger provenance without suppression timing', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        trigger: 'sheet.command.remove-row',
        ranges: [{ startRow: 6, endRow: 7, startColumn: 1, endColumn: 2 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.remove-worksheet-merge',
          operationType: 'unmerge_ranges'
        })
      })
    )
  })

  it('suppresses delete-triggered merge feature emits from row-delete command trigger provenance without suppression timing', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        trigger: 'sheet.command.remove-row-confirm',
        ranges: [{ startRow: 6, endRow: 6, startColumn: 1, endColumn: 2 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_delete_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses insert-derived merge mutation feature emits after a row insert', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler, rowInsertFormulaFollowUpSuppressUntilMsRef, recentInsertRowFormulaFollowUpRef } =
      createCommandExecutedHarness(
        {
          onDiagnosticsTraceEvent
        },
        {
          onMutationBatchOp
        }
      )

    rowInsertFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentInsertRowFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 3,
          endRow: 4,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 3, endRow: 4, startColumn: 2, endColumn: 5 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_insert_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses insert-triggered unmerge feature emits from column-insert command trigger provenance', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        trigger: 'sheet.command.insert-col',
        ranges: [{ startRow: 6, endRow: 8, startColumn: 3, endColumn: 4 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_insert_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.remove-worksheet-merge',
          operationType: 'unmerge_ranges'
        })
      })
    )
  })

  it('suppresses move-derived merge mutation feature emits after a row move', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler, rowMoveFormulaFollowUpSuppressUntilMsRef, recentMoveRowFormulaFollowUpRef } =
      createCommandExecutedHarness(
        {
          onDiagnosticsTraceEvent
        },
        {
          onMutationBatchOp
        }
      )

    rowMoveFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentMoveRowFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 4,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 0,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 5, endRow: 6, startColumn: 1, endColumn: 3 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_move_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.add-worksheet-merge',
          operationType: 'merge_ranges'
        })
      })
    )
  })

  it('suppresses move-triggered unmerge feature emits from column-move command trigger provenance', () => {
    const onMutationBatchOp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const { commandExecutedHandler } = createCommandExecutedHarness(
      {
        onDiagnosticsTraceEvent
      },
      {
        onMutationBatchOp
      }
    )

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.remove-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        trigger: 'sheet.command.move-cols',
        ranges: [{ startRow: 6, endRow: 8, startColumn: 3, endColumn: 4 }]
      }
    })

    expect(onMutationBatchOp).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'grid_feature_operation_suppressed_move_derived_merge',
        sheetId: 'sheet-1',
        payload: expect.objectContaining({
          commandId: 'sheet.mutation.remove-worksheet-merge',
          operationType: 'unmerge_ranges'
        })
      })
    )
  })

  it('keeps explicit merge commands emit-enabled after a column move', () => {
    const onMutationBatchOp = jest.fn()
    const { commandExecutedHandler, columnMoveFormulaFollowUpSuppressUntilMsRef, recentMoveColumnFormulaFollowUpRef } =
      createCommandExecutedHarness(
        {},
        {
          onMutationBatchOp
        }
      )

    columnMoveFormulaFollowUpSuppressUntilMsRef.current = Date.now() + 500
    recentMoveColumnFormulaFollowUpRef.current = {
      sheetId: 'sheet-1',
      followUpRanges: [
        {
          startRow: 0,
          endRow: Number.MAX_SAFE_INTEGER,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER
        }
      ]
    }

    commandExecutedHandler?.({
      type: 0,
      id: 'sheet.command.add-worksheet-merge',
      params: {
        subUnitId: 'sheet-1',
        ranges: [{ startRow: 12, endRow: 16, startColumn: 4, endColumn: 4 }]
      }
    })

    expect(onMutationBatchOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        operations: [
          expect.objectContaining({
            type: 'merge_ranges'
          })
        ]
      })
    )
  })

  it('filters move-echo cells but keeps outside formula updates during the suppression window', () => {
    const {
      commandExecutedHandler,
      cutPasteCollabSuppressUntilMsRef,
      recentMoveCellRangeFollowUpRef,
      handleDetectedCellMutation
    } = createCommandExecutedHarness()

    cutPasteCollabSuppressUntilMsRef.current = Date.now() + 1_000
    recentMoveCellRangeFollowUpRef.current = {
      sheetId: 'sheet-1',
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.set-range-values',
      params: {
        subUnitId: 'sheet-1',
        cellValue: {
          0: {
            1: { v: 'A1 moved' },
            5: { f: '=SUM(B1:B5)', v: 25 }
          }
        },
        range: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 5 }]
      }
    })

    expect(handleDetectedCellMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'command-executed',
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          0: {
            5: { f: '=SUM(B1:B5)', v: 25 }
          }
        },
        ranges: [{ startRow: 0, endRow: 0, startColumn: 5, endColumn: 5 }]
      })
    )
  })

  it('keeps single-cell formula recalculation repairs outside the moved range', () => {
    const {
      commandExecutedHandler,
      cutPasteCollabSuppressUntilMsRef,
      recentMoveCellRangeFollowUpRef,
      handleDetectedCellMutation
    } = createCommandExecutedHarness()

    cutPasteCollabSuppressUntilMsRef.current = Date.now() + 1_000
    recentMoveCellRangeFollowUpRef.current = {
      sheetId: 'sheet-1',
      fromRange: { startRow: 0, endRow: 4, startColumn: 6, endColumn: 6 },
      toRange: { startRow: 1, endRow: 5, startColumn: 6, endColumn: 6 }
    }

    commandExecutedHandler?.({
      type: 2,
      id: 'sheet.mutation.set-range-values',
      params: {
        subUnitId: 'sheet-1',
        cellValue: {
          8: {
            7: { f: '=SUM(G2:G6)', v: 25 }
          }
        },
        range: [{ startRow: 8, endRow: 8, startColumn: 7, endColumn: 7 }]
      }
    })

    expect(handleDetectedCellMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'command-executed',
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          8: {
            7: { f: '=SUM(G2:G6)', v: 25 }
          }
        },
        ranges: [{ startRow: 8, endRow: 8, startColumn: 7, endColumn: 7 }],
        worksheetId: 'sheet-1'
      })
    )
  })
})
