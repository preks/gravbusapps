import { getViewerRowVisualIndex } from './spreadsheetPeerRowHydration'
import { getClientRowIdentity, resolveBackendRowIdForViewerRow, type ViewerRow } from './spreadsheetRowIdentity'

type SnapshotIdentityPatch = {
  backendRowUuid: string
  clientRowId: string
  visualIndex: number
  explicitClientRowId?: string
  id?: unknown
}

const getSnapshotClientRowId = (row: ViewerRow): string => {
  const materializationClientRowId = row._clientRowId ?? row._id ?? row.id
  return typeof materializationClientRowId === 'string' && materializationClientRowId ? materializationClientRowId : ''
}

export function patchLatestUniverSnapshotRowBackendIdentities({
  latestRows,
  authoritativeRows,
  persistedIdByClientRowId,
  isUuid
}: {
  latestRows: ViewerRow[]
  authoritativeRows: ViewerRow[]
  persistedIdByClientRowId: ReadonlyMap<string, string>
  isUuid: (value: string) => boolean
}): ViewerRow[] {
  if (latestRows.length === 0 || authoritativeRows.length === 0 || persistedIdByClientRowId.size === 0) {
    return latestRows
  }

  const patchesByClientRowId = new Map<string, SnapshotIdentityPatch>()
  const patchesByVisualIndex = new Map<number, SnapshotIdentityPatch>()

  authoritativeRows.forEach((row, index) => {
    const clientRowId = getSnapshotClientRowId(row)
    if (!clientRowId || !persistedIdByClientRowId.has(clientRowId)) return

    const backendRowUuid = persistedIdByClientRowId.get(clientRowId) ?? resolveBackendRowIdForViewerRow(row, isUuid)
    if (!backendRowUuid) return

    const patch: SnapshotIdentityPatch = {
      backendRowUuid,
      clientRowId,
      visualIndex: getViewerRowVisualIndex(row, index),
      explicitClientRowId: typeof row._clientRowId === 'string' ? row._clientRowId : undefined,
      id: row.id
    }

    patchesByClientRowId.set(clientRowId, patch)
    patchesByVisualIndex.set(patch.visualIndex, patch)
  })

  if (patchesByClientRowId.size === 0) return latestRows

  let changed = false
  const nextRows = latestRows.map((row, index) => {
    if (resolveBackendRowIdForViewerRow(row, isUuid)) return row

    const clientRowId = getSnapshotClientRowId(row) || getClientRowIdentity(row)
    const visualIndex = getViewerRowVisualIndex(row, index)
    const directPatch = clientRowId ? patchesByClientRowId.get(clientRowId) : undefined
    const fallbackPatch = patchesByVisualIndex.get(visualIndex)
    const patch = directPatch ?? fallbackPatch

    if (!patch) return row
    if (!directPatch && clientRowId && patch.clientRowId !== clientRowId) return row

    const nextRow: ViewerRow = {
      ...row,
      _id: patch.backendRowUuid,
      _rowUuid: patch.backendRowUuid
    }

    if (nextRow._clientRowId == null) {
      nextRow._clientRowId = patch.explicitClientRowId ?? patch.clientRowId
    }

    if (nextRow.id == null && patch.id != null) {
      nextRow.id = patch.id
    }

    if (nextRow._rowUuid === row._rowUuid && nextRow._clientRowId === row._clientRowId && nextRow.id === row.id) {
      return row
    }

    changed = true
    return nextRow
  })

  return changed ? nextRows : latestRows
}
