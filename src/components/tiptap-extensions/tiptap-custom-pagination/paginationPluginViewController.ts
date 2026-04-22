import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView } from '@tiptap/pm/view'
import type { AddPagesMeasurementSnapshot } from './paginationPageCountPolicy'
import { startPaginationInstrumentationTimer } from './paginationInstrumentation'
import {
  resolvePaginationDeferredSchedulingTriggers,
  resolvePaginationPageCountUpdateDecision,
  resolveSelectionNavigationDirection,
  resolveSelectionOverflowPaginationDecision,
  type SelectionNavigationDirection
} from './paginationPluginViewDecisions'
import type { PaginationTransactionClassification } from './paginationTransactionClassifier'
import type { PagesStorage } from './types'

export type PaginationDocChangeOrigin =
  | 'external'
  | 'pagination-owned'
  | 'hydration-owned'
  | 'table-metadata-owned'
  | 'collaboration-remote'
  | null

export interface PaginationPluginViewRuntimeState {
  lastKnownDoc: PMNode | null
  lastKnownSelectionHead: number | null
  previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  runawayGrowthCapPageCount: number | null
  pendingRefreshDrivenStabilization: boolean
  lastDocChangeOrigin: PaginationDocChangeOrigin
  lastDocChangeAnalysis: PaginationTransactionClassification | null
  suppressPaginationOwnedDeferredScheduling: boolean
}

