import type { EditorView } from '@tiptap/pm/view'
import type { PagesOptions, PagesStorage } from './types'
import { calculatePageCount, getExistingPageCount, type PageCountDebugInfo } from './utils'

export const PAGE_COUNT_HARD_CAP = 2000
export const MAX_PAGE_GROWTH_PER_EVALUATION = 120

const clampPageCount = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(PAGE_COUNT_HARD_CAP, Math.floor(value)))
}

// Limit how much the measured page count can grow in a single evaluation iteration.
const limitGrowthFromCurrent = (current: number, next: number): number =>
  clampPageCount(Math.min(next, current + MAX_PAGE_GROWTH_PER_EVALUATION))

export interface PaginationMeasuredHeights {
  headerHeights: Map<number, number>
  footerHeights: Map<number, number>
  knownPageCount?: number
}

export interface AddPagesMeasurementSnapshot {
  currentPageCount: number
  measuredPageCount: number
  lastPageGap: number
  pageContentHeight: number
}

interface RunawayPageGrowthCheck {
  shouldStabilize: boolean
  actualGapShrink: number | null
  expectedGapShrink: number | null
  gapShrinkRatio: number | null
}

export interface RunawayPageGrowthResolution {
  effectivePageCount: number
  cappedPageCount: number | null
  suppressionActive: boolean
  runawayPageGrowthCheck: RunawayPageGrowthCheck
}

export interface ResolveMeasuredPageCountSnapshotOptions {
  view: EditorView
  storage: PagesStorage
  runtimeOptions: PagesOptions
  measured: PaginationMeasuredHeights
  currentPageCount: number
  previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  cappedPageCount: number | null
  docChangedSinceLastUpdate: boolean
  resetDueToDocChange: boolean
}

export interface DeferredRepaginationMeasurementState {
  measured: PaginationMeasuredHeights
  currentPageCount: number
  rawMeasuredPageCount: number
  measuredPageCount: number
  pageCountDebugInfo: PageCountDebugInfo | null
  runawayPageGrowthResolution: RunawayPageGrowthResolution
  nextAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  pageCountReason: PageCountDebugInfo['reason'] | null
  lastMeasuredPageGap: number | null
}

const MIN_EXPECTED_GAP_SHRINK_RATIO = 0.5

const NO_RUNAWAY_PAGE_GROWTH_CHECK: RunawayPageGrowthCheck = {
  shouldStabilize: false,
  actualGapShrink: null,
  expectedGapShrink: null,
  gapShrinkRatio: null
}

export function measurePageCount(
  view: EditorView,
  storage: PagesStorage,
  options: PagesOptions,
  measured: PaginationMeasuredHeights,
  onDebug?: (info: PageCountDebugInfo) => void
) {
  const rawPageCount = calculatePageCount(view, storage.pageFormat, options.pageGap, {
    storage,
    headerHeights: measured.headerHeights,
    footerHeights: measured.footerHeights,
    defaultHeaderHeight: options.headerHeight,
    defaultFooterHeight: options.footerHeight,
    onDebug
  })
  return clampPageCount(rawPageCount)
}

export function resolveCurrentKnownPageCount(existingPageCount: number, storedPageCount: number) {
  return clampPageCount(Math.max(1, existingPageCount, storedPageCount))
}

function toAddPagesMeasurementSnapshot(
  currentPageCount: number,
  measuredPageCount: number,
  info: PageCountDebugInfo | null
): AddPagesMeasurementSnapshot | null {
  if (info?.reason !== 'add-pages' || info.lastPageGap === null || measuredPageCount <= currentPageCount) {
    return null
  }

  return {
    currentPageCount,
    measuredPageCount,
    lastPageGap: info.lastPageGap,
    pageContentHeight: info.pageContentHeight
  }
}

export function detectRunawayPageGrowth(
  previous: AddPagesMeasurementSnapshot | null,
  currentPageCount: number,
  measuredPageCount: number,
  info: PageCountDebugInfo | null
): RunawayPageGrowthCheck {
  if (
    previous?.measuredPageCount !== currentPageCount ||
    info?.reason !== 'add-pages' ||
    info?.lastPageGap === null ||
    measuredPageCount <= currentPageCount
  ) {
    return NO_RUNAWAY_PAGE_GROWTH_CHECK
  }

  const addedPages = previous.measuredPageCount - previous.currentPageCount
  if (addedPages <= 0 || previous.pageContentHeight <= 0) {
    return NO_RUNAWAY_PAGE_GROWTH_CHECK
  }

  const expectedGapShrink = addedPages * previous.pageContentHeight
  const actualGapShrink = previous.lastPageGap - info.lastPageGap
  const gapShrinkRatio = actualGapShrink / expectedGapShrink

  return {
    shouldStabilize: gapShrinkRatio < MIN_EXPECTED_GAP_SHRINK_RATIO,
    actualGapShrink,
    expectedGapShrink,
    gapShrinkRatio
  }
}

