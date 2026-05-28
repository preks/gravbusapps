import type { SpreadsheetRowMaterializationReadiness } from './spreadsheetRowMaterializationReadiness'
import { getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'
import {
  getClientRowIdentity,
  resolveBackendRowIdForViewerRow,
  rowMatchesRemoteId,
  type ViewerRow
} from '../utils/spreadsheetRowIdentity'

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

/** Clears stale in-flight keys for grid slots that still need materialization (e.g. after interrupted add_rows). */
export const releaseRowMaterializationInFlightKeysForMissingSlots = (
  inFlightKeys: Set<string>,
  sheetId: string,
  missingGridRowIndices: number[]
): void => {
  if (missingGridRowIndices.length === 0) return
  const prefixes = missingGridRowIndices.map(visualIndex => `${sheetId}:${visualIndex}:`)
  for (const key of Array.from(inFlightKeys)) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      inFlightKeys.delete(key)
    }
  }
}

export const releaseAllRowMaterializationInFlightKeysForSheet = (inFlightKeys: Set<string>, sheetId: string): void => {
  const prefix = `${sheetId}:`
  for (const key of Array.from(inFlightKeys)) {
    if (key.startsWith(prefix)) {
      inFlightKeys.delete(key)
    }
  }
}

export const isRowMaterializationInFlightForSheet = (inFlightKeys: ReadonlySet<string>, sheetId: string): boolean => {
  const prefix = `${sheetId}:`
  for (const key of inFlightKeys) {
    if (key.startsWith(prefix)) return true
  }
  return false
}

const countUnmaterializedClientRows = (
  rows: Array<Record<string, unknown>>,
  isUuid: (value: string) => boolean
): number =>
  rows.reduce((count, row) => {
    const clientRowId = getMaterializationClientRowId(row)
    if (!clientRowId) return count
    if (resolveBackendRowIdForViewerRow(row, isUuid)) return count
    return count + 1
  }, 0)

/**
 * Drag-fill / paste-into-new-rows updates the session optimistically before Univer's debounced
 * `latestUniverDataRef` catches up. Pre-submit materialization must scan the session snapshot
 * when it carries more temporary `client_*` rows than the stale Univer row list.
 */
export const resolveUniverRowsForSubmitReadinessMaterialization = ({
  sessionRows,
  latestUniverRows,
  isUuid
}: {
  sessionRows: Array<Record<string, unknown>>
  latestUniverRows: Array<Record<string, unknown>> | null | undefined
  isUuid: (value: string) => boolean
}): Array<Record<string, unknown>> => {
  const latestRows = latestUniverRows ?? []
  const sessionUnmaterializedCount = countUnmaterializedClientRows(sessionRows, isUuid)
  const latestUnmaterializedCount = countUnmaterializedClientRows(latestRows, isUuid)

  if (sessionUnmaterializedCount > latestUnmaterializedCount) {
    return sessionRows
  }

  if (latestRows.length > 0) {
    return latestRows
  }

  return sessionRows
}

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
  inFlightKeys,
  rowMaterializationReadiness
}: {
  sheetId: string
  univerRows: Array<Record<string, unknown>>
  persistedRows: Array<Record<string, unknown>>
  isUuid: (value: string) => boolean
  inFlightKeys: ReadonlySet<string>
  rowMaterializationReadiness?: Pick<
    SpreadsheetRowMaterializationReadiness,
    'getResolvedBackendRowId' | 'isPendingForClientRow'
  >
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
    if (
      persistedRow &&
      persistedBackendRowId &&
      !viewerBackendRowId &&
      !viewerRowMatchesPersistedRowAtSlot(row, persistedRow, isUuid)
    ) {
      alreadyMaterializedGridRowIndices.push(visualIndex)
      return
    }
    if (clientRowId && rowMaterializationReadiness) {
      if (rowMaterializationReadiness.getResolvedBackendRowId(sheetId, clientRowId)) {
        alreadyMaterializedGridRowIndices.push(visualIndex)
        return
      }
      if (rowMaterializationReadiness.isPendingForClientRow(sheetId, clientRowId)) {
        missingGridRowIndices.push(visualIndex)
        inFlightMissingGridRowIndices.push(visualIndex)
        return
      }
    }
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

// TECH_DEBT(spreadsheet-hardening): merge local Univer + pendingClientRowUpdates into occupied-slot
// adoptions (mirror backend add_rows adopt-on-collision) — tracked separately from deferred-replay fix.
export const buildOccupiedSlotRowAdoptions = ({
  univerRows,
  persistedRows,
  isUuid
}: {
  univerRows: Array<Record<string, unknown>>
  persistedRows: Array<Record<string, unknown>>
  isUuid: (value: string) => boolean
}): {
  adoptedRows: Array<Record<string, unknown>>
  persistedIdByClientRowId: Map<string, string>
} => {
  const persistedRowsByVisualIndex = buildRowsByVisualIndex(persistedRows, isUuid)
  const adoptedRows: Array<Record<string, unknown>> = []
  const persistedIdByClientRowId = new Map<string, string>()

  univerRows.forEach((row, index) => {
    const visualIndex = getViewerRowVisualIndex(row, index)
    const adoptionClientRowId = getClientRowIdentity(row)
    const viewerBackendRowId = resolveBackendRowIdForViewerRow(row, isUuid)
    const persistedRow = persistedRowsByVisualIndex.get(visualIndex)
    const persistedBackendRowId = persistedRow ? resolveBackendRowIdForViewerRow(persistedRow, isUuid) : undefined

    if (viewerBackendRowId || !persistedRow || !persistedBackendRowId) {
      return
    }
    if (viewerRowMatchesPersistedRowAtSlot(row, persistedRow, isUuid)) {
      return
    }
    if (!adoptionClientRowId) {
      return
    }

    persistedIdByClientRowId.set(adoptionClientRowId, persistedBackendRowId)
    adoptedRows.push({
      ...persistedRow,
      _clientRowId: adoptionClientRowId,
      _gridRowIndex: visualIndex
    })
  })

  return { adoptedRows, persistedIdByClientRowId }
}

export const filterMaterializationEntriesForPersistedSlots = (
  plan: SpreadsheetRowMaterializationPlan,
  persistedRows: Array<Record<string, unknown>>,
  isUuid: (value: string) => boolean
): SpreadsheetRowMaterializationPlan => {
  const persistedRowsByVisualIndex = buildRowsByVisualIndex(persistedRows, isUuid)
  const entries = plan.entries.filter(entry => {
    const persistedRow = persistedRowsByVisualIndex.get(entry.visualIndex)
    if (!persistedRow) return true
    return !viewerRowMatchesPersistedRowAtSlot(entry.row, persistedRow, isUuid)
  })

  return {
    ...plan,
    entries,
    rowsToMaterialize: entries.map(entry => entry.row),
    missingAndWillCreateCount: entries.length,
    unmaterializedClientRowIds: entries.map(entry => entry.clientRowId).filter(Boolean)
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
    const previousRow = previousRowsByVisualIndex.get(visualIndex)
    createdRowsByVisualIndex.set(visualIndex, { ...(previousRow ?? {}), ...row, _gridRowIndex: visualIndex })
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
