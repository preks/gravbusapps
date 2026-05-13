import type React from 'react'

import type { SpreadsheetWorkbookStructureEvent } from '../core/SpreadsheetCollaborationContract'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import {
  shouldSkipRedundantStructuralWsEvent,
  type StructuralWsDedupToken
} from '../utils/spreadsheetStructuralWsDedup'

type ViewerRow = Record<string, unknown>

function normalizeSheetHidden(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return undefined
}

function normalizeSheetRecordHidden(sheet: Record<string, unknown> | undefined): boolean | undefined {
  const directHidden = normalizeSheetHidden(sheet?.hidden)
  if (directHidden !== undefined) return directHidden
  const settings = sheet?.settings
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return undefined
  return normalizeSheetHidden((settings as Record<string, unknown>).univerSheetHidden)
}

export interface CollaborationWorkbookStructureBridgeDeps {
  structuralWsDedupRef: React.MutableRefObject<StructuralWsDedupToken | null>
  peerSheetDataCacheRef: React.MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: React.MutableRefObject<Set<string>>
  appSheetsRef: React.MutableRefObject<SpreadsheetSheet[]>
  activeSheetIdRef: React.MutableRefObject<string>
  ensureRemoteSheetInLiveWorkbook: (sheet: Record<string, unknown> | undefined, insertIndex?: number) => void
  renameRemoteSheetInLiveWorkbook: (sheetId: string | undefined, nextName: string | undefined) => void
  removeRemoteSheetFromLiveWorkbook: (sheetId: string | undefined) => void
  setRemoteSheetVisibilityInLiveWorkbook: (
    sheetId: string | undefined,
    hidden: boolean | undefined,
    options?: { syncActiveSheet?: boolean }
  ) => void
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  mapPersistedRowsToViewerRows: (rows: unknown) => ViewerRow[]
  onAppRefreshNeeded?: (appId: string, sheetId?: string) => void | Promise<void>
  appId: string
  setActiveSheetId: (id: string) => void
}

export function createCollaborationWorkbookStructureHandler(
  deps: CollaborationWorkbookStructureBridgeDeps
): (event: SpreadsheetWorkbookStructureEvent) => void {
  const {
    structuralWsDedupRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    appSheetsRef,
    activeSheetIdRef,
    ensureRemoteSheetInLiveWorkbook,
    renameRemoteSheetInLiveWorkbook,
    removeRemoteSheetFromLiveWorkbook,
    setRemoteSheetVisibilityInLiveWorkbook,
    applyLocalAppUpdate,
    mapPersistedRowsToViewerRows,
    onAppRefreshNeeded,
    appId,
    setActiveSheetId
  } = deps

  return (event: SpreadsheetWorkbookStructureEvent) => {
    if (shouldSkipRedundantStructuralWsEvent(structuralWsDedupRef.current, event, Date.now())) {
      return
    }
    const sheetId = event.sheetId
    if (event.type === 'sheet_created') {
      const eventSheetRows = Array.isArray(event.sheet?.data)
        ? (event.sheet.data as ViewerRow[])
        : mapPersistedRowsToViewerRows(event.sheet?.rows)
      if (sheetId && eventSheetRows.length > 0) {
        peerSheetDataCacheRef.current.set(sheetId, eventSheetRows)
        authoritativePeerSheetDataCacheRef.current.add(sheetId)
      }
      // Defer workbook tab materialization until `onAppRefreshNeeded` has populated `app.sheets`
      // so we never show an editable orphan worksheet without React/session sheet context.
    } else if (event.type === 'sheet_renamed' || event.type === 'sheet_updated') {
      if (event.sheet?.worksheetSnapshot && typeof event.sheet.worksheetSnapshot === 'object') {
        ensureRemoteSheetInLiveWorkbook(event.sheet)
      }
      const nextName = event.sheet && typeof event.sheet.name === 'string' ? event.sheet.name : undefined
      renameRemoteSheetInLiveWorkbook(sheetId, nextName)
      const hidden = normalizeSheetRecordHidden(event.sheet)
      if (typeof hidden === 'boolean') {
        applyLocalAppUpdate(currentApp => ({
          ...currentApp,
          sheets: currentApp.sheets.map(sheet => (sheet.id === sheetId ? { ...sheet, hidden } : sheet))
        }))
        setRemoteSheetVisibilityInLiveWorkbook(sheetId, hidden, { syncActiveSheet: true })
      }
    } else if (event.type === 'sheet_deleted') {
      removeRemoteSheetFromLiveWorkbook(sheetId)
    }
    void (async () => {
      await onAppRefreshNeeded?.(appId, sheetId)
      if (event.type === 'sheet_created') {
        const refreshedSheet = sheetId ? appSheetsRef.current.find(sheet => sheet.id === sheetId) : undefined
        const refreshedIndex = appSheetsRef.current.findIndex(sheet => sheet.id === sheetId)
        const sheetForMaterialization =
          event.sheet?.worksheetSnapshot && typeof event.sheet.worksheetSnapshot === 'object'
            ? {
                ...refreshedSheet,
                ...event.sheet,
                data: Array.isArray(event.sheet.data) ? event.sheet.data : refreshedSheet?.data
              }
            : ((refreshedSheet as unknown as Record<string, unknown> | undefined) ?? event.sheet)
        ensureRemoteSheetInLiveWorkbook(sheetForMaterialization, refreshedIndex >= 0 ? refreshedIndex : undefined)
      } else if (event.type === 'sheet_renamed' || event.type === 'sheet_updated') {
        const refreshedSheet = sheetId ? appSheetsRef.current.find(sheet => sheet.id === sheetId) : undefined
        const broadcastName = event.sheet && typeof event.sheet.name === 'string' ? event.sheet.name : undefined
        const nextName = broadcastName ?? refreshedSheet?.name
        renameRemoteSheetInLiveWorkbook(sheetId, nextName)
        const hidden = normalizeSheetRecordHidden(event.sheet) ?? refreshedSheet?.hidden
        if (typeof hidden === 'boolean') {
          setRemoteSheetVisibilityInLiveWorkbook(sheetId, hidden, { syncActiveSheet: true })
        }
      } else if (event.type === 'sheet_deleted') {
        removeRemoteSheetFromLiveWorkbook(sheetId)
        if (sheetId === activeSheetIdRef.current) {
          const nextActiveSheetId = appSheetsRef.current.find(sheet => sheet.id !== sheetId)?.id
          if (nextActiveSheetId) {
            setActiveSheetId(nextActiveSheetId)
          }
        }
      }
    })()
  }
}
