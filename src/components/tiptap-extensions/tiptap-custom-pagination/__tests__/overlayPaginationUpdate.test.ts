import { applyOverlayPaginationUpdate, handleOverlayPaginationContentUpdate } from '../overlayPaginationUpdate'

describe('applyOverlayPaginationUpdate', () => {
  it('refreshes presentation when page count is stable', () => {
    const events: string[] = []

    const result = applyOverlayPaginationUpdate({
      currentPageCount: 4,
      measuredPageCount: 4,
      onSetStoredPageCount: pageCount => {
        events.push(`set:${pageCount}`)
      },
      onClearGrowthSuppression: () => {
        events.push('clear-growth-suppression')
      },
      onCloseOverlay: () => {
        events.push('close-overlay')
      },
      onReopenOverlay: () => {
        events.push('reopen-overlay')
      },
      onRefreshPresentation: () => {
        events.push('refresh-presentation')
      }
    })

    expect(result).toEqual({ reopened: false })
    expect(events).toEqual(['set:4', 'refresh-presentation'])
  })

  it('closes and reopens the overlay when page count changes', () => {
    const events: string[] = []

    const result = applyOverlayPaginationUpdate({
      currentPageCount: 4,
      measuredPageCount: 6,
      onSetStoredPageCount: pageCount => {
        events.push(`set:${pageCount}`)
      },
      onClearGrowthSuppression: () => {
        events.push('clear-growth-suppression')
      },
      onCloseOverlay: () => {
        events.push('close-overlay')
      },
      onReopenOverlay: () => {
        events.push('reopen-overlay')
      },
      onRefreshPresentation: () => {
        events.push('refresh-presentation')
      }
    })

    expect(result).toEqual({ reopened: true })
    expect(events).toEqual(['set:4', 'clear-growth-suppression', 'set:6', 'close-overlay', 'reopen-overlay'])
  })
})

describe('handleOverlayPaginationContentUpdate', () => {
  it('returns not handled when measurement is unavailable', () => {
    const onRefreshPresentation = jest.fn()

    expect(
      handleOverlayPaginationContentUpdate({
        measure: () => null,
        onSetStoredPageCount: () => undefined,
        onClearGrowthSuppression: () => undefined,
        onCloseOverlay: () => undefined,
        onReopenOverlay: () => undefined,
        onRefreshPresentation
      })
    ).toEqual({
      handled: false,
      reopened: false
    })

    expect(onRefreshPresentation).not.toHaveBeenCalled()
  })

  it('applies measurement context and refreshes presentation when stable', () => {
    const events: string[] = []

    const result = handleOverlayPaginationContentUpdate({
      measure: () => ({
        currentPageCount: 5,
        measuredPageCount: 5,
        context: { editorDomId: 'root' }
      }),
      onMeasured: context => {
        events.push(`measured:${context.editorDomId}`)
      },
      onSetStoredPageCount: pageCount => {
        events.push(`set:${pageCount}`)
      },
      onClearGrowthSuppression: () => {
        events.push('clear-growth-suppression')
      },
      onCloseOverlay: () => {
        events.push('close-overlay')
      },
      onReopenOverlay: () => {
        events.push('reopen-overlay')
      },
      onRefreshPresentation: context => {
        events.push(`refresh:${context.editorDomId}`)
      }
    })

    expect(result).toEqual({
      handled: true,
      reopened: false
    })
    expect(events).toEqual(['measured:root', 'set:5', 'refresh:root'])
  })
})
