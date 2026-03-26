import { openManagedPaginationOverlay, openPaginationOverlay } from '../overlayOpenController'

describe('openPaginationOverlay', () => {
  it('opens the overlay with derived initial content and extensions', () => {
    const overlayManager = {
      open: jest.fn()
    } as never

    const storage = {
      getPageCount: () => 3
    } as never

    const runtimeOptions = {
      headerFooterExtensions: []
    } as never

    const target = document.createElement('div')

    openPaginationOverlay({
      overlayManager,
      storage,
      runtimeOptions,
      activeEditor: { type: 'header', pageNumber: 2 },
      target,
      onUpdate: () => undefined,
      onClose: () => undefined
    })

    expect((overlayManager as { open: jest.Mock }).open).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'header',
        pageNumber: 2,
        target,
        storage,
        options: runtimeOptions,
        onUpdate: expect.any(Function),
        onClose: expect.any(Function)
      })
    )
  })
})

describe('openManagedPaginationOverlay', () => {
  it('routes overlay updates through the shared content-update controller', () => {
    const overlayManager = {
      open: jest.fn()
    } as never

    const storage = {
      getPageCount: () => 2
    } as never

    const runtimeOptions = {
      headerFooterExtensions: []
    } as never

    const target = document.createElement('div')
    const events: string[] = []

    openManagedPaginationOverlay({
      overlayManager,
      storage,
      runtimeOptions,
      activeEditor: { type: 'footer', pageNumber: 1 },
      target,
      measure: () => ({
        currentPageCount: 2,
        measuredPageCount: 2,
        context: { editorDom: document.createElement('div'), marker: 'stable' }
      }),
      onMeasured: context => {
        events.push(`measured:${context.marker}`)
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
        events.push(`refresh:${context.marker}`)
      },
      onClose: () => {
        events.push('closed')
      }
    })

    const openCall = (overlayManager as { open: jest.Mock }).open.mock.calls[0]?.[0]
    expect(openCall).toBeDefined()
    openCall.onUpdate()

    expect(events).toEqual(['measured:stable', 'set:2', 'refresh:stable'])
  })
})
