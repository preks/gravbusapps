// Pure pagination view decisions shared by runtime and tests.

import type { PagesStorage } from './types'

export type SelectionNavigationDirection = 'forward' | 'backward' | null

export function resolveSelectionNavigationDirection(
  lastKnownSelectionHead: number | null,
  currentSelectionHead: number
): SelectionNavigationDirection {
  if (lastKnownSelectionHead == null || currentSelectionHead === lastKnownSelectionHead) {
    return null
  }

  return currentSelectionHead > lastKnownSelectionHead ? 'forward' : 'backward'
}

// Initial table opens recover upward in deferred stabilization, not here.
export function resolvePaginationPageCountUpdateDecision(options: {
  activeEditorType: PagesStorage['activeEditorType']
  isComposing: boolean
  isInitialViewUpdate: boolean
  docChangeAffectsLayout: boolean
  hasTables: boolean
  paginationOwnedDocChange: boolean
  currentPageCount: number
  measuredPageCount: number
}) {
  const {
    activeEditorType,
    isComposing,
    isInitialViewUpdate,
    docChangeAffectsLayout,
    hasTables,
    paginationOwnedDocChange,
    currentPageCount,
    measuredPageCount
  } = options

  const canEvaluatePageCountMismatch =
    activeEditorType === null && !isComposing && (docChangeAffectsLayout || (isInitialViewUpdate && !hasTables))

  if (!canEvaluatePageCountMismatch) {
    return {
      type: 'none' as const
    }
  }

  if (measuredPageCount < currentPageCount) {
    return {
      type: 'refresh' as const,
      refreshSource: 'page-count-shrink' as const,
      nextStoredPageCount: measuredPageCount,
      shouldClearGrowthSuppression: paginationOwnedDocChange,
      shouldResetRunawayGrowthCap: true,
      shouldMarkPendingRefreshDrivenStabilization: docChangeAffectsLayout && hasTables
    }
  }

  if (measuredPageCount > currentPageCount) {
    return {
      type: 'refresh' as const,
      refreshSource: 'page-count-grow' as const,
      nextStoredPageCount: measuredPageCount,
      shouldClearGrowthSuppression: true,
      shouldResetRunawayGrowthCap: true,
      shouldMarkPendingRefreshDrivenStabilization: false
    }
  }

  return {
    type: 'none' as const
  }
}

// Keep deferred scheduling reasons separate so table/ToC changes stay local.
export function resolvePaginationDeferredSchedulingTriggers(options: {
  activeEditorType: PagesStorage['activeEditorType']
  isInitialViewUpdate: boolean
  hasTables: boolean
  pendingRefreshDrivenStabilization: boolean
  shouldScheduleDeferredRepaginationOnUpdate: boolean
}) {
  const {
    activeEditorType,
    isInitialViewUpdate,
    hasTables,
    pendingRefreshDrivenStabilization,
    shouldScheduleDeferredRepaginationOnUpdate
  } = options

  if (activeEditorType !== null) {
    return {
      shouldConsumePendingRefreshDrivenStabilization: false,
      shouldScheduleInitialTableStabilization: false,
      shouldScheduleUpdateDrivenStabilization: false
    }
  }

  return {
    shouldConsumePendingRefreshDrivenStabilization: pendingRefreshDrivenStabilization,
    shouldScheduleInitialTableStabilization: isInitialViewUpdate && hasTables,
    shouldScheduleUpdateDrivenStabilization: shouldScheduleDeferredRepaginationOnUpdate
  }
}

// Selection overflow has its own rules because table docs can know about pages
// that are not mounted yet.
export function resolveSelectionOverflowPaginationDecision(options: {
  activeEditorType: PagesStorage['activeEditorType']
  isComposing: boolean
  shouldDeferSelectionOverflowResolution: boolean
  hasSelectionOverflow: boolean
  hasTables: boolean
  currentPageCount: number
  measuredPageCount: number
  docChangedSinceLastUpdate: boolean
  paginationOwnedDocChange: boolean
  hydrationOwnedDocChange: boolean
}) {
  const {
    activeEditorType,
    isComposing,
    shouldDeferSelectionOverflowResolution,
    hasSelectionOverflow,
    hasTables,
    currentPageCount,
    measuredPageCount,
    docChangedSinceLastUpdate,
    paginationOwnedDocChange,
    hydrationOwnedDocChange
  } = options

  const canResolveSelectionOverflow =
    activeEditorType === null && !isComposing && !shouldDeferSelectionOverflowResolution && hasSelectionOverflow

  if (!canResolveSelectionOverflow) {
    return {
      type: 'none' as const
    }
  }

  if (hasTables && measuredPageCount > currentPageCount) {
    return {
      type: 'schedule-deferred-refresh' as const
    }
  }

  if (measuredPageCount > currentPageCount) {
    return {
      type: 'refresh' as const,
      refreshSource: 'selection-overflow' as const,
      nextStoredPageCount: measuredPageCount,
      shouldClearGrowthSuppression: true
    }
  }

  return {
    type: 'adjust-selection' as const,
    shouldScheduleDeferredRepagination: docChangedSinceLastUpdate || paginationOwnedDocChange || hydrationOwnedDocChange
  }
}
