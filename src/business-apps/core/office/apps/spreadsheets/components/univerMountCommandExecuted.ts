import { createUniver } from '@univerjs/presets'
import {
  detectClearAllRangesFromCellMatrix,
  detectClearFormatRangesFromCellMatrix,
  normalizeCellMatrix,
  type SheetRangeShape
} from './cellMatrixUtils'
import {
  markSpreadsheetAutofillIntent,
  resolveAutofillApplyTypeFromCommandParams,
  resolveAutofillCommandRangesFromParams,
  UNIVER_AUTOFILL_COMMAND_ID,
  UNIVER_REFILL_COMMAND_ID
} from './univerAutofillIntent'
import { resolveClearAllRanges } from './univerGridRangeSelection'
import { UNIVER_COMMAND_TYPE_MUTATION } from './univerGridUniverConstants'
import { handleCommandExecutedColumnInsertsAndFeatureOps } from './univerMountCommandExecutedColumnsAndFeatures'
import { tryEmitGridClearRangeOpFromCommand } from './univerMountCommandTryEmitClearRangeOp'
import {
  isClearLikeMutationCommand,
  isImplicitClearLikeSetRangeMutation,
  isNativeColumnInsertCommand,
  isRegionReplaceStyleCollaborationCommand
} from './univerGridWorkbookMutationModule'
import {
  captureCutSelectionRange,
  isNativeCutPasteCommand,
  shouldSuppressCutPasteFollowUpCollab
} from '../utils/spreadsheetCutPasteMove'
import { getCommandKind } from './univerCommandClassification'
import {
  isClearAllRangeCommand,
  isClearFormatRangeCommand,
  isStyleOnlySheetMutationCommand,
  isUnsupportedSnapshotOnlyCollaborationCommand,
  shouldRunDimensionSnapshotForCommand,
  shouldScheduleSnapshotForMutation
} from './snapshotTriggerUtils'
import type { WorkbookSnapshotLifecycleOrigin } from './UniverSheetGrid.types'
import type { SnapshotDimensions } from './univerGridInternalTypes'
import type { UniverWorkbookBootstrapMountContext } from './univerWorkbookBootstrapMountContext'
import type { UniverGridController } from './useUniverGridController'
import { debugUniverDimensionSnapshot } from './univerGridDebug'

function normalizeWorksheetHidden(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return undefined
}

export type RegisterUniverMountCommandExecutedDeps = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'propsRef'
  | 'callbacksRef'
  | 'readOnlyRef'
  | 'recentSheetMutationIdsRef'
  | 'univerBootstrapCompleteRef'
  | 'isApplyingRemoteUpdateRef'
  | 'collabPersistedBulkApplyDepthRef'
  | 'lastFeatureEmitAtBySignatureRef'
  | 'pendingFreezeClearEmitTimeoutBySheetRef'
  | 'lastClearAllEmitAtBySignatureRef'
  | 'lastClearFormatEmitAtBySignatureRef'
  | 'lastCellValueMutationAtRef'
  | 'pendingCutCellRangeRef'
  | 'cutPasteCollabSuppressUntilMsRef'
  | 'mergeGestureSuppressBySheetRef'
  | 'pendingAutofillIntentRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  insertSheetSourceIds: Map<string, string>
  latestNativeSheetCopySourceIdRef: { current: string | null }
  getActiveWorksheetIdFromUniver: () => string | null
  captureCopiedSelectionAnchor: () => void
  emitWorksheetFromUniver: () => void
  detectUnreportedInsertedWorksheets: () => void
  emitInsertedWorksheet: (
    sheetId: string,
    payloadSheet: (Record<string, unknown> & { id?: string; name?: string }) | undefined,
    index: number,
    sourceSheetId: string | undefined
  ) => void
  handleDetectedCellMutation: (args: {
    source: 'command-executed'
    commandId?: string
    payloadCellValue: ReturnType<typeof normalizeCellMatrix>
    ranges: SheetRangeShape[]
    worksheetId?: string | null
    preserveUndefinedAsNull: boolean
  }) => boolean | Promise<boolean>
  updateCellDimensions: () => { changed: boolean; dimensions: SnapshotDimensions | null; sheetId: string | null }
  toCellDimensionsPayload: UniverWorkbookBootstrapMountContext['toCellDimensionsPayload']
  markDirtyAndScheduleSnapshot: (origin: WorkbookSnapshotLifecycleOrigin) => void
}

