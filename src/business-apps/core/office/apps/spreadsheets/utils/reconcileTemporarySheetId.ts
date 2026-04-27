type LatestUniverData = { data: Record<string, unknown>[]; sheetId: string } | null

type PendingUniverRows = {
  data: Record<string, unknown>[]
  persistedRows: Record<string, unknown>[]
}

type PendingSheetVersion = {
  version: number
  fetchedAt: number
}

type PendingSnapshotCheckpoint = {
  requestedAt: number
}

type CellLike = {
  sheetId?: string
}

type PendingBatchLike = {
  targetSheetId: string
}

export function resolveReconciledSheetId(sheetId: string, createdSheetIdAliases: ReadonlyMap<string, string>): string {
  return createdSheetIdAliases.get(sheetId) ?? sheetId
}

function remapMapKey<T>(
  map: Map<string, T>,
  temporarySheetId: string,
  persistedSheetId: string,
  mergeValues?: (source: T, target: T) => T
): void {
  if (temporarySheetId === persistedSheetId || !map.has(temporarySheetId)) return
  const source = map.get(temporarySheetId)
  if (source === undefined) return
  const target = map.get(persistedSheetId)
  map.delete(temporarySheetId)
  map.set(persistedSheetId, target !== undefined && mergeValues ? mergeValues(source, target) : (target ?? source))
}

export function reconcileTemporarySheetIdReferences(params: {
  temporarySheetId: string
  persistedSheetId: string
  peerSheetDataCache: Map<string, Record<string, unknown>[]>
  pendingUniverRowsBySheet: Map<string, PendingUniverRows>
  pendingSnapshotClearCells: Map<string, Set<string>>
  pendingSnapshotCheckpoints: Map<string, PendingSnapshotCheckpoint>
  knownSheetVersions: Map<string, PendingSheetVersion>
  pendingCellChanges: CellLike[]
  pendingCellBatches: PendingBatchLike[]
  latestUniverData: LatestUniverData
}): LatestUniverData {
  const {
    temporarySheetId,
    persistedSheetId,
    peerSheetDataCache,
    pendingUniverRowsBySheet,
    pendingSnapshotClearCells,
    pendingSnapshotCheckpoints,
    knownSheetVersions,
    pendingCellChanges,
    pendingCellBatches,
    latestUniverData
  } = params

  if (!temporarySheetId || temporarySheetId === persistedSheetId) {
    return latestUniverData
  }

  remapMapKey(peerSheetDataCache, temporarySheetId, persistedSheetId)
  remapMapKey(pendingUniverRowsBySheet, temporarySheetId, persistedSheetId)
  remapMapKey(pendingSnapshotClearCells, temporarySheetId, persistedSheetId, (source, target) => {
    return new Set([...target, ...source])
  })
  remapMapKey(pendingSnapshotCheckpoints, temporarySheetId, persistedSheetId, (source, target) => {
    return source.requestedAt >= target.requestedAt ? source : target
  })
  remapMapKey(knownSheetVersions, temporarySheetId, persistedSheetId, (source, target) => {
    return source.version >= target.version ? source : target
  })

  for (const cell of pendingCellChanges) {
    if (cell.sheetId === temporarySheetId) {
      cell.sheetId = persistedSheetId
    }
  }

  for (const batch of pendingCellBatches) {
    if (batch.targetSheetId === temporarySheetId) {
      batch.targetSheetId = persistedSheetId
    }
  }

  if (latestUniverData?.sheetId === temporarySheetId) {
    return {
      ...latestUniverData,
      sheetId: persistedSheetId
    }
  }

  return latestUniverData
}
