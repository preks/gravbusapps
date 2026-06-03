import type { SpreadsheetSheet } from '../types'
import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import { applyAuthoritativeBatchResponseToRows } from '../utils/spreadsheetBatchApply'
import {
  getSpreadsheetRowRefIdentity,
  getViewerRowIdentityCandidates,
  resolveSpreadsheetRowRef
} from '../utils/spreadsheetRowIdentity'
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

const BASELINE_ROW_IDENTITY_KEYS = ['_id', 'id', '_rowUuid', '_clientRowId', 'UUID', 'uuid', '_gridRowIndex'] as const

const buildRowsByIdentity = (rows: SpreadsheetViewerRow[]): Map<string, SpreadsheetViewerRow> => {
  const map = new Map<string, SpreadsheetViewerRow>()
  rows.forEach(row => {
    getViewerRowIdentityCandidates(row).forEach(identity => {
      map.set(identity, row)
    })
  })
  return map
}

const collectTouchedBaselineColumns = (operations: SpreadsheetBatchOperation[]): Map<string, Set<string>> => {
  const touched = new Map<string, Set<string>>()
  const remember = (rowIdentity: string, columnName: string): void => {
    if (!rowIdentity || !columnName) return
    const columns = touched.get(rowIdentity) ?? new Set<string>()
    columns.add(columnName)
    touched.set(rowIdentity, columns)
  }

  operations.forEach(operation => {
    if (operation.type === 'add_rows' && Array.isArray(operation.data?.rows)) {
      operation.data.rows.forEach(row => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return
        const record = row as Record<string, unknown>
        const rowIdentity =
          typeof record._clientRowId === 'string'
            ? record._clientRowId
            : typeof record._rowUuid === 'string'
              ? record._rowUuid
              : typeof record._id === 'string'
                ? record._id
                : typeof record.id === 'string'
                  ? record.id
                  : ''
        if (!rowIdentity) return
        Object.keys(record).forEach(key => {
          if (!key.startsWith('_')) remember(rowIdentity, key)
        })
      })
      return
    }

    if (operation.type === 'set_range' && Array.isArray(operation.data?.cells)) {
      operation.data.cells.forEach(cell => {
        if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return
        const record = cell as Record<string, unknown>
        const rowRef = resolveSpreadsheetRowRef(record.rowRef)
        const rowIdentity =
          typeof record.rowId === 'string' && record.rowId
            ? record.rowId
            : rowRef
              ? getSpreadsheetRowRefIdentity(rowRef)
              : ''
        const columnName = typeof record.columnName === 'string' ? record.columnName : ''
        remember(rowIdentity, columnName)
      })
      return
    }

    if (
      (operation.type === 'set_cell' || operation.type === 'clear_cell') &&
      operation.data &&
      typeof operation.data === 'object'
    ) {
      const rowRef = resolveSpreadsheetRowRef(operation.data.rowRef)
      const rowIdentity =
        typeof operation.data.rowId === 'string' && operation.data.rowId
          ? operation.data.rowId
          : rowRef
            ? getSpreadsheetRowRefIdentity(rowRef)
            : ''
      const columnName = typeof operation.data.columnName === 'string' ? operation.data.columnName : ''
      remember(rowIdentity, columnName)
    }
  })

  return touched
}

export const captureSpreadsheetSessionPersistedBaselineForOperations = (
  state: SpreadsheetSessionState,
  sheetId: string,
  operations: SpreadsheetBatchOperation[]
): SpreadsheetSessionState => {
  const currentSheetState = state.sheets[sheetId]
  if (!currentSheetState) {
    return state
  }
  if (operations.length === 0 || !currentSheetState.persistedBaselineRows) {
    return captureSpreadsheetSessionPersistedBaseline(state, sheetId)
  }

  const touchedColumnsByIdentity = collectTouchedBaselineColumns(operations)
  if (touchedColumnsByIdentity.size === 0) {
    return captureSpreadsheetSessionPersistedBaseline(state, sheetId)
  }

  const currentRowsByIdentity = buildRowsByIdentity(currentSheetState.rows)
  const previousBaseline = currentSheetState.persistedBaselineRows
  const previousBaselineByIdentity = buildRowsByIdentity(previousBaseline)
  const consumedIdentities = new Set<string>()

  const mergeBaselineRow = (rowIdentity: string): SpreadsheetViewerRow | null => {
    const currentRow = currentRowsByIdentity.get(rowIdentity)
    if (!currentRow) return null
    const previousRow = previousBaselineByIdentity.get(rowIdentity)
    const nextRow: SpreadsheetViewerRow = previousRow ? { ...previousRow } : {}
    BASELINE_ROW_IDENTITY_KEYS.forEach(key => {
      if (currentRow[key] !== undefined) {
        nextRow[key] = currentRow[key]
      }
    })
    touchedColumnsByIdentity.get(rowIdentity)?.forEach(columnName => {
      if (Object.prototype.hasOwnProperty.call(currentRow, columnName)) {
        nextRow[columnName] = currentRow[columnName]
        return
      }
      delete nextRow[columnName]
    })
    return nextRow
  }

  const nextBaselineRows = previousBaseline.map(row => {
    const rowIdentity = getViewerRowIdentityCandidates(row).find(identity => touchedColumnsByIdentity.has(identity))
    if (!rowIdentity) return { ...row }
    consumedIdentities.add(rowIdentity)
    return mergeBaselineRow(rowIdentity) ?? { ...row }
  })

  currentSheetState.rows.forEach(row => {
    const rowIdentity = getViewerRowIdentityCandidates(row).find(identity => touchedColumnsByIdentity.has(identity))
    if (!rowIdentity || consumedIdentities.has(rowIdentity)) return
    const mergedRow = mergeBaselineRow(rowIdentity)
    if (mergedRow) {
      nextBaselineRows.push(mergedRow)
      consumedIdentities.add(rowIdentity)
    }
  })

  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetId]: {
        ...currentSheetState,
        persistedBaselineRows: cloneRows(nextBaselineRows)
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
