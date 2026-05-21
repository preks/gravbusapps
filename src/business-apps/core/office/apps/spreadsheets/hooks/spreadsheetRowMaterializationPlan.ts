import { getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'
import { resolveBackendRowIdForViewerRow, rowMatchesRemoteId, type ViewerRow } from '../utils/spreadsheetRowIdentity'

export const SPREADSHEET_ROW_GRID_INDEX_COORDINATE_MODE = 'zeroBasedVisualGridIndex' as const

export interface SpreadsheetRowMaterializationPlanEntry {
  row: Record<string, unknown>
  visualIndex: number
  clientRowId: string
  inFlightKey: string
}

export interface SpreadsheetRowMaterializationPlan {
  entries: SpreadsheetRowMaterializationPlanEntry[]
  rowsToMaterialize: Array<Record<string, unknown>>
  missingGridRowIndices: number[]
  inFlightMissingGridRowIndices: number[]
  alreadyMaterializedGridRowIndices: number[]
  unmaterializedClientRowIds: string[]
  missingButInFlightCount: number
  missingAndWillCreateCount: number
  gridIndexCoordinateMode: typeof SPREADSHEET_ROW_GRID_INDEX_COORDINATE_MODE
}

export interface SpreadsheetRowsMergedByVisualIndex {
  rows: Array<Record<string, unknown>>
  affectedUiRowIds: string[]
  createdGridRowIndices: number[]
}

export const getSpreadsheetRowMaterializationClientRowId = (row: Record<string, unknown>): string => {
  const explicit = row._clientRowId
  if (typeof explicit === 'string' && explicit) {
    return explicit
  }
  const fallbackId = row._id ?? row.id
  if (typeof fallbackId === 'string' && fallbackId.startsWith('client_')) {
    return fallbackId
  }
  return ''
}

/** Alias of {@link getSpreadsheetRowMaterializationClientRowId} (same function). */
export const getMaterializationClientRowId = getSpreadsheetRowMaterializationClientRowId

export const viewerRowMatchesPersistedRowAtSlot = (
  viewerRow: ViewerRow,
  persistedRow: ViewerRow,
  isUuid: (value: string) => boolean
): boolean => {
  const viewerBackendRowId = resolveBackendRowIdForViewerRow(viewerRow, isUuid)
  const persistedBackendRowId = resolveBackendRowIdForViewerRow(persistedRow, isUuid)

  if (viewerBackendRowId && persistedBackendRowId) {
    return viewerBackendRowId === persistedBackendRowId
  }

  if (persistedBackendRowId && rowMatchesRemoteId(viewerRow, persistedBackendRowId)) {
    return true
  }

  const viewerClientRowId = getMaterializationClientRowId(viewerRow)
  const persistedClientRowId = getMaterializationClientRowId(persistedRow)

  return viewerClientRowId !== '' && persistedClientRowId !== '' && viewerClientRowId === persistedClientRowId
}

export const buildRowMaterializationInFlightKey = (sheetId: string, visualIndex: number, clientRowId: string): string =>
  `${sheetId}:${visualIndex}:${clientRowId}`

const buildRowsByVisualIndex = (
  rows: Array<Record<string, unknown>>,
  isUuid: (value: string) => boolean
): Map<number, Record<string, unknown>> => {
  const rowsByVisualIndex = new Map<number, Record<string, unknown>>()

  rows.forEach((row, index) => {
    const visualIndex = getViewerRowVisualIndex(row, index)
    const existing = rowsByVisualIndex.get(visualIndex)
    if (!existing) {
      rowsByVisualIndex.set(visualIndex, row)
      return
    }

    if (!resolveBackendRowIdForViewerRow(existing, isUuid) && resolveBackendRowIdForViewerRow(row, isUuid)) {
      rowsByVisualIndex.set(visualIndex, row)
    }
  })

  return rowsByVisualIndex
}

/** Same map used by the row materialization planner (one row per visual grid index). */
export const buildMaterializationRowsByVisualIndexMap = buildRowsByVisualIndex

export const buildSpreadsheetRowMaterializationPlan = ({
  sheetId,
  univerRows,
  persistedRows,
  isUuid,
  inFlightKeys
}: {
  sheetId: string
  univerRows: Array<Record<string, unknown>>
  persistedRows: Array<Record<string, unknown>>
  isUuid: (value: string) => boolean
  inFlightKeys: ReadonlySet<string>
}): SpreadsheetRowMaterializationPlan => {
  const persistedRowsByVisualIndex = buildRowsByVisualIndex(persistedRows, isUuid)
  const entries: SpreadsheetRowMaterializationPlanEntry[] = []
  const missingGridRowIndices: number[] = []
  const inFlightMissingGridRowIndices: number[] = []
  const alreadyMaterializedGridRowIndices: number[] = []
  const unmaterializedClientRowIds: string[] = []

  univerRows.forEach((row, index) => {
    const visualIndex = getViewerRowVisualIndex(row, index)
    const viewerBackendRowId = resolveBackendRowIdForViewerRow(row, isUuid)
    const persistedRow = persistedRowsByVisualIndex.get(visualIndex)
    const persistedBackendRowId = persistedRow ? resolveBackendRowIdForViewerRow(persistedRow, isUuid) : undefined
    if (viewerBackendRowId && !persistedRow) {
      alreadyMaterializedGridRowIndices.push(visualIndex)
      return
    }
    if (viewerBackendRowId) {
      if (persistedBackendRowId && viewerBackendRowId === persistedBackendRowId) {
        alreadyMaterializedGridRowIndices.push(visualIndex)
        return
      }
    }
    if (persistedRow && persistedBackendRowId && viewerRowMatchesPersistedRowAtSlot(row, persistedRow, isUuid)) {
      alreadyMaterializedGridRowIndices.push(visualIndex)
      return
    }

    const clientRowId = getMaterializationClientRowId(row)
    const inFlightKey = buildRowMaterializationInFlightKey(sheetId, visualIndex, clientRowId)
    missingGridRowIndices.push(visualIndex)
    if (clientRowId) unmaterializedClientRowIds.push(clientRowId)

    if (inFlightKeys.has(inFlightKey)) {
      inFlightMissingGridRowIndices.push(visualIndex)
      return
    }

    entries.push({
      row: { ...row, _gridRowIndex: visualIndex },
      visualIndex,
      clientRowId,
      inFlightKey
    })
  })

  return {
    entries,
    rowsToMaterialize: entries.map(entry => entry.row),
    missingGridRowIndices,
    inFlightMissingGridRowIndices,
    alreadyMaterializedGridRowIndices,
    unmaterializedClientRowIds,
    missingButInFlightCount: inFlightMissingGridRowIndices.length,
    missingAndWillCreateCount: entries.length,
    gridIndexCoordinateMode: SPREADSHEET_ROW_GRID_INDEX_COORDINATE_MODE
  }
}

export const mergeCreatedRowsByVisualIndex = ({
  previousRows,
  univerRows,
  createdRows,
  isUuid
}: {
  previousRows: Array<Record<string, unknown>>
  univerRows: Array<Record<string, unknown>>
  createdRows: Array<Record<string, unknown>>
  isUuid: (value: string) => boolean
}): SpreadsheetRowsMergedByVisualIndex => {
  const previousRowsByVisualIndex = buildRowsByVisualIndex(previousRows, isUuid)
  const sourceVisualIndexByClientRowId = new Map<string, number>()
  univerRows.forEach((row, index) => {
    const clientRowId = getMaterializationClientRowId(row)
    if (clientRowId) sourceVisualIndexByClientRowId.set(clientRowId, getViewerRowVisualIndex(row, index))
  })

  const createdRowsByVisualIndex = new Map<number, Record<string, unknown>>()
  const affectedUiRowIds: string[] = []
  const createdGridRowIndices: number[] = []

  createdRows.forEach((row, index) => {
    const clientRowId = getMaterializationClientRowId(row)
    const visualIndex = getViewerRowVisualIndex(row, sourceVisualIndexByClientRowId.get(clientRowId) ?? index)
    createdRowsByVisualIndex.set(visualIndex, { ...row, _gridRowIndex: visualIndex })
    createdGridRowIndices.push(visualIndex)
    if (clientRowId) affectedUiRowIds.push(clientRowId)
  })

  const orderedVisualIndices = Array.from(
    new Set([...previousRowsByVisualIndex.keys(), ...createdRowsByVisualIndex.keys()])
  ).sort((left, right) => left - right)

  return {
    rows: orderedVisualIndices.map(
      visualIndex => createdRowsByVisualIndex.get(visualIndex) ?? previousRowsByVisualIndex.get(visualIndex)!
    ),
    affectedUiRowIds: Array.from(new Set(affectedUiRowIds)),
    createdGridRowIndices: Array.from(new Set(createdGridRowIndices)).sort((left, right) => left - right)
  }
}
