import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetCommittedBatchEnvelope } from './spreadsheetCommittedDeltaContract'
import { validateCommittedBatchFeatureSupport } from './spreadsheetDeltaFeatureMatrix'
import {
  projectCommittedBatchToSpreadsheetSession,
  type SpreadsheetSessionProjectionPatch
} from './spreadsheetDeltaProjector'
import { planCommittedBatchDirtyRegions, type SpreadsheetDeltaDirtyRegion } from './spreadsheetDeltaRegionPlanner'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'

export type SpreadsheetRemoteTransactionPlan =
  | {
      ok: true
      batch: SpreadsheetCommittedBatchEnvelope
      sessionPatch: SpreadsheetSessionProjectionPatch
      dirtyRegions: SpreadsheetDeltaDirtyRegion[]
    }
  | {
      ok: false
      reason: 'unsupported_operation' | 'unsupported_workbook_feature'
      detail: string
    }

export function planCommittedSpreadsheetRemoteTransaction(params: {
  batch: SpreadsheetCommittedBatchEnvelope
  baseRows: SpreadsheetViewerRow[]
  columns?: SpreadsheetColumn[]
  workbookSnapshot?: Record<string, unknown> | null
}): SpreadsheetRemoteTransactionPlan {
  const featureSupport = validateCommittedBatchFeatureSupport({
    batch: params.batch,
    workbookSnapshot: params.workbookSnapshot
  })
  if (!featureSupport.ok) {
    return {
      ok: false,
      reason: featureSupport.reason,
      detail: featureSupport.detail
    }
  }

  const sessionPatch = projectCommittedBatchToSpreadsheetSession({
    batch: params.batch,
    baseRows: params.baseRows,
    columns: params.columns
  })

  return {
    ok: true,
    batch: params.batch,
    sessionPatch,
    dirtyRegions: planCommittedBatchDirtyRegions(params.batch)
  }
}
