import type { MutableRefObject } from 'react'
import type { SpreadsheetColumn, SpreadsheetSheet, SpreadsheetApp } from '../types'
import {
  primeSpreadsheetSheetInsertCaches,
  type PrimeSpreadsheetSheetInsertCachesContext
} from './spreadsheetSheetInsertCaches'

type ViewerRow = Record<string, unknown>
type PendingCreatedSheetSelection = { temporarySheetId: string; persistedSheetId: string | null }

type SpreadsheetLocalAppUpdater = (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void

export interface UniverSheetInsertPayload {
  kind: 'blank' | 'duplicate'
  sheetId: string
  sheetName: string
  sourceSheetId?: string
}

export interface PrepareUniverSheetInsertLocallyParams {
  payload: UniverSheetInsertPayload
  appSheets: SpreadsheetSheet[]
  /** Typically the previously active sheet: columns / viewType / settings seed the placeholder. */
  activeTemplateSheet: Pick<SpreadsheetSheet, 'columns' | 'viewType' | 'settings'>
  previousActiveSheetId: string
  getActiveSessionRows: () => ViewerRow[]
  getRichestKnownRowsForSheet: (sheetId: string) => ViewerRow[]
  /** When false, skip appending the optimistic placeholder (no local app update channel). */
  shouldPreseedPlaceholder: boolean
  /** Invoked after row snapshots are read, immediately before peer caches are primed. */
  onWillPrimeCaches?: (info: { rowsToPreserve: ViewerRow[]; currentActiveRows: ViewerRow[] }) => void
}

export interface PrepareUniverSheetInsertLocallyContext {
  pendingCreatedSheetSelectionRef: MutableRefObject<PendingCreatedSheetSelection | null>
  applyLocalAppUpdate: SpreadsheetLocalAppUpdater
}

/**
 * Runs the synchronous part of Univer-driven sheet insert: pending selection,
 * optional placeholder row in `app.sheets`, and peer-cache priming before POST /sheets.
 */
export const prepareUniverSheetInsertLocally = (
  params: PrepareUniverSheetInsertLocallyParams,
  ctx: PrepareUniverSheetInsertLocallyContext & PrimeSpreadsheetSheetInsertCachesContext
): { templateColumns: SpreadsheetColumn[]; sourceSheetId: string | undefined } => {
  const sourceSheetId =
    params.payload.kind === 'duplicate' &&
    params.payload.sourceSheetId &&
    params.payload.sourceSheetId !== params.payload.sheetId
      ? params.payload.sourceSheetId
      : undefined
  const sourceSheet = sourceSheetId ? params.appSheets.find(sheet => sheet.id === sourceSheetId) : undefined
  const templateColumns = (sourceSheet?.columns ?? params.activeTemplateSheet.columns).map(col => ({ ...col }))

  ctx.pendingCreatedSheetSelectionRef.current = {
    temporarySheetId: params.payload.sheetId,
    persistedSheetId: null
  }

  if (params.shouldPreseedPlaceholder) {
    const placeholderSheet: SpreadsheetSheet = {
      id: params.payload.sheetId,
      name: params.payload.sheetName,
      viewType: params.activeTemplateSheet.viewType,
      columns: templateColumns,
      views: [],
      data: [],
      settings: { ...(params.activeTemplateSheet.settings ?? {}) }
    }
    ctx.applyLocalAppUpdate(currentApp => ({ ...currentApp, sheets: [...currentApp.sheets, placeholderSheet] }))
  }

  const rowsToPreserve = params.getRichestKnownRowsForSheet(params.previousActiveSheetId)
  const currentActiveRows = params.getActiveSessionRows()
  params.onWillPrimeCaches?.({ rowsToPreserve, currentActiveRows })
  primeSpreadsheetSheetInsertCaches(
    params.previousActiveSheetId,
    params.payload.sheetId,
    rowsToPreserve,
    currentActiveRows,
    ctx
  )

  return { templateColumns, sourceSheetId }
}
