import type { SpreadsheetSheet } from '../types'
import { applyAuthoritativeBatchResponseToRows } from '../utils/spreadsheetBatchApply'
import { applySpreadsheetSessionDeltaChangesToRows } from './spreadsheetSessionDeltaApply'
import {
  SpreadsheetSessionMutationSources,
  type SpreadsheetSessionDeltaChangesDescriptor,
  type SpreadsheetSessionMutationDescriptor,
  type SpreadsheetSessionState,
  type SpreadsheetSheetSessionState,
  type SpreadsheetViewerRow
} from './SpreadsheetSession'

const cloneRows = (rows: SpreadsheetViewerRow[]): SpreadsheetViewerRow[] => rows.map(row => ({ ...row }))

/**
 * When replacing sheet rows after a partial merge (e.g. collaboration), upstream often
 * returns the same row object references for untouched rows. Re-cloning every row
 * allocates O(sheetRows) per small edit; reuse stable references when index-aligned.
 */
const cloneRowsForReplace = (
  nextRows: SpreadsheetViewerRow[],
  previousRows: SpreadsheetViewerRow[] | null | undefined
): SpreadsheetViewerRow[] => {
  if (!previousRows || previousRows.length !== nextRows.length) {
    return cloneRows(nextRows)
  }
  return nextRows.map((row, index) => {
    const prev = previousRows[index]
    if (row === prev) {
      return row
    }
    return { ...row }
  })
}

export const buildSpreadsheetSheetSessionState = (
  sheet: SpreadsheetSheet,
  rows: SpreadsheetViewerRow[],
  version?: number,
  previousState?: SpreadsheetSheetSessionState | null
): SpreadsheetSheetSessionState => ({
  sheetId: sheet.id,
  version:
    typeof version === 'number' && Number.isFinite(version)
      ? Math.trunc(version)
      : typeof previousState?.version === 'number'
        ? previousState.version
        : Math.trunc(Number(sheet.version ?? 0)),
  rows: cloneRowsForReplace(rows, previousState?.rows),
  columns: [...sheet.columns],
  persistedBaselineRows: previousState?.persistedBaselineRows ?? null,
  isDirty: previousState?.isDirty ?? false,
  needsGridMaterialization: previousState?.needsGridMaterialization ?? false,
  gridMaterializationReason: previousState?.gridMaterializationReason ?? null,
  lastMutationSource: previousState?.lastMutationSource
})

export const buildSpreadsheetSessionState = ({
  appId,
  activeSheetId,
  sheets,
  workbookSnapshotVersion = 0,
  workbookSnapshot = null
}: {
  appId: string
  activeSheetId: string
  sheets: Array<{ sheet: SpreadsheetSheet; rows?: SpreadsheetViewerRow[]; version?: number }>
  workbookSnapshotVersion?: number
  workbookSnapshot?: Record<string, unknown> | null
}): SpreadsheetSessionState => ({
  appId,
  activeSheetId,
  workbookSnapshotVersion,
  workbookSnapshot,
  sheets: Object.fromEntries(
    sheets.map(({ sheet, rows, version }) => [
      sheet.id,
      buildSpreadsheetSheetSessionState(sheet, rows ?? (sheet.data as SpreadsheetViewerRow[]), version)
    ])
  )
})

export const replaceSpreadsheetSessionSheetState = (
  state: SpreadsheetSessionState,
  sheet: SpreadsheetSheet,
  rows: SpreadsheetViewerRow[],
  version?: number
): SpreadsheetSessionState => ({
  ...state,
  sheets: {
    ...state.sheets,
    [sheet.id]: buildSpreadsheetSheetSessionState(sheet, rows, version, state.sheets[sheet.id] ?? null)
  }
})

export const updateSpreadsheetSessionWorkbookSnapshot = (
  state: SpreadsheetSessionState,
  snapshot: Record<string, unknown> | null,
  version: number
): SpreadsheetSessionState => ({
  ...state,
  workbookSnapshot: snapshot,
  workbookSnapshotVersion: Math.max(0, Math.trunc(Number(version) || 0))
})

export const applySpreadsheetSessionMutation = (
  state: SpreadsheetSessionState,
  descriptor: SpreadsheetSessionMutationDescriptor
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[descriptor.sheetId]
  if (!currentSheetState) {
    return state
  }

  const nextRows = descriptor.response
    ? applyAuthoritativeBatchResponseToRows(
        currentSheetState.rows,
        descriptor.operations,
        descriptor.response,
        currentSheetState.columns
      )
    : currentSheetState.rows

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [descriptor.sheetId]: {
        ...currentSheetState,
        rows: cloneRows(nextRows),
        version: descriptor.response?.newVersion ?? currentSheetState.version,
        isDirty: descriptor.response
          ? false
          : descriptor.source === SpreadsheetSessionMutationSources.LocalEdit
            ? true
            : currentSheetState.isDirty,
        lastMutationSource: descriptor.source
      }
    }
  }
}

export const applySpreadsheetSessionDeltaChanges = (
  state: SpreadsheetSessionState,
  descriptor: SpreadsheetSessionDeltaChangesDescriptor
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[descriptor.sheetId]
  if (!currentSheetState) {
    return state
  }
  const nextRows = applySpreadsheetSessionDeltaChangesToRows(
    currentSheetState.rows,
    descriptor.changes,
    descriptor.columns ?? currentSheetState.columns
  )
  const version =
    typeof descriptor.version === 'number' && Number.isFinite(descriptor.version)
      ? Math.trunc(descriptor.version)
      : currentSheetState.version

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [descriptor.sheetId]: {
        ...currentSheetState,
        rows: cloneRows(nextRows),
        version,
        lastMutationSource: descriptor.source
      }
    }
  }
}

export const captureSpreadsheetSessionPersistedBaseline = (
  state: SpreadsheetSessionState,
  sheetId: string
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[sheetId]
  if (!currentSheetState) {
    return state
  }

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetId]: {
        ...currentSheetState,
        persistedBaselineRows: cloneRows(currentSheetState.rows)
      }
    }
  }
}

export const markSpreadsheetSessionSheetNeedsGridMaterialization = (
  state: SpreadsheetSessionState,
  sheetId: string,
  reason: string
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[sheetId]
  if (!currentSheetState) {
    return state
  }

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetId]: {
        ...currentSheetState,
        needsGridMaterialization: true,
        gridMaterializationReason: reason
      }
    }
  }
}

export const clearSpreadsheetSessionSheetGridMaterialization = (
  state: SpreadsheetSessionState,
  sheetId: string
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[sheetId]
  if (!currentSheetState) {
    return state
  }

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetId]: {
        ...currentSheetState,
        needsGridMaterialization: false,
        gridMaterializationReason: null
      }
    }
  }
}

export const clearSpreadsheetSessionDirty = (
  state: SpreadsheetSessionState,
  sheetId: string
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[sheetId]
  if (!currentSheetState) {
    return state
  }

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetId]: {
        ...currentSheetState,
        isDirty: false
      }
    }
  }
}