export type RegisterUniverMountCommandExecutedHandles = {
  commandDisposable: { dispose(): void } | undefined
}

export function registerUniverMountCommandExecuted(
  deps: RegisterUniverMountCommandExecutedDeps
): RegisterUniverMountCommandExecutedHandles {
  const {
    univerAPI,
    univerAPIRef,
    propsRef,
    callbacksRef,
    readOnlyRef,
    recentSheetMutationIdsRef,
    univerBootstrapCompleteRef,
    isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef,
    lastFeatureEmitAtBySignatureRef,
    pendingFreezeClearEmitTimeoutBySheetRef,
    lastClearAllEmitAtBySignatureRef,
    lastClearFormatEmitAtBySignatureRef,
    lastCellValueMutationAtRef,
    pendingCutCellRangeRef,
    cutPasteCollabSuppressUntilMsRef,
    mergeGestureSuppressBySheetRef,
    pendingAutofillIntentRef,
    insertSheetSourceIds,
    latestNativeSheetCopySourceIdRef,
    getActiveWorksheetIdFromUniver,
    captureCopiedSelectionAnchor,
    emitWorksheetFromUniver,
    detectUnreportedInsertedWorksheets,
    emitInsertedWorksheet,
    handleDetectedCellMutation,
    updateCellDimensions,
    toCellDimensionsPayload,
    markDirtyAndScheduleSnapshot
  } = deps

  const clearRangeEmitRefs = {
    propsRef,
    callbacksRef,
    lastClearAllEmitAtBySignatureRef,
    lastClearFormatEmitAtBySignatureRef
  }
  let pendingDimensionFrame: { cancel: () => void } | null = null
  let pendingDimensionCommandId = ''
  let pendingDimensionCommandType: number | undefined

  const cancelPendingDimensionFrame = () => {
    pendingDimensionFrame?.cancel()
    pendingDimensionFrame = null
  }

  const scheduleDimensionSnapshot = (sourceCommandId: string, sourceCommandType: number | undefined): void => {
    pendingDimensionCommandId = sourceCommandId
    pendingDimensionCommandType = sourceCommandType
    if (pendingDimensionFrame) {
      debugUniverDimensionSnapshot('coalesced', { commandId: sourceCommandId, commandType: sourceCommandType })
      return
    }
    debugUniverDimensionSnapshot('scheduled', { commandId: sourceCommandId, commandType: sourceCommandType })
    if (typeof globalThis.requestAnimationFrame === 'function') {
      const frameId = globalThis.requestAnimationFrame(() => {
        pendingDimensionFrame = null
        const commandIdForRun = pendingDimensionCommandId
        const commandTypeForRun = pendingDimensionCommandType
        debugUniverDimensionSnapshot('run', { commandId: commandIdForRun, commandType: commandTypeForRun })
        const { changed: dimensionsChanged, dimensions, sheetId } = updateCellDimensions()
        if (dimensionsChanged) {
          if (dimensions && sheetId) {
            callbacksRef.current.onDimensionsChange?.(toCellDimensionsPayload(dimensions, sheetId))
          }
          markDirtyAndScheduleSnapshot('workbook')
        }
      })
      pendingDimensionFrame = {
        cancel: () => globalThis.cancelAnimationFrame?.(frameId)
      }
      return
    }

    const timeoutId = globalThis.setTimeout(() => {
      pendingDimensionFrame = null
      const commandIdForRun = pendingDimensionCommandId
      const commandTypeForRun = pendingDimensionCommandType
      debugUniverDimensionSnapshot('run', { commandId: commandIdForRun, commandType: commandTypeForRun })
      const { changed: dimensionsChanged, dimensions, sheetId } = updateCellDimensions()
      if (dimensionsChanged) {
        if (dimensions && sheetId) {
          callbacksRef.current.onDimensionsChange?.(toCellDimensionsPayload(dimensions, sheetId))
        }
        markDirtyAndScheduleSnapshot('workbook')
      }
    }, 16)
    pendingDimensionFrame = {
      cancel: () => globalThis.clearTimeout(timeoutId)
    }
  }

  const commandEventKey =
    (univerAPI as { Event?: { CommandExecuted?: string } }).Event?.CommandExecuted ?? 'CommandExecuted'
  const rawCommandDisposable = (
    univerAPI as {
      addEvent?(
        event: string,
        cb: (p: { type?: number; id?: string; commandId?: string; params?: unknown }) => void
      ): { dispose(): void }
    }
  ).addEvent?.(commandEventKey, (event: { type?: number; id?: string; commandId?: string; params?: unknown }) => {
    const commandId = String(event?.id ?? event?.commandId ?? '').toLowerCase()
    const params = event?.params as
      | {
          cellValue?: unknown
          range?:
            | { startRow: number; endRow: number; startColumn: number; endColumn: number }
            | Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
          ranges?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
          sheetId?: string
          subUnitId?: string
          startColumn?: number
          endColumn?: number
          direction?: unknown
          insertDirection?: unknown
          type?: unknown
          applyType?: unknown
        }
      | undefined
    if (commandId === UNIVER_AUTOFILL_COMMAND_ID || commandId === UNIVER_REFILL_COMMAND_ID) {
      const autofillSheetId =
        (typeof params?.subUnitId === 'string' && params.subUnitId) ||
        (typeof params?.sheetId === 'string' && params.sheetId) ||
        getActiveWorksheetIdFromUniver() ||
        propsRef.current.sheet.id
      const { sourceRanges, targetRanges } = resolveAutofillCommandRangesFromParams(params)
      markSpreadsheetAutofillIntent(
        pendingAutofillIntentRef,
        autofillSheetId,
        resolveAutofillApplyTypeFromCommandParams(params),
        { sourceRanges, targetRanges }
      )
    }
    if (commandId.includes('copy') && !commandId.includes('paste')) {
      pendingCutCellRangeRef.current = null
      latestNativeSheetCopySourceIdRef.current =
        latestNativeSheetCopySourceIdRef.current ?? getActiveWorksheetIdFromUniver()
      captureCopiedSelectionAnchor()
    }
    if (commandId.includes('cut') && !commandId.includes('paste')) {
      const sheetId = getActiveWorksheetIdFromUniver() ?? propsRef.current.sheet.id
      const workbook = univerAPIRef.current?.getActiveWorkbook?.()
      if (workbook) {
        const pendingCut = captureCutSelectionRange(workbook, sheetId)
        if (pendingCut) {
          pendingCutCellRangeRef.current = pendingCut
        }
      }
    }
    if (commandId.includes('comment') || commandId.includes('thread')) {
      callbacksRef.current.onOpenCommentRequest?.()
    }
    queueMicrotask(() => {
      emitWorksheetFromUniver()
      if (
        propsRef.current.apiFirstSheetStructure === false &&
        (commandId.includes('sheet') || commandId.includes('copy'))
      ) {
        detectUnreportedInsertedWorksheets()
      }
    })

    if (
      univerBootstrapCompleteRef.current &&
      event?.type === UNIVER_COMMAND_TYPE_MUTATION &&
      (propsRef.current.apiFirstSheetStructure === false ||
        !propsRef.current.multiSheetWorkbookMode ||
        commandId === 'sheet.mutation.set-worksheet-hidden')
    ) {
      if (commandId === 'sheet.mutation.insert-sheet') {
        const p = event.params as
          | {
              index?: number
              sheet?: Record<string, unknown> & { id?: string; name?: string }
            }
          | undefined
        const sheetId = p?.sheet?.id
        if (sheetId && !recentSheetMutationIdsRef.current.has(`ins:${sheetId}`)) {
          const sourceSheetId = insertSheetSourceIds.get(sheetId)
          insertSheetSourceIds.delete(sheetId)
          emitInsertedWorksheet(sheetId, p?.sheet, p?.index ?? 0, sourceSheetId)
        }
      } else if (commandId === 'sheet.mutation.remove-sheet') {
        const p = event.params as { subUnitId?: string } | undefined
        const sheetId = p?.subUnitId
        if (sheetId && !recentSheetMutationIdsRef.current.has(`rm:${sheetId}`)) {
          recentSheetMutationIdsRef.current.add(`rm:${sheetId}`)
          callbacksRef.current.onUniverSheetRemoved?.({ sheetId })
        }
      } else if (commandId === 'sheet.mutation.set-worksheet-name') {
        const p = event.params as { subUnitId?: string; name?: string } | undefined
        const renameKey = p?.subUnitId && typeof p.name === 'string' ? `rn:${p.subUnitId}:${p.name.trim()}` : undefined
        if (renameKey && recentSheetMutationIdsRef.current.has(renameKey)) {
          recentSheetMutationIdsRef.current.add(renameKey)
        } else if (p?.subUnitId && typeof p.name === 'string') {
          callbacksRef.current.onUniverSheetRenamed?.({ sheetId: p.subUnitId, sheetName: p.name })
        }
      } else if (commandId === 'sheet.mutation.set-worksheet-hidden') {
        const p = event.params as { subUnitId?: string; hidden?: boolean | number } | undefined
        const hidden = normalizeWorksheetHidden(p?.hidden)
        const visibilityKey =
          p?.subUnitId && typeof hidden === 'boolean' ? `vis:${p.subUnitId}:${hidden ? 'hidden' : 'visible'}` : ''
        if (visibilityKey && recentSheetMutationIdsRef.current.has(visibilityKey)) {
          recentSheetMutationIdsRef.current.add(visibilityKey)
        } else if (p?.subUnitId && typeof hidden === 'boolean') {
          callbacksRef.current.onUniverSheetVisibilityChanged?.({ sheetId: p.subUnitId, hidden })
        }
      }
    }
    const t = event?.type
    const isColumnInsertMutationCommand = t === UNIVER_COMMAND_TYPE_MUTATION && isNativeColumnInsertCommand(commandId)

    if (readOnlyRef.current) {
      if (isColumnInsertMutationCommand) {
        callbacksRef.current.onDiagnosticsTraceEvent?.({
          source: 'client',
          stage: 'grid_column_insert_skipped_readonly',
          severity: 'info',
          sheetId: propsRef.current.sheet.id,
          payload: { commandId, commandType: t }
        })
      }
      return
    }
    if (isApplyingRemoteUpdateRef.current || collabPersistedBulkApplyDepthRef.current > 0) {
      if (isColumnInsertMutationCommand) {
        callbacksRef.current.onDiagnosticsTraceEvent?.({
          source: 'client',
          stage: 'grid_column_insert_skipped_remote_apply',
          severity: 'info',
          sheetId: propsRef.current.sheet.id,
          payload: {
            commandId,
            commandType: t,
            isApplyingRemoteUpdate: isApplyingRemoteUpdateRef.current,
            collabPersistedBulkApplyDepth: collabPersistedBulkApplyDepthRef.current
          }
        })
      }
      return
    }

    handleCommandExecutedColumnInsertsAndFeatureOps(
      {
        univerAPIRef,
        propsRef,
        callbacksRef,
        lastFeatureEmitAtBySignatureRef,
        pendingFreezeClearEmitTimeoutBySheetRef,
        pendingCutCellRangeRef,
        cutPasteCollabSuppressUntilMsRef,
        mergeGestureSuppressBySheetRef
      },
      { t, commandId, params }
    )

    const resolveClearOpTargetSheetId = (): string =>
      (typeof params?.subUnitId === 'string' && params.subUnitId) ||
      (typeof params?.sheetId === 'string' && params.sheetId) ||
      propsRef.current.sheet.id
    const suppressCutPasteFollowUpEarly = shouldSuppressCutPasteFollowUpCollab({
      suppressUntilMs: cutPasteCollabSuppressUntilMsRef.current,
      commandId,
      commandKind: getCommandKind(commandId),
      isRegionReplaceStyleCommand: isRegionReplaceStyleCollaborationCommand(commandId)
    })
    if (!suppressCutPasteFollowUpEarly && isClearAllRangeCommand(commandId)) {
      const clearAllRanges = resolveClearAllRanges(
        univerAPIRef.current?.getActiveWorkbook?.(),
        params as { ranges?: unknown[]; range?: unknown | unknown[] } | undefined
      )
      tryEmitGridClearRangeOpFromCommand(clearRangeEmitRefs, {
        kind: 'clear_all',
        ranges: clearAllRanges,
        targetSheetId: resolveClearOpTargetSheetId(),
        source: 'command-id',
        commandId
      })
    }
    if (!suppressCutPasteFollowUpEarly && isClearFormatRangeCommand(commandId)) {
      const clearFormatRanges = resolveClearAllRanges(
        univerAPIRef.current?.getActiveWorkbook?.(),
        params as { ranges?: unknown[]; range?: unknown | unknown[] } | undefined
      )
      tryEmitGridClearRangeOpFromCommand(clearRangeEmitRefs, {
        kind: 'clear_format',
        ranges: clearFormatRanges,
        targetSheetId: resolveClearOpTargetSheetId(),
        source: 'command-id',
        commandId
      })
    }
    const commandPayloadCellValue = normalizeCellMatrix(params?.cellValue)
    if (
      t === UNIVER_COMMAND_TYPE_MUTATION &&
      commandId === 'sheet.mutation.set-range-values' &&
      commandPayloadCellValue
    ) {
      const shapeClearAllRanges = detectClearAllRangesFromCellMatrix(commandPayloadCellValue)
      if (shapeClearAllRanges && shapeClearAllRanges.length > 0) {
        tryEmitGridClearRangeOpFromCommand(clearRangeEmitRefs, {
          kind: 'clear_all',
          ranges: shapeClearAllRanges,
          targetSheetId: resolveClearOpTargetSheetId(),
          source: 'cell-matrix-shape',
          commandId
        })
      }
      const shapeClearFormatRanges = detectClearFormatRangesFromCellMatrix(commandPayloadCellValue)
      if (shapeClearFormatRanges && shapeClearFormatRanges.length > 0) {
        tryEmitGridClearRangeOpFromCommand(clearRangeEmitRefs, {
          kind: 'clear_format',
          ranges: shapeClearFormatRanges,
          targetSheetId: resolveClearOpTargetSheetId(),
          source: 'cell-matrix-shape',
          commandId
        })
      }
    }
    const commandRanges = Array.isArray(params?.range) ? params.range : []
    const commandKind = getCommandKind(commandId)
    const suppressCutPasteFollowUp = shouldSuppressCutPasteFollowUpCollab({
      suppressUntilMs: cutPasteCollabSuppressUntilMsRef.current,
      commandId,
      commandKind,
      isRegionReplaceStyleCommand: isRegionReplaceStyleCollaborationCommand(commandId)
    })
    const commandPreserveUndefinedAsNull =
      commandKind === 'clearLike' ||
      isClearLikeMutationCommand(commandId) ||
      isImplicitClearLikeSetRangeMutation({
        commandId,
        ranges: commandRanges,
        payloadCellValue: commandPayloadCellValue
      })
    const didHandleCellMutation =
      !suppressCutPasteFollowUp &&
      t === UNIVER_COMMAND_TYPE_MUTATION &&
      (commandPayloadCellValue || commandRanges.length > 0) &&
      commandKind !== 'structuralRow' &&
      commandKind !== 'structuralColumn' &&
      commandKind !== 'cellRangeMove' &&
      commandKind !== 'freezePanes' &&
      !isStyleOnlySheetMutationCommand(commandId) &&
      !isNativeCutPasteCommand(commandId)
    if (didHandleCellMutation) {
      const result = handleDetectedCellMutation({
        source: 'command-executed',
        commandId,
        payloadCellValue: commandPayloadCellValue,
        ranges: commandRanges,
        worksheetId: params?.subUnitId ?? params?.sheetId ?? null,
        preserveUndefinedAsNull: commandPreserveUndefinedAsNull
      })
      if (result && typeof (result as Promise<boolean>).then === 'function') {
        void (result as Promise<boolean>).catch(() => {
          /* best-effort persist */
        })
      }
    }

    if (shouldRunDimensionSnapshotForCommand(commandId, t)) {
      scheduleDimensionSnapshot(commandId, t)
    }
    const isSupportedGranularStyleCommand =
      isStyleOnlySheetMutationCommand(commandId) && !isUnsupportedSnapshotOnlyCollaborationCommand(commandId)
    if (
      shouldScheduleSnapshotForMutation({
        commandType: t,
        mutationCommandType: UNIVER_COMMAND_TYPE_MUTATION,
        commandId,
        params,
        now: Date.now(),
        lastCellValueMutationAt: lastCellValueMutationAtRef.current
      }) &&
      !isSupportedGranularStyleCommand
    ) {
      markDirtyAndScheduleSnapshot(didHandleCellMutation ? 'cell' : 'workbook')
    }
  })

  const commandDisposable = rawCommandDisposable
    ? {
        dispose: () => {
          cancelPendingDimensionFrame()
          rawCommandDisposable.dispose()
        }
      }
    : undefined

  return { commandDisposable }
}
