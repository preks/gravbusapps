import type { EditorView } from '@tiptap/pm/view'
import { runDeferredRepaginationPass } from './deferredRepaginationRuntime'
import {
  resolveDeferredRepaginationMeasurementState,
  type AddPagesMeasurementSnapshot,
  type PaginationMeasuredHeights
} from './paginationPageCountPolicy'
import {
  resolveDeferredRepaginationPreflight,
  resolveTablePaginationHeuristics,
  shouldDeferTablePaginationEvaluation
} from './paginationStabilizationPolicy'
import {
  createMissingPaginationLayoutTableFragmentsState,
  readPaginationLayoutTableFragmentsState
} from './layoutTableFragmentsBridge'
import type { PagesOptions, PagesStorage } from './types'
import type { PageBodyMeasurementBand } from './utils'
import type { TablePaginationControllerResult } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController'

export interface DeferredRepaginationEvaluationResult {
  handled: boolean
  iterations: number
  structuralActionsPerformed: number
}

function isDestroyedView(view: EditorView) {
  return (view as EditorView & { isDestroyed?: boolean }).isDestroyed === true
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
  if (isDestroyedView(options.view)) {
    return {
      handled: false,
      iterations: 0,
      structuralActionsPerformed: 0
    }
  }

  let structuralActionsPerformed = 0
  let loopIteration = 0

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
    const tablePaginationHeuristics = resolveTablePaginationHeuristics(
      runawayPageGrowthResolution.cappedPageCount,
      hasActiveEditor
    )
    const deferTableEvaluation =
      tablePaginationHeuristics.allowSplit &&
      shouldDeferTablePaginationEvaluation({
        hasTables,
        currentPageCount,
        bodyBandCount: tableBodyBands.length
      })
    const tableMeasurementsPending =
      hasTables &&
      (tablePaginationHeuristics.allowSplit || tablePaginationHeuristics.allowMerge) &&
      !deferTableEvaluation &&
      options.hasPendingTableMeasurements(options.view)
    const stabilizationAttemptsRemaining = options.getStabilizationAttemptsRemaining()
    const deferredRepaginationPreflight = (options.resolvePreflight ?? resolveDeferredRepaginationPreflight)({
      cappedPageCount: runawayPageGrowthResolution.cappedPageCount,
      hasActiveEditor,
      hasTables,
      currentPageCount,
      bodyBandCount: tableBodyBands.length,
      stabilizationAttemptsRemaining,
      tableMeasurementsPending
    })

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
      continue
    }
    if (passResult.handled) {
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
}