function applyRunawayPageGrowthCap(
  measuredPageCount: number,
  info: PageCountDebugInfo | null,
  cappedPageCount: number | null
) {
  if (cappedPageCount === null || info?.reason !== 'add-pages') {
    return clampPageCount(measuredPageCount)
  }

  return clampPageCount(Math.min(measuredPageCount, cappedPageCount))
}

export function resolveRunawayPageGrowth(
  previousMeasurement: AddPagesMeasurementSnapshot | null,
  cappedPageCount: number | null,
  currentPageCount: number,
  measuredPageCount: number,
  info: PageCountDebugInfo | null,
  docChangedSinceLastUpdate: boolean,
  resetDueToDocChange: boolean
): RunawayPageGrowthResolution {
  if (resetDueToDocChange) {
    return {
      effectivePageCount: clampPageCount(measuredPageCount),
      cappedPageCount: null,
      suppressionActive: false,
      runawayPageGrowthCheck: NO_RUNAWAY_PAGE_GROWTH_CHECK
    }
  }

  if (docChangedSinceLastUpdate) {
    const nextCappedPageCount =
      cappedPageCount !== null && info?.reason === 'add-pages' && measuredPageCount > cappedPageCount
        ? cappedPageCount
        : null

    return {
      effectivePageCount: applyRunawayPageGrowthCap(measuredPageCount, info, nextCappedPageCount),
      cappedPageCount: nextCappedPageCount,
      suppressionActive: nextCappedPageCount !== null,
      runawayPageGrowthCheck: NO_RUNAWAY_PAGE_GROWTH_CHECK
    }
  }

  let nextCappedPageCount = cappedPageCount
  if (nextCappedPageCount !== null && (info?.reason !== 'add-pages' || measuredPageCount <= nextCappedPageCount)) {
    nextCappedPageCount = null
  }

  if (nextCappedPageCount !== null) {
    return {
      effectivePageCount: applyRunawayPageGrowthCap(measuredPageCount, info, nextCappedPageCount),
      cappedPageCount: nextCappedPageCount,
      suppressionActive: true,
      runawayPageGrowthCheck: NO_RUNAWAY_PAGE_GROWTH_CHECK
    }
  }

  const runawayPageGrowthCheck = detectRunawayPageGrowth(previousMeasurement, currentPageCount, measuredPageCount, info)

  if (!runawayPageGrowthCheck.shouldStabilize) {
    return {
      effectivePageCount: clampPageCount(measuredPageCount),
      cappedPageCount: null,
      suppressionActive: false,
      runawayPageGrowthCheck
    }
  }

  return {
    effectivePageCount: clampPageCount(currentPageCount),
    cappedPageCount: clampPageCount(currentPageCount),
    suppressionActive: true,
    runawayPageGrowthCheck
  }
}

export function resolveMeasuredPageCountSnapshot(options: ResolveMeasuredPageCountSnapshotOptions) {
  const {
    view,
    storage,
    runtimeOptions,
    measured,
    currentPageCount,
    previousAddPagesMeasurement,
    cappedPageCount,
    docChangedSinceLastUpdate,
    resetDueToDocChange
  } = options

  let pageCountDebugInfo: PageCountDebugInfo | null = null
  const rawMeasuredPageCount = measurePageCount(view, storage, runtimeOptions, measured, info => {
    pageCountDebugInfo = info
  })
  const growthLimitedPageCount = limitGrowthFromCurrent(currentPageCount, rawMeasuredPageCount)
  const runawayPageGrowthResolution = resolveRunawayPageGrowth(
    previousAddPagesMeasurement,
    cappedPageCount,
    currentPageCount,
    growthLimitedPageCount,
    pageCountDebugInfo,
    docChangedSinceLastUpdate,
    resetDueToDocChange
  )

  return {
    rawMeasuredPageCount: growthLimitedPageCount,
    measuredPageCount: runawayPageGrowthResolution.effectivePageCount,
    pageCountDebugInfo,
    runawayPageGrowthResolution
  }
}

