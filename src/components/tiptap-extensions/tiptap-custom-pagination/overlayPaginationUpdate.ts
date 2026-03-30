export function applyOverlayPaginationUpdate(options: {
  currentPageCount: number
  measuredPageCount: number
  onSetStoredPageCount: (pageCount: number) => void
  onClearGrowthSuppression: () => void
  onCloseOverlay: () => void
  onReopenOverlay: () => void
  onRefreshPresentation: () => void
}) {
  const {
    currentPageCount,
    measuredPageCount,
    onSetStoredPageCount,
    onClearGrowthSuppression,
    onCloseOverlay,
    onReopenOverlay,
    onRefreshPresentation
  } = options

  onSetStoredPageCount(currentPageCount)

  if (measuredPageCount !== currentPageCount) {
    onClearGrowthSuppression()
    onSetStoredPageCount(measuredPageCount)
    onCloseOverlay()
    onReopenOverlay()
    return {
      reopened: true
    }
  }

  onRefreshPresentation()
  return {
    reopened: false
  }
}

export function handleOverlayPaginationContentUpdate<TContext>(options: {
  measure: () => {
    currentPageCount: number
    measuredPageCount: number
    context: TContext
  } | null
  onMeasured?: (context: TContext) => void
  onSetStoredPageCount: (pageCount: number) => void
  onClearGrowthSuppression: () => void
  onCloseOverlay: () => void
  onReopenOverlay: () => void
  onRefreshPresentation: (context: TContext) => void
}) {
  const measurement = options.measure()
  if (!measurement) {
    return {
      handled: false,
      reopened: false
    }
  }

  options.onMeasured?.(measurement.context)
  const updateResult = applyOverlayPaginationUpdate({
    currentPageCount: measurement.currentPageCount,
    measuredPageCount: measurement.measuredPageCount,
    onSetStoredPageCount: options.onSetStoredPageCount,
    onClearGrowthSuppression: options.onClearGrowthSuppression,
    onCloseOverlay: options.onCloseOverlay,
    onReopenOverlay: options.onReopenOverlay,
    onRefreshPresentation: () => {
      options.onRefreshPresentation(measurement.context)
    }
  })

  return {
    handled: true,
    reopened: updateResult.reopened
  }
}
