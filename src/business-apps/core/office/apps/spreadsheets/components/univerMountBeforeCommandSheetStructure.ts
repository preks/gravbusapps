import { createUniver } from '@univerjs/presets'
import { UNIVER_NATIVE_SHEET_STRUCTURE_COMMANDS } from '../utils/nativeSheetStructureIntent'
import { proposeDuplicateSheetDisplayName } from '../utils/workbookStructureFormatting'
import { isFormattingOverwritingPasteCommand } from './univerGridWorkbookMutationModule'
import {
  ensureInsertSheetPayloadHasUuid,
  generateUniverSheetUuid,
  rewriteWorksheetIdReferencesInParams,
  SHEET_PAYLOAD_UUID_REGEX
} from './univerMountSheetInsertPayloadUuid'
import type { FormattingPasteIntentSource, UniverGridController } from './useUniverGridController'

export type RegisterUniverMountBeforeCommandSheetStructureDeps = Pick<
  UniverGridController,
  'rewrittenWorksheetIdsRef' | 'propsRef' | 'callbacksRef' | 'readOnlyRef' | 'recentSheetMutationIdsRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  insertSheetSourceIds: Map<string, string>
  latestNativeSheetCopySourceIdRef: { current: string | null }
  markFormattingPasteIntent: (source?: FormattingPasteIntentSource) => void
  getActiveWorksheetIdFromUniver: () => string | null
}

export type RegisterUniverMountBeforeCommandSheetStructureHandles = {
  beforeCommandDisposable: { dispose(): void } | undefined
}

/**
 * BeforeCommandExecute: UUID injection for insert-sheet, worksheet id rewrites,
 * and api-first native sheet structure intents (insert/copy/delete/rename).
 */
