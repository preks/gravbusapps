import { registerUniverMountCommandExecuted } from '../univerMountCommandExecuted'
import { peekSpreadsheetAutofillIntent } from '../univerAutofillIntent'

describe('registerUniverMountCommandExecuted', () => {
  it('marks autofill intent from CommandExecuted as a fallback', () => {
    let commandExecutedHandler:
      | ((event: { type?: number; id?: string; commandId?: string; params?: unknown }) => void)
      | undefined

    const pendingAutofillIntentRef = {
      current: null as import('../univerAutofillIntent').SpreadsheetAutofillIntent | null
    }

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
      insertSheetSourceIds: new Map(),
      latestNativeSheetCopySourceIdRef: { current: null },
      getActiveWorksheetIdFromUniver: () => 'sheet-1',
      captureCopiedSelectionAnchor: jest.fn(),
      emitWorksheetFromUniver: jest.fn(),
      detectUnreportedInsertedWorksheets: jest.fn(),
      emitInsertedWorksheet: jest.fn(),
      handleDetectedCellMutation: jest.fn(),
      updateCellDimensions: () => ({ changed: false, dimensions: null }),
      toCellDimensionsPayload: jest.fn(),
      markDirtyAndScheduleSnapshot: jest.fn()
    })

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
})
