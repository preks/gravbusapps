import type {
  AuthoritativeGridReapplyTarget,
  AuthoritativeGridRegion,
  PendingLocalFilterPolicy
} from './spreadsheetAuthoritativeRegion'
import { normalizeAuthoritativeGridReapplyTarget } from './spreadsheetAuthoritativeRegion'
import { getCanonicalRowId } from './spreadsheetRowIdentity'

export type BackendDirtyRegionReapplyReason =
  | 'dirty_regions_from_backend_used'
  | 'dirty_regions_from_backend_materialization'

export type CoordinatedAuthoritativeRepairReason =
  | BackendDirtyRegionReapplyReason
  | 'row_materialization'
  | 'stale_active_snapshot_row_materialization'

export interface CoordinatedAuthoritativeRepairEntry {
  generation: number
  requestedAt: number
  regions: AuthoritativeGridRegion[]
  reason: CoordinatedAuthoritativeRepairReason
}

export type BackendDirtyRegionReapplyClassification = {
  reason: BackendDirtyRegionReapplyReason
  pendingLocalFilterPolicy: PendingLocalFilterPolicy
  touchesFreshMaterializedRow: boolean
}

export function classifyBackendDirtyRegionReapply(params: {
  sheetId: string
  regions: readonly AuthoritativeGridRegion[]
  rows: Record<string, unknown>[]
  isFreshMaterializedBackendRow?: (sheetId: string, rowId: string) => boolean
}): BackendDirtyRegionReapplyClassification {
  const { sheetId, regions, rows, isFreshMaterializedBackendRow } = params
  const touchesFreshMaterializedRow = regions.some(region =>
    rows.some((row, index) => {
      const visualIndex =
        typeof row._gridRowIndex === 'number' && Number.isFinite(row._gridRowIndex)
          ? Math.trunc(row._gridRowIndex)
          : index
      if (visualIndex < region.minRow || visualIndex > region.maxRow) return false
      const canonicalRowId = getCanonicalRowId(row)
      if (!canonicalRowId) return false
      return isFreshMaterializedBackendRow?.(sheetId, canonicalRowId) === true
    })
  )

  return {
    reason: touchesFreshMaterializedRow
      ? 'dirty_regions_from_backend_materialization'
      : 'dirty_regions_from_backend_used',
    pendingLocalFilterPolicy: 'server_authoritative_repair',
    touchesFreshMaterializedRow
  }
}

export function isServerAuthoritativeRepairReapply(params: {
  reason?: string
  pendingLocalFilterPolicy?: PendingLocalFilterPolicy
}): params is {
  reason: CoordinatedAuthoritativeRepairReason
  pendingLocalFilterPolicy: 'server_authoritative_repair'
} {
  return params.pendingLocalFilterPolicy === 'server_authoritative_repair' && typeof params.reason === 'string'
}

function intersectAuthoritativeRegion(
  left: AuthoritativeGridRegion,
  right: AuthoritativeGridRegion
): AuthoritativeGridRegion | null {
  const minRow = Math.max(left.minRow, right.minRow)
  const maxRow = Math.min(left.maxRow, right.maxRow)
  const minCol = Math.max(left.minCol, right.minCol)
  const maxCol = Math.min(left.maxCol, right.maxCol)
  if (minRow > maxRow || minCol > maxCol) return null
  return { minRow, maxRow, minCol, maxCol }
}

function subtractIntersectingRegion(
  source: AuthoritativeGridRegion,
  covered: AuthoritativeGridRegion
): AuthoritativeGridRegion[] {
  const intersection = intersectAuthoritativeRegion(source, covered)
  if (!intersection) return [source]

  const remaining: AuthoritativeGridRegion[] = []

  if (source.minRow < intersection.minRow) {
    remaining.push({
      minRow: source.minRow,
      maxRow: intersection.minRow - 1,
      minCol: source.minCol,
      maxCol: source.maxCol
    })
  }

  if (intersection.maxRow < source.maxRow) {
    remaining.push({
      minRow: intersection.maxRow + 1,
      maxRow: source.maxRow,
      minCol: source.minCol,
      maxCol: source.maxCol
    })
  }

  if (source.minCol < intersection.minCol) {
    remaining.push({
      minRow: intersection.minRow,
      maxRow: intersection.maxRow,
      minCol: source.minCol,
      maxCol: intersection.minCol - 1
    })
  }

  if (intersection.maxCol < source.maxCol) {
    remaining.push({
      minRow: intersection.minRow,
      maxRow: intersection.maxRow,
      minCol: intersection.maxCol + 1,
      maxCol: source.maxCol
    })
  }

  return remaining
}

export function subtractAuthoritativeRepairRegions(params: {
  target: AuthoritativeGridReapplyTarget | undefined
  coveredRegions: readonly AuthoritativeGridRegion[]
}): AuthoritativeGridRegion[] | null {
  const targetRegions = normalizeAuthoritativeGridReapplyTarget(params.target)
  if (!targetRegions) return null

  let remaining = targetRegions.map(region => ({ ...region }))
  for (const coveredRegion of params.coveredRegions) {
    remaining = remaining.flatMap(region => subtractIntersectingRegion(region, coveredRegion))
    if (remaining.length === 0) {
      return []
    }
  }

  return remaining
}
