import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView } from '@tiptap/pm/view'
import type { AddPagesMeasurementSnapshot } from './paginationPageCountPolicy'
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
  onRequestRefresh: (source: 'selection-overflow' | 'page-count-shrink') => void
  onScheduleDeferredRepagination: (minimumAttempts?: number) => void
  getDeferredStabilizationAttemptCount: (view: EditorView) => number
  shouldScheduleDeferredRepaginationOnUpdate: (options: {
    activeEditorType: PagesStorage['activeEditorType']
    hasTables: boolean
    externalDocChange: boolean
    paginationOwnedDocChange: boolean
    hydrationOwnedDocChange: boolean
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
  const nextState: PaginationPluginViewRuntimeState = {
    ...options.state,
    lastKnownDoc: currentDoc
  }
  const isInitialViewUpdate = options.state.lastKnownDoc === null
  const docChangedSinceLastUpdate = options.state.lastKnownDoc !== null && currentDoc !== options.state.lastKnownDoc
  const paginationOwnedDocChange = docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'pagination-owned'
  const hydrationOwnedDocChange = docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'hydration-owned'
  const collaborationRemoteDocChange =
    docChangedSinceLastUpdate && options.state.lastDocChangeOrigin === 'collaboration-remote'
  const externalDocChange =
    docChangedSinceLastUpdate && !paginationOwnedDocChange && !hydrationOwnedDocChange && !collaborationRemoteDocChange
  const selectionDirection = resolveSelectionNavigationDirection(
    options.state.lastKnownSelectionHead,
    currentSelectionHead
  )
  const shouldDeferSelectionOverflowResolution = docChangedSinceLastUpdate && selectionDirection === null
  let hasTablesCache: boolean | null = null
  const resolveHasTables = () => {
    if (hasTablesCache !== null) {
      return hasTablesCache
    }

    hasTablesCache = options.documentHasTables(currentDoc)
    return hasTablesCache
  }
  let shouldRefreshLayoutBounds = isInitialViewUpdate || docChangedSinceLastUpdate || selectionDirection !== null

  if (docChangedSinceLastUpdate && !paginationOwnedDocChange) {
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
    docChangedSinceLastUpdate &&
    !shouldDeferSelectionOverflowResolution
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
      options.onRequestRefresh('page-count-shrink')
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

      if (measurementState.measuredPageCount > measurementState.currentPageCount) {
        options.onLogSelectionOverflowRefresh?.({
          currentPageCount: measurementState.currentPageCount,
          measuredPageCount: measurementState.measuredPageCount,
          selectionHead: currentSelectionHead
        })
        options.onClearGrowthSuppression()
        options.onSetStoredPageCount(measurementState.measuredPageCount)
        nextState.lastKnownSelectionHead = currentSelectionHead
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
        options.onScheduleDeferredRepagination()
      }
      nextState.lastKnownSelectionHead = currentSelectionHead
      options.onRefreshLayoutBounds()
      return nextState
    }
  }

  if (nextState.pendingRefreshDrivenStabilization && storage.activeEditorType === null) {
    nextState.pendingRefreshDrivenStabilization = false
    options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
    shouldRefreshLayoutBounds = true
  }

  if (isInitialViewUpdate && storage.activeEditorType === null && resolveHasTables()) {
    options.onScheduleDeferredRepagination(options.getDeferredStabilizationAttemptCount(view))
    shouldRefreshLayoutBounds = true
  }

  if (
    docChangedSinceLastUpdate &&
    options.shouldScheduleDeferredRepaginationOnUpdate({
      activeEditorType: storage.activeEditorType,
      hasTables: resolveHasTables(),
      externalDocChange,
      paginationOwnedDocChange: paginationOwnedDocChange && !options.state.suppressPaginationOwnedDeferredScheduling,
      hydrationOwnedDocChange
    })
  ) {
    options.onScheduleDeferredRepagination()
    shouldRefreshLayoutBounds = true
  }

  nextState.lastKnownSelectionHead = currentSelectionHead
  if (shouldRefreshLayoutBounds) {
    options.onRefreshLayoutBounds()
  }
  return nextState
}
