import type { EditorView } from '@tiptap/pm/view'
import { runDeferredRepaginationPass } from './deferredRepaginationRuntime'
import {
  resolveDeferredRepaginationMeasurementState,
  type AddPagesMeasurementSnapshot,
  type PaginationMeasuredHeights,
  PAGE_COUNT_HARD_CAP,
  MAX_PAGE_GROWTH_PER_EVALUATION
} from './paginationPageCountPolicy'
import {
  resolveDeferredRepaginationPreflight,
  resolveTablePaginationHeuristics,
  shouldDeferTablePaginationEvaluation
} from './paginationStabilizationPolicy'
import {
  incrementPaginationInstrumentationCounter,
  startPaginationInstrumentationTimer
} from './paginationInstrumentation'
import {
  createMissingPaginationLayoutTableFragmentsState,
  readPaginationLayoutTableFragmentsState
} from './layoutTableFragmentsBridge'
import type { PagesOptions, PagesStorage } from './types'
import type { PageBodyMeasurementBand } from './utils'
import type { TablePaginationControllerResult } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController'

const clampPageCount = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(PAGE_COUNT_HARD_CAP, Math.floor(value)))
}

/** When stored/measured page count reaches this, break synchronous repagination loops across frames. */
export const LARGE_DOC_PAGE_YIELD_THRESHOLD = 50

/** After this many loop iterations in a large doc, reschedule evaluation instead of blocking the main thread. */
export const LARGE_DOC_YIELD_EVERY_N_ITERATIONS = 1

export interface DeferredRepaginationEvaluationResult {
  handled: boolean
  iterations: number
  structuralActionsPerformed: number
  /** True when work was delegated to a later frame via `onScheduleEvaluation` (large documents only). */
  deferred?: boolean
}

function isDestroyedView(view: EditorView) {
  return (view as EditorView & { isDestroyed?: boolean }).isDestroyed === true
}

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