export function runPaginationPluginViewUpdate<TSelection>(options: {
  view: EditorView
  storage: Pick<PagesStorage, 'activeEditorType'>
  state: PaginationPluginViewRuntimeState
  documentHasTables: (doc: PMNode) => boolean
  resolveSelectionOverflow: (
    view: EditorView,
    direction: SelectionNavigationDirection
  ) => {
    position: number
  } | null
  resolveMeasurementState: (state: PaginationPluginViewRuntimeState) => {
    currentPageCount: number
    measuredPageCount: number
  }
  currentSelection: TSelection
  createSelection: (doc: PMNode, position: number, bias: 1 | -1) => TSelection
  selectionsEqual: (left: TSelection, right: TSelection) => boolean
  onDispatchSelection: (selection: TSelection) => void
  onResetTableController: () => void
  onClearGrowthSuppression: () => void
  onSetStoredPageCount: (pageCount: number) => void
  onRequestRefresh: (
    source: 'selection-overflow' | 'page-count-shrink' | 'page-count-grow' | 'collaboration-remote'
  ) => void
  onScheduleDeferredRepagination: (minimumAttempts?: number) => void
  getDeferredStabilizationAttemptCount: (view: EditorView) => number
  shouldScheduleDeferredRepaginationOnUpdate: (options: {
    activeEditorType: PagesStorage['activeEditorType']
    hasTables: boolean
    externalDocChange: boolean
    collaborationRemoteDocChange?: boolean
    paginationOwnedDocChange: boolean
    hydrationOwnedDocChange: boolean
    docChangeAnalysis: PaginationTransactionClassification | null
  }) => boolean
  onRefreshLayoutBounds: () => void
  onLogSelectionOverflowRefresh?: (payload: {
    currentPageCount: number
    measuredPageCount: number
    selectionHead: number
  }) => void
}) {
  const { view, storage } = options
  const currentDoc = view.state.doc
  const currentSelectionHead = view.state.selection.head
  const isInitialViewUpdate = options.state.lastKnownDoc === null
  const docChangedSinceLastUpdate = options.state.lastKnownDoc !== null && currentDoc !== options.state.lastKnownDoc
  const paginationOwnedDocChange = docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'pagination-owned'
  const hydrationOwnedDocChange = docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'hydration-owned'
  const tableMetadataOwnedDocChange =
    docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'table-metadata-owned'
  const collaborationRemoteDocChange =
    docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'collaboration-remote'
  const externalDocChange =
    docChangedSinceLastUpdate &&
    !paginationOwnedDocChange &&
    !hydrationOwnedDocChange &&
    !tableMetadataOwnedDocChange &&
    !collaborationRemoteDocChange
  const docChangeAnalysis = docChangedSinceLastUpdate ? options.state.lastDocChangeAnalysis : null
  const docChangeAffectsLayout = docChangedSinceLastUpdate && !(docChangeAnalysis?.isLayoutNeutral ?? false)
  const selectionDirection = resolveSelectionNavigationDirection(
    options.state.lastKnownSelectionHead,
    currentSelectionHead
  )
  const nextState: PaginationPluginViewRuntimeState = {
    ...options.state,
    lastKnownDoc: currentDoc,
    lastDocChangeAnalysis: docChangedSinceLastUpdate ? options.state.lastDocChangeAnalysis : null
  }
  const shouldDeferSelectionOverflowResolution = docChangeAffectsLayout && selectionDirection === null
  let hasTablesCache: boolean | null = null
  const resolveHasTables = () => {
    if (hasTablesCache !== null) {
      return hasTablesCache
    }

    hasTablesCache = options.documentHasTables(currentDoc)
    return hasTablesCache
  }
  let shouldRefreshLayoutBounds = isInitialViewUpdate || docChangeAffectsLayout || selectionDirection !== null
  const finishInstrumentation = startPaginationInstrumentationTimer('pagination-plugin-view-update', {
    activeEditorType: storage.activeEditorType,
    isInitialViewUpdate,
    selectionHead: currentSelectionHead
  })
  let exitReason:
    | 'complete'
    | 'page-count-shrink-refresh'
    | 'page-count-grow-refresh'
    | 'selection-overflow-refresh'
    | 'selection-overflow-deferred-stabilization'
    | 'selection-overflow-selection-adjusted' = 'complete'
  let requestedRefreshSource: Parameters<(typeof options)['onRequestRefresh']>[0] | null = null
  let scheduledDeferredRepagination = false
  let refreshedLayoutBounds = false
  let resetTableController = false

  try {
    if (docChangedSinceLastUpdate && !paginationOwnedDocChange && !tableMetadataOwnedDocChange) {
      resetTableController = true
      options.onResetTableController()
      nextState.previousAddPagesMeasurement = null
      options.onClearGrowthSuppression()
      if (externalDocChange) {
        nextState.runawayGrowthCapPageCount = null
      }
    }

    let pageCountUpdateDecision: ReturnType<typeof resolvePaginationPageCountUpdateDecision> = { type: 'none' }
    const shouldInspectPageCountMismatch =
      storage.activeEditorType === null &&
      !(view as EditorView & { composing?: boolean }).composing &&
      (docChangeAffectsLayout || (isInitialViewUpdate && !resolveHasTables()))

    if (shouldInspectPageCountMismatch) {
      const measurementState = options.resolveMeasurementState(nextState)
      pageCountUpdateDecision = resolvePaginationPageCountUpdateDecision({
        activeEditorType: storage.activeEditorType,
        isComposing: (view as EditorView & { composing?: boolean }).composing === true,
        isInitialViewUpdate,
        docChangeAffectsLayout,
        hasTables: resolveHasTables(),
        paginationOwnedDocChange,
        currentPageCount: measurementState.currentPageCount,
        measuredPageCount: measurementState.measuredPageCount
      })
    }

    if (pageCountUpdateDecision.type === 'refresh') {
      if (pageCountUpdateDecision.shouldClearGrowthSuppression) {
        options.onClearGrowthSuppression()
      }

      if (pageCountUpdateDecision.shouldResetRunawayGrowthCap) {
        nextState.runawayGrowthCapPageCount = null
      }

      if (pageCountUpdateDecision.shouldMarkPendingRefreshDrivenStabilization) {
        nextState.pendingRefreshDrivenStabilization = true
      }

      options.onSetStoredPageCount(pageCountUpdateDecision.nextStoredPageCount)
      nextState.lastKnownSelectionHead = currentSelectionHead
      exitReason =
        pageCountUpdateDecision.refreshSource === 'page-count-shrink'
          ? 'page-count-shrink-refresh'
          : 'page-count-grow-refresh'
      requestedRefreshSource = pageCountUpdateDecision.refreshSource
      options.onRequestRefresh(pageCountUpdateDecision.refreshSource)
      return nextState
    }

    if (
      storage.activeEditorType === null &&
      !(view as EditorView & { composing?: boolean }).composing &&
      !shouldDeferSelectionOverflowResolution
    ) {
      const selectionOverflow = options.resolveSelectionOverflow(view, selectionDirection)
      if (selectionOverflow) {
        const measurementState = options.resolveMeasurementState(nextState)
        const selectionOverflowDecision = resolveSelectionOverflowPaginationDecision({
          activeEditorType: storage.activeEditorType,
          isComposing: (view as EditorView & { composing?: boolean }).composing === true,
          shouldDeferSelectionOverflowResolution,
          hasSelectionOverflow: true,
          hasTables: resolveHasTables(),
          currentPageCount: measurementState.currentPageCount,
          measuredPageCount: measurementState.measuredPageCount,
          docChangedSinceLastUpdate,
          paginationOwnedDocChange,
          hydrationOwnedDocChange
        })

        if (selectionOverflowDecision.type === 'schedule-deferred-refresh') {
          scheduledDeferredRepagination = true
          options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
          nextState.lastKnownSelectionHead = currentSelectionHead
          refreshedLayoutBounds = true
          options.onRefreshLayoutBounds()
          exitReason = 'selection-overflow-deferred-stabilization'
          return nextState
        }

        if (selectionOverflowDecision.type === 'refresh') {
          options.onLogSelectionOverflowRefresh?.({
            currentPageCount: measurementState.currentPageCount,
            measuredPageCount: measurementState.measuredPageCount,
            selectionHead: currentSelectionHead
          })
          if (selectionOverflowDecision.shouldClearGrowthSuppression) {
            options.onClearGrowthSuppression()
          }
          options.onSetStoredPageCount(selectionOverflowDecision.nextStoredPageCount)
          nextState.lastKnownSelectionHead = currentSelectionHead
          exitReason = 'selection-overflow-refresh'
          requestedRefreshSource = selectionOverflowDecision.refreshSource
          options.onRequestRefresh(selectionOverflowDecision.refreshSource)
          return nextState
        }

        const nextSelection = options.createSelection(
          currentDoc,
          selectionOverflow.position,
          selectionDirection === 'backward' ? -1 : 1
        )
        if (!options.selectionsEqual(nextSelection, options.currentSelection)) {
          options.onDispatchSelection(nextSelection)
        }
        if (
          selectionOverflowDecision.type === 'adjust-selection' &&
          selectionOverflowDecision.shouldScheduleDeferredRepagination
        ) {
          scheduledDeferredRepagination = true
          options.onScheduleDeferredRepagination()
        }
        nextState.lastKnownSelectionHead = currentSelectionHead
        refreshedLayoutBounds = true
        options.onRefreshLayoutBounds()
        exitReason = 'selection-overflow-selection-adjusted'
        return nextState
      }
    }

    const hasTablesForDeferredScheduling = isInitialViewUpdate || docChangedSinceLastUpdate ? resolveHasTables() : false
    const deferredSchedulingTriggers = resolvePaginationDeferredSchedulingTriggers({
      activeEditorType: storage.activeEditorType,
      isInitialViewUpdate,
      hasTables: hasTablesForDeferredScheduling,
      pendingRefreshDrivenStabilization: nextState.pendingRefreshDrivenStabilization,
      shouldScheduleDeferredRepaginationOnUpdate:
        docChangedSinceLastUpdate &&
        options.shouldScheduleDeferredRepaginationOnUpdate({
          activeEditorType: storage.activeEditorType,
          hasTables: hasTablesForDeferredScheduling,
          externalDocChange,
          collaborationRemoteDocChange,
          paginationOwnedDocChange:
            paginationOwnedDocChange && !options.state.suppressPaginationOwnedDeferredScheduling,
          hydrationOwnedDocChange,
          docChangeAnalysis
        })
    })

    if (deferredSchedulingTriggers.shouldConsumePendingRefreshDrivenStabilization) {
      nextState.pendingRefreshDrivenStabilization = false
      scheduledDeferredRepagination = true
      options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
      shouldRefreshLayoutBounds = true
    }

    if (deferredSchedulingTriggers.shouldScheduleInitialTableStabilization) {
      scheduledDeferredRepagination = true
      options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
      shouldRefreshLayoutBounds = true
    }

    if (deferredSchedulingTriggers.shouldScheduleUpdateDrivenStabilization) {
      scheduledDeferredRepagination = true
      options.onScheduleDeferredRepagination()
      shouldRefreshLayoutBounds = true
    }

    nextState.lastKnownSelectionHead = currentSelectionHead
    if (shouldRefreshLayoutBounds) {
      refreshedLayoutBounds = true
      options.onRefreshLayoutBounds()
    }
    return nextState
  } finally {
    finishInstrumentation({
      collaborationRemoteDocChange,
      docChangedSinceLastUpdate,
      externalDocChange,
      hasTables: hasTablesCache,
      hydrationOwnedDocChange,
      tableMetadataOwnedDocChange,
      docChangeKind: docChangeAnalysis?.kind ?? null,
      docChangeTouchesTableRegion: docChangeAnalysis?.touchesTableRegion ?? false,
      layoutNeutralDocChange: docChangeAnalysis?.isLayoutNeutral ?? false,
      paginationOwnedDocChange,
      pendingRefreshDrivenStabilization: nextState.pendingRefreshDrivenStabilization,
      refreshedLayoutBounds,
      requestedRefreshSource,
      resetTableController,
      scheduledDeferredRepagination,
      selectionDirection,
      shouldDeferSelectionOverflowResolution,
      shouldRefreshLayoutBounds,
      exitReason
    })
  }
}
