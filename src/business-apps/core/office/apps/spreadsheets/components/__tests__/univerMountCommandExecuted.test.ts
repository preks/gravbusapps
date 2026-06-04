import { registerUniverMountCommandExecuted } from '../univerMountCommandExecuted'
import { peekSpreadsheetAutofillIntent } from '../univerAutofillIntent'
import { peekDimensionUserIntent } from '../univerDimensionUserIntent'

function createCommandExecutedHarness() {
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
        multiSheetWorkbookMode: false
      }
    } as never,
    callbacksRef: { current: {} } as never,
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
    cutPasteCollabSuppressUntilMsRef: { current: 0 },
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
    handleDetectedCellMutation: jest.fn(),
    updateCellDimensions,
    toCellDimensionsPayload: jest.fn(),
    markDirtyAndScheduleSnapshot
  })

  return {
    commandExecutedHandler,
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
})
