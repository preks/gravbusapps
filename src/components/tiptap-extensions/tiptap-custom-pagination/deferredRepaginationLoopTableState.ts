// Pure table-preflight derivation for deferred repagination.

import {
  resolveDeferredRepaginationPreflight,
  resolveTablePaginationHeuristics,
  shouldDeferTablePaginationEvaluation
} from './paginationStabilizationPolicy'
import type { PageBodyMeasurementBand } from './utils'

// This keeps body-band math and pending-measurement policy out of the loop body.
export function resolveDeferredRepaginationLoopTableState(options: {
  hasActiveEditor: boolean
  hasTables: boolean
  currentPageCount: number
  bodyBands: PageBodyMeasurementBand[]
  stabilizationAttemptsRemaining: number
  getHasPendingTableMeasurements: () => boolean
  cappedPageCount: number | null
  resolvePreflight?: typeof resolveDeferredRepaginationPreflight
}) {
  const measuredTablePageCount = new Set(options.bodyBands.map(band => band.pageNumber)).size
  const tablePaginationHeuristics = resolveTablePaginationHeuristics(options.cappedPageCount, options.hasActiveEditor)
  const deferTableEvaluation =
    tablePaginationHeuristics.allowSplit &&
    shouldDeferTablePaginationEvaluation({
      hasTables: options.hasTables,
      currentPageCount: options.currentPageCount,
      bodyBandCount: measuredTablePageCount
    })
  const tableMeasurementsPending =
    options.hasTables &&
    (tablePaginationHeuristics.allowSplit || tablePaginationHeuristics.allowMerge) &&
    !deferTableEvaluation &&
    options.getHasPendingTableMeasurements()
  const preflight = (options.resolvePreflight ?? resolveDeferredRepaginationPreflight)({
    cappedPageCount: options.cappedPageCount,
    hasActiveEditor: options.hasActiveEditor,
    hasTables: options.hasTables,
    currentPageCount: options.currentPageCount,
    bodyBandCount: measuredTablePageCount,
    stabilizationAttemptsRemaining: options.stabilizationAttemptsRemaining,
    tableMeasurementsPending
  })

  return {
    measuredTablePageCount,
    preflight
  }
}