export function registerUniverMountBeforeCommandSheetStructure(
  deps: RegisterUniverMountBeforeCommandSheetStructureDeps
): RegisterUniverMountBeforeCommandSheetStructureHandles {
  const {
    univerAPI,
    rewrittenWorksheetIdsRef,
    propsRef,
    callbacksRef,
    readOnlyRef,
    recentSheetMutationIdsRef,
    insertSheetSourceIds,
    latestNativeSheetCopySourceIdRef,
    markFormattingPasteIntent,
    getActiveWorksheetIdFromUniver
  } = deps

  rewrittenWorksheetIdsRef.current.clear()

  const beforeCommandEventKey =
    (univerAPI as { Event?: { BeforeCommandExecute?: string } }).Event?.BeforeCommandExecute ?? 'BeforeCommandExecute'

  const resolveFacadeWorkbook = () =>
    (
      univerAPI as {
        getActiveWorkbook?: () =>
          | {
              getSheets?: () => Array<{
                getName?: () => string
                getSheetId?: () => string
                getMaxColumns?: () => number
                getMaxRows?: () => number
              }>
              getSheetBySheetId?: (id: string) => { getName?: () => string } | null | undefined
              setActiveSheet?: (idOrSheet: string) => unknown
            }
          | null
          | undefined
      }
    ).getActiveWorkbook?.()

  const beforeCommandDisposable = (
    univerAPI as {
      addEvent?(
        event: string,
        cb: (p: { id?: string; params?: unknown; cancel?: boolean }) => void
      ): { dispose(): void }
    }
  ).addEvent?.(beforeCommandEventKey, event => {
    const commandId = String(event?.id ?? '').toLowerCase()
    rewriteWorksheetIdReferencesInParams(rewrittenWorksheetIdsRef, event?.params)
    if (isFormattingOverwritingPasteCommand(commandId)) {
      markFormattingPasteIntent('command')
    }
    if (commandId.includes('copy') && !commandId.includes('paste')) {
      latestNativeSheetCopySourceIdRef.current = getActiveWorksheetIdFromUniver()
    }
    if (commandId === 'sheet.mutation.insert-sheet') {
      const sourceSheetId = getActiveWorksheetIdFromUniver()
      const insertedSheetId = ensureInsertSheetPayloadHasUuid(rewrittenWorksheetIdsRef, event?.params)
      if (insertedSheetId && sourceSheetId && sourceSheetId !== insertedSheetId) {
        insertSheetSourceIds.set(insertedSheetId, sourceSheetId)
      }
      return
    }

    const apiFirstStructural =
      propsRef.current.apiFirstSheetStructure !== false &&
      propsRef.current.multiSheetWorkbookMode &&
      !readOnlyRef.current &&
      typeof callbacksRef.current.onNativeSheetStructureIntent === 'function'

    const insertCmd = UNIVER_NATIVE_SHEET_STRUCTURE_COMMANDS.INSERT_SHEET.toLowerCase()
    const copyCmd = UNIVER_NATIVE_SHEET_STRUCTURE_COMMANDS.COPY_SHEET.toLowerCase()
    const removeCmd = UNIVER_NATIVE_SHEET_STRUCTURE_COMMANDS.REMOVE_SHEET.toLowerCase()
    const renameCmd = UNIVER_NATIVE_SHEET_STRUCTURE_COMMANDS.SET_WORKSHEET_NAME.toLowerCase()

    if (apiFirstStructural && commandId === copyCmd) {
      const p = event.params as { subUnitId?: string } | undefined
      const sourceSheetId = typeof p?.subUnitId === 'string' ? p.subUnitId : ''
      if (!sourceSheetId) return
      event.cancel = true
      const workbook = resolveFacadeWorkbook()
      const sheets = workbook?.getSheets?.() ?? []
      const takenNames = new Set(
        sheets.map(s => (typeof s?.getName === 'function' ? String(s.getName()).trim() : '')).filter(Boolean)
      )
      const sourceWs = workbook?.getSheetBySheetId?.(sourceSheetId)
      const sourceName = sourceWs && typeof sourceWs.getName === 'function' ? String(sourceWs.getName()) : 'Sheet'
      const dupName = proposeDuplicateSheetDisplayName(sourceName, takenNames)
      const targetSheetId = generateUniverSheetUuid()
      const srcIdx = sheets.findIndex(entry => {
        const gid = (entry as { getSheetId?: () => string }).getSheetId
        return typeof gid === 'function' && gid.call(entry) === sourceSheetId
      })
      const index = srcIdx >= 0 ? srcIdx + 1 : sheets.length
      callbacksRef.current.onNativeSheetStructureIntent?.({
        type: 'duplicate',
        sourceSheetId,
        targetSheetId,
        sheetName: dupName,
        index
      })
      return
    }

    if (apiFirstStructural && commandId === removeCmd) {
      const p = event.params as { subUnitId?: string } | undefined
      const sheetId = typeof p?.subUnitId === 'string' ? p.subUnitId : ''
      const programmaticRm = sheetId && recentSheetMutationIdsRef.current.has(`rm:${sheetId}`)
      if (!programmaticRm && sheetId) {
        event.cancel = true
        callbacksRef.current.onNativeSheetStructureIntent?.({ type: 'delete', sheetId })
      }
      return
    }

    if (apiFirstStructural && commandId === renameCmd) {
      const p = event.params as { subUnitId?: string; name?: string } | undefined
      const trimmedName = typeof p?.name === 'string' ? p.name.trim() : ''
      const sheetId = typeof p?.subUnitId === 'string' ? p.subUnitId : ''
      const rnKey = sheetId && trimmedName ? `rn:${sheetId}:${trimmedName}` : ''
      const programmaticRn = Boolean(rnKey && recentSheetMutationIdsRef.current.has(rnKey))
      if (!programmaticRn && sheetId && trimmedName) {
        event.cancel = true
        callbacksRef.current.onNativeSheetStructureIntent?.({
          type: 'rename',
          sheetId,
          sheetName: trimmedName
        })
      }
      return
    }

    if (commandId !== insertCmd) return

    const params = event.params as
      | { unitId?: string; index?: number; sheet?: { id?: unknown; name?: unknown } }
      | undefined
    const pendingSheetId = params?.sheet && typeof params.sheet.id === 'string' ? params.sheet.id.trim() : ''
    const programmaticInsert = Boolean(pendingSheetId && recentSheetMutationIdsRef.current.has(`ins:${pendingSheetId}`))

    if (apiFirstStructural && !programmaticInsert) {
      event.cancel = true
      const workbook = resolveFacadeWorkbook()
      const existingSheets = workbook?.getSheets?.() ?? []
      const existingNames = new Set(
        existingSheets.map(s => (typeof s?.getName === 'function' ? String(s.getName()).trim() : '')).filter(Boolean)
      )
      let candidate = existingSheets.length + 1
      let nextName = `Sheet${candidate}`
      while (existingNames.has(nextName)) {
        candidate += 1
        nextName = `Sheet${candidate}`
      }
      let sheetId = generateUniverSheetUuid()
      if (pendingSheetId && SHEET_PAYLOAD_UUID_REGEX.test(pendingSheetId)) {
        sheetId = pendingSheetId
      }
      if (params?.sheet && typeof params.sheet.name === 'string' && params.sheet.name.trim()) {
        nextName = params.sheet.name.trim()
      }
      let index = existingSheets.length
      if (params?.index != null && Number.isFinite(params.index)) {
        index = Math.max(0, Math.trunc(params.index))
      }
      callbacksRef.current.onNativeSheetStructureIntent?.({
        type: 'insert',
        sheetId,
        sheetName: nextName,
        index
      })
      return
    }

    const legacyNewId = generateUniverSheetUuid()
    if (!params) {
      event.cancel = true
      const workbook = resolveFacadeWorkbook()
      const existingSheets = workbook?.getSheets?.() ?? []
      const existingNames = new Set(
        existingSheets.map(s => (typeof s?.getName === 'function' ? s.getName() : '')).filter(Boolean)
      )
      let candidate = existingSheets.length + 1
      let nextName = `Sheet${candidate}`
      while (existingNames.has(nextName)) {
        candidate += 1
        nextName = `Sheet${candidate}`
      }
      const referenceSheet = existingSheets[0]
      const referenceColumnCount =
        typeof referenceSheet?.getMaxColumns === 'function' ? referenceSheet.getMaxColumns() : 0
      const referenceRowCount = typeof referenceSheet?.getMaxRows === 'function' ? referenceSheet.getMaxRows() : 0
      const newColumnCount = Math.max(referenceColumnCount, 26)
      const newRowCount = Math.max(referenceRowCount, 1000)
      const rerun = (univerAPI as { executeCommand?: (id: string, p: unknown) => unknown }).executeCommand
      if (typeof rerun === 'function') {
        queueMicrotask(() => {
          try {
            rerun.call(univerAPI, 'sheet.command.insert-sheet', {
              index: existingSheets.length,
              sheet: {
                id: legacyNewId,
                name: nextName,
                columnCount: newColumnCount,
                rowCount: newRowCount
              }
            })
            workbook?.setActiveSheet?.(legacyNewId)
          } catch (err) {
            console.warn('[UniverSheetGrid] failed to re-dispatch insert-sheet with UUID', err)
          }
        })
      }
      return
    }
    ensureInsertSheetPayloadHasUuid(rewrittenWorksheetIdsRef, params)
  })

  return { beforeCommandDisposable }
}
