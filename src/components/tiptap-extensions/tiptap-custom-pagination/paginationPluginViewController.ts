import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView } from '@tiptap/pm/view'
import type { AddPagesMeasurementSnapshot } from './paginationPageCountPolicy'
import { startPaginationInstrumentationTimer } from './paginationInstrumentation'
import type { PaginationTransactionClassification } from './paginationTransactionClassifier'
import type { PagesStorage } from './types'

export type PaginationDocChangeOrigin =
  | 'external'
  | 'pagination-owned'
  | 'hydration-owned'
  | 'collaboration-remote'
  | null
export type SelectionNavigationDirection = 'forward' | 'backward' | null

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

export function resolveSelectionNavigationDirection(
  lastKnownSelectionHead: number | null,
  currentSelectionHead: number
): SelectionNavigationDirection {
  if (lastKnownSelectionHead == null || currentSelectionHead === lastKnownSelectionHead) {
    return null
  }

  return currentSelectionHead > lastKnownSelectionHead ? 'forward' : 'backward'
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
  const collaborationRemoteDocChange =
    docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'collaboration-remote'
  const externalDocChange =
    docChangedSinceLastUpdate && !paginationOwnedDocChange && !hydrationOwnedDocChange && !collaborationRemoteDocChange
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
    if (docChangedSinceLastUpdate && !paginationOwnedDocChange) {
      resetTableController = true
      options.onResetTableController()
      nextState.previousAddPagesMeasurement = null
      options.onClearGrowthSuppression()
      if (externalDocChange) {
        nextState.runawayGrowthCapPageCount = null
      }
    }

    if (
      storage.activeEditorType === null &&
      !(view as EditorView & { composing?: boolean }).composing &&
      docChangeAffectsLayout
    ) {
      const measurementState = options.resolveMeasurementState(nextState)

      if (measurementState.measuredPageCount < measurementState.currentPageCount) {
        if (paginationOwnedDocChange) {
          options.onClearGrowthSuppression()
        }

        nextState.runawayGrowthCapPageCount = null
        if (resolveHasTables()) {
          nextState.pendingRefreshDrivenStabilization = true
        }

        options.onSetStoredPageCount(measurementState.measuredPageCount)
        nextState.lastKnownSelectionHead = currentSelectionHead
        exitReason = 'page-count-shrink-refresh'
        requestedRefreshSource = 'page-count-shrink'
        options.onRequestRefresh('page-count-shrink')
        return nextState
      }

      if (measurementState.measuredPageCount > measurementState.currentPageCount) {
        options.onClearGrowthSuppression()
        options.onSetStoredPageCount(measurementState.measuredPageCount)
        nextState.lastKnownSelectionHead = currentSelectionHead
        exitReason = 'page-count-grow-refresh'
        requestedRefreshSource = 'page-count-grow'
        options.onRequestRefresh('page-count-grow')
        return nextState
      }
    }

    if (
      storage.activeEditorType === null &&
      !(view as EditorView & { composing?: boolean }).composing &&
      !shouldDeferSelectionOverflowResolution
    ) {
      const selectionOverflow = options.resolveSelectionOverflow(view, selectionDirection)
      if (selectionOverflow) {
        const measurementState = options.resolveMeasurementState(nextState)
        const shouldDeferSelectionOverflowRefresh =
          resolveHasTables() && measurementState.measuredPageCount > measurementState.currentPageCount

        if (shouldDeferSelectionOverflowRefresh) {
          scheduledDeferredRepagination = true
          options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
          nextState.lastKnownSelectionHead = currentSelectionHead
          refreshedLayoutBounds = true
          options.onRefreshLayoutBounds()
          exitReason = 'selection-overflow-deferred-stabilization'
          return nextState
        }

        if (measurementState.measuredPageCount > measurementState.currentPageCount) {
          options.onLogSelectionOverflowRefresh?.({
            currentPageCount: measurementState.currentPageCount,
            measuredPageCount: measurementState.measuredPageCount,
            selectionHead: currentSelectionHead
          })
          options.onClearGrowthSuppression()
          options.onSetStoredPageCount(measurementState.measuredPageCount)
          nextState.lastKnownSelectionHead = currentSelectionHead
          exitReason = 'selection-overflow-refresh'
          requestedRefreshSource = 'selection-overflow'
          options.onRequestRefresh('selection-overflow')
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
        if (docChangedSinceLastUpdate || paginationOwnedDocChange || hydrationOwnedDocChange) {
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

    if (nextState.pendingRefreshDrivenStabilization && storage.activeEditorType === null) {
      nextState.pendingRefreshDrivenStabilization = false
      scheduledDeferredRepagination = true
      options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
      shouldRefreshLayoutBounds = true
    }

    if (isInitialViewUpdate && storage.activeEditorType === null && resolveHasTables()) {
      scheduledDeferredRepagination = true
      options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
      shouldRefreshLayoutBounds = true
    }

    if (
      docChangedSinceLastUpdate &&
      options.shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: storage.activeEditorType,
        hasTables: resolveHasTables(),
        externalDocChange,
        collaborationRemoteDocChange,
        paginationOwnedDocChange: paginationOwnedDocChange && !options.state.suppressPaginationOwnedDeferredScheduling,
        hydrationOwnedDocChange,
        docChangeAnalysis
      })
    ) {
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