export function resolvePaginationMeasurementState(options: {
  view: EditorView
  storage: PagesStorage
  runtimeOptions: PagesOptions
  previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  cappedPageCount: number | null
  docChangedSinceLastUpdate: boolean
  resetDueToDocChange: boolean
  measureHeights: () => PaginationMeasuredHeights
  resolveCurrentPageCount?: (view: EditorView, storage: PagesStorage) => number
  resolveMeasuredSnapshot?: (
    options: ResolveMeasuredPageCountSnapshotOptions
  ) => ReturnType<typeof resolveMeasuredPageCountSnapshot>
}): DeferredRepaginationMeasurementState {
  const {
    view,
    storage,
    runtimeOptions,
    previousAddPagesMeasurement,
    cappedPageCount,
    docChangedSinceLastUpdate,
    resetDueToDocChange,
    measureHeights,
    resolveCurrentPageCount: resolveCurrentPageCountOverride,
    resolveMeasuredSnapshot: resolveMeasuredSnapshotOverride
  } = options
  const measured = measureHeights()
  const currentPageCount =
    resolveCurrentPageCountOverride?.(view, storage) ??
    measured.knownPageCount ??
    resolveCurrentKnownPageCount(getExistingPageCount(view), storage.pageCount)
  const measuredSnapshot = (resolveMeasuredSnapshotOverride ?? resolveMeasuredPageCountSnapshot)({
    view,
    storage,
    runtimeOptions,
    measured,
    currentPageCount,
    previousAddPagesMeasurement,
    cappedPageCount,
    docChangedSinceLastUpdate,
    resetDueToDocChange
  })
  const nextAddPagesMeasurement = createAddPagesMeasurementSnapshot(
    currentPageCount,
    measuredSnapshot.rawMeasuredPageCount,
    measuredSnapshot.pageCountDebugInfo
  )

  return {
    measured,
    currentPageCount,
    rawMeasuredPageCount: measuredSnapshot.rawMeasuredPageCount,
    measuredPageCount: measuredSnapshot.measuredPageCount,
    pageCountDebugInfo: measuredSnapshot.pageCountDebugInfo,
    runawayPageGrowthResolution: measuredSnapshot.runawayPageGrowthResolution,
    nextAddPagesMeasurement,
    pageCountReason: measuredSnapshot.pageCountDebugInfo?.reason ?? null,
    lastMeasuredPageGap: measuredSnapshot.pageCountDebugInfo?.lastPageGap ?? null
  }
}

export function resolveDeferredRepaginationMeasurementState(options: {
  view: EditorView
  storage: PagesStorage
  runtimeOptions: PagesOptions
  previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  cappedPageCount: number | null
  docChangedSinceLastUpdate: boolean
  resetDueToDocChange: boolean
  measureHeights: () => PaginationMeasuredHeights
  resolveCurrentPageCount?: (view: EditorView, storage: PagesStorage) => number
  resolveMeasuredSnapshot?: (
    options: ResolveMeasuredPageCountSnapshotOptions
  ) => ReturnType<typeof resolveMeasuredPageCountSnapshot>
}): DeferredRepaginationMeasurementState {
  return resolvePaginationMeasurementState(options)
}

export function resolvePaginationWidgetTotalPages(options: {
  storedPageCount: number
  measuredPageCount: number
  growthSuppressionPageCount: number | null
}) {
  const { storedPageCount, measuredPageCount, growthSuppressionPageCount } = options

  // Allow both growth and shrink to move at most MAX_PAGE_GROWTH_PER_EVALUATION per measurement.
  const targetPageCount =
    measuredPageCount > storedPageCount
      ? Math.min(measuredPageCount, storedPageCount + MAX_PAGE_GROWTH_PER_EVALUATION)
      : Math.max(measuredPageCount, storedPageCount - MAX_PAGE_GROWTH_PER_EVALUATION)

  const clampedTarget = clampPageCount(targetPageCount)

  if (growthSuppressionPageCount === null) {
    return clampedTarget
  }

  return Math.min(clampedTarget, clampPageCount(growthSuppressionPageCount))
}

export function createAddPagesMeasurementSnapshot(
  currentPageCount: number,
  measuredPageCount: number,
  info: PageCountDebugInfo | null
) {
  return toAddPagesMeasurementSnapshot(currentPageCount, measuredPageCount, info)
}