export function runDeferredRepaginationEvaluationLoop(options: {
  view: EditorView
  evaluationId: number
  storage: PagesStorage
  getRuntimeOptions: () => PagesOptions
  syncStorageFromOptions: (storage: PagesStorage, runtimeOptions: PagesOptions) => void
  syncRootPresentation: (params: { editorDom: HTMLElement; options: PagesOptions; storage: PagesStorage }) => void
  resolveMeasurementState?: typeof resolveDeferredRepaginationMeasurementState
  getPreviousAddPagesMeasurement: () => AddPagesMeasurementSnapshot | null
  getRunawayGrowthCapPageCount: () => number | null
  setRunawayGrowthCapPageCount: (pageCount: number | null) => void
  setMeasuredHeights: (measured: PaginationMeasuredHeights) => void
  measureHeights: (view: EditorView, storage: PagesStorage, runtimeOptions: PagesOptions) => PaginationMeasuredHeights
  documentHasTables: (view: EditorView) => boolean
  getBodyMeasurementBands: (editorDom: HTMLElement) => PageBodyMeasurementBand[]
  hasPendingTableMeasurements: (view: EditorView) => boolean
  resolvePreflight?: typeof resolveDeferredRepaginationPreflight
  getStabilizationAttemptsRemaining: () => number
  runPass?: typeof runDeferredRepaginationPass
  evaluateTablePagination: (params: {
    view: EditorView
    currentPageCount: number
    measuredPageCount: number
    heuristics: ReturnType<typeof resolveDeferredRepaginationPreflight>['tablePaginationHeuristics']
    bodyBands: PageBodyMeasurementBand[]
    layoutTableFragmentsState: ReturnType<typeof readPaginationLayoutTableFragmentsState>
  }) => TablePaginationControllerResult
  onLogDebug: (event: string, payload: Record<string, unknown>) => void
  onSetPreviousAddPagesMeasurement: (next: AddPagesMeasurementSnapshot | null) => void
  onClearPreviousAddPagesMeasurement: () => void
  onSetGrowthSuppression: (currentPageCount: number) => void
  onClearGrowthSuppression: () => void
  onDecrementStabilizationAttempts: () => void
  onScheduleEvaluation: (view: EditorView) => void
  onRefreshLayoutBounds: (editorDom: HTMLElement) => void
  onResetStabilizationAttempts: () => void
  onRequestRefresh: (
    view: EditorView,
    source: 'table-pagination-refresh' | 'table-pagination-request-refresh',
    nextStoredPageCount?: number
  ) => void
  onDispatch: (transaction: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['transaction']) => void
}): DeferredRepaginationEvaluationResult {
  incrementPaginationInstrumentationCounter('deferred-repagination-loop-total')
  const finishInstrumentation = startPaginationInstrumentationTimer('deferred-repagination-loop', {
    evaluationId: options.evaluationId,
    initialStoredPageCount: options.storage.pageCount
  })
  let exitReason: 'destroyed-view' | 'deferred-yield' | 'handled' | 'exhausted-loop' = 'exhausted-loop'
  let wasHandled = false
  let wasDeferred = false
  let structuralActionsPerformed = 0
  let loopIteration = 0

  try {
    if (isDestroyedView(options.view)) {
      exitReason = 'destroyed-view'
      return {
        handled: false,
        iterations: 0,
        structuralActionsPerformed: 0
      }
    }

    // Guard against runaway values before evaluation loop runs.
    const clampedInitial = clampPageCount(options.storage.pageCount)
    if (options.storage.pageCount !== clampedInitial) {
      options.storage.pageCount = clampedInitial
    }

    const basePageCount = clampPageCount(options.storage.pageCount)

    while (!isDestroyedView(options.view)) {
      loopIteration += 1

      const runtimeOptions = options.getRuntimeOptions()
      options.syncStorageFromOptions(options.storage, runtimeOptions)
      options.syncRootPresentation({
        editorDom: options.view.dom,
        options: runtimeOptions,
        storage: options.storage
      })

      const deferredRepaginationMeasurement = (
        options.resolveMeasurementState ?? resolveDeferredRepaginationMeasurementState
      )({
        view: options.view,
        storage: options.storage,
        runtimeOptions,
        previousAddPagesMeasurement: options.getPreviousAddPagesMeasurement(),
        cappedPageCount: options.getRunawayGrowthCapPageCount(),
        docChangedSinceLastUpdate: false,
        resetDueToDocChange: false,
        measureHeights: () => options.measureHeights(options.view, options.storage, runtimeOptions)
      })
      options.setMeasuredHeights(deferredRepaginationMeasurement.measured)

      // Hard guard: total pages in this evaluation loop must not exceed base + MAX_PAGE_GROWTH_PER_EVALUATION.
      const loopGrowthCap = basePageCount + MAX_PAGE_GROWTH_PER_EVALUATION
      if (deferredRepaginationMeasurement.measuredPageCount > loopGrowthCap) {
        deferredRepaginationMeasurement.measuredPageCount = clampPageCount(loopGrowthCap)
        deferredRepaginationMeasurement.rawMeasuredPageCount = clampPageCount(loopGrowthCap)
      }

      const currentPageCount = deferredRepaginationMeasurement.currentPageCount
      const rawMeasuredPageCount = deferredRepaginationMeasurement.rawMeasuredPageCount
      const measuredPageCount = deferredRepaginationMeasurement.measuredPageCount
      const runawayPageGrowthResolution = deferredRepaginationMeasurement.runawayPageGrowthResolution
      const nextAddPagesMeasurement = deferredRepaginationMeasurement.nextAddPagesMeasurement
      const pageCountReason = deferredRepaginationMeasurement.pageCountReason
      const lastMeasuredPageGap = deferredRepaginationMeasurement.lastMeasuredPageGap
      options.setRunawayGrowthCapPageCount(runawayPageGrowthResolution.cappedPageCount)
      options.storage.pageCount = currentPageCount

      const hasActiveEditor = options.storage.activeEditorType !== null
      const hasTables = options.documentHasTables(options.view)
      const shouldInspectTableLayout = hasTables && !hasActiveEditor
      const tableBodyBands = shouldInspectTableLayout ? options.getBodyMeasurementBands(options.view.dom) : []
      const layoutTableFragmentsState = hasTables
        ? readPaginationLayoutTableFragmentsState(options.view.dom, options.view.state.doc)
        : createMissingPaginationLayoutTableFragmentsState()
      const stabilizationAttemptsRemaining = options.getStabilizationAttemptsRemaining()
      const deferredLoopTableState = resolveDeferredRepaginationLoopTableState({
        hasActiveEditor,
        hasTables,
        currentPageCount,
        bodyBands: tableBodyBands,
        stabilizationAttemptsRemaining,
        getHasPendingTableMeasurements: () => options.hasPendingTableMeasurements(options.view),
        cappedPageCount: runawayPageGrowthResolution.cappedPageCount,
        resolvePreflight: options.resolvePreflight
      })
      const measuredTablePageCount = deferredLoopTableState.measuredTablePageCount
      const deferredRepaginationPreflight = deferredLoopTableState.preflight

      options.onLogDebug('deferred-repagination-evaluation', {
        evaluationId: options.evaluationId,
        loopIteration,
        structuralActionsPerformed,
        currentPageCount,
        storedPageCount: options.storage.pageCount,
        rawMeasuredPageCount,
        effectiveMeasuredPageCount: measuredPageCount,
        cappedPageCount: runawayPageGrowthResolution.cappedPageCount,
        suppressionActive: runawayPageGrowthResolution.suppressionActive,
        runawayShouldStabilize: runawayPageGrowthResolution.runawayPageGrowthCheck.shouldStabilize,
        runawayGapShrinkRatio: runawayPageGrowthResolution.runawayPageGrowthCheck.gapShrinkRatio,
        pageCountReason,
        lastPageGap: lastMeasuredPageGap,
        bodyBandCount: tableBodyBands.length,
        measuredTablePageCount,
        layoutTableFragmentCount: layoutTableFragmentsState.fragments.length,
        layoutTableFragmentsStatus: layoutTableFragmentsState.status,
        layoutTableFragmentsLayoutVersion: layoutTableFragmentsState.layoutVersion,
        hasTables,
        deferTableEvaluation: deferredRepaginationPreflight.deferTableEvaluation,
        tableMeasurementsPending: deferredRepaginationPreflight.tableMeasurementsPending,
        stabilizationAttemptsRemaining
      })

      const passResult = (options.runPass ?? runDeferredRepaginationPass)({
        view: options.view,
        evaluationId: options.evaluationId,
        loopIteration,
        structuralActionsPerformed,
        currentPageCount,
        measuredPageCount,
        preflight: deferredRepaginationPreflight,
        nextAddPagesMeasurement,
        shouldPersistNextAddPagesMeasurement: runawayPageGrowthResolution.cappedPageCount === null,
        stabilizationAttemptsRemaining,
        evaluate: measuredPageCountForEvaluation =>
          options.evaluateTablePagination({
            view: options.view,
            currentPageCount,
            measuredPageCount: measuredPageCountForEvaluation,
            heuristics: deferredRepaginationPreflight.tablePaginationHeuristics,
            bodyBands: tableBodyBands,
            layoutTableFragmentsState
          }),
        onLogDebug: options.onLogDebug,
        onSetPreviousAddPagesMeasurement: options.onSetPreviousAddPagesMeasurement,
        onClearPreviousAddPagesMeasurement: options.onClearPreviousAddPagesMeasurement,
        onSetGrowthSuppression: () => {
          options.onSetGrowthSuppression(currentPageCount)
        },
        onClearGrowthSuppression: options.onClearGrowthSuppression,
        onDecrementStabilizationAttempts: options.onDecrementStabilizationAttempts,
        onScheduleEvaluation: () => {
          options.onScheduleEvaluation(options.view)
        },
        onRefreshLayoutBounds: () => {
          options.onRefreshLayoutBounds(options.view.dom)
        },
        onResetStabilizationAttempts: options.onResetStabilizationAttempts,
        onRequestRefresh: (source, nextStoredPageCount) => {
          options.onRequestRefresh(options.view, source, nextStoredPageCount)
        },
        onDispatch: options.onDispatch
      })

      structuralActionsPerformed += passResult.structuralActionsDelta
      if (passResult.shouldContinueLoop) {
        // Large docs: avoid tens of synchronous iterations in one task (keeps UI/socket responsive).
        const effectivePageCount = Math.max(basePageCount, currentPageCount, measuredPageCount)
        if (
          effectivePageCount >= LARGE_DOC_PAGE_YIELD_THRESHOLD &&
          loopIteration % LARGE_DOC_YIELD_EVERY_N_ITERATIONS === 0
        ) {
          exitReason = 'deferred-yield'
          wasDeferred = true
          options.onScheduleEvaluation(options.view)
          return {
            handled: false,
            iterations: loopIteration,
            structuralActionsPerformed,
            deferred: true
          }
        }
        continue
      }

      if (passResult.handled) {
        exitReason = 'handled'
        wasHandled = true
        return {
          handled: true,
          iterations: loopIteration,
          structuralActionsPerformed
        }
      }
    }

    return {
      handled: false,
      iterations: loopIteration,
      structuralActionsPerformed
    }
  } finally {
    if (wasHandled) {
      incrementPaginationInstrumentationCounter('deferred-repagination-loop-handled')
    }
    if (wasDeferred) {
      incrementPaginationInstrumentationCounter('deferred-repagination-loop-deferred')
    }
    finishInstrumentation({
      exitReason,
      handled: wasHandled,
      deferred: wasDeferred,
      iterations: loopIteration,
      structuralActionsPerformed,
      finalStoredPageCount: options.storage.pageCount
    })
  }
}
