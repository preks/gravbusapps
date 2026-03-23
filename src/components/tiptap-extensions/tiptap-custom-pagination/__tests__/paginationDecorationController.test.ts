import { renderPaginationChromeWidget, resolvePaginationChromeWidgetState } from '../paginationDecorationController'

describe('resolvePaginationChromeWidgetState', () => {
  it('derives stored and effective totals from the shared measurement state', () => {
    const view = {
      dom: document.createElement('div')
    } as never
    const storage = {
      pageCount: 4
    } as never

    const result = resolvePaginationChromeWidgetState({
      view,
      storage,
      runtimeOptions: {} as never,
      previousAddPagesMeasurement: null,
      cappedPageCount: 6,
      growthSuppressionPageCount: 5,
      measureHeights: () => ({
        headerHeights: new Map(),
        footerHeights: new Map()
      }),
      resolveMeasurementState: () => ({
        measured: {
          headerHeights: new Map(),
          footerHeights: new Map()
        },
        currentPageCount: 4,
        rawMeasuredPageCount: 8,
        measuredPageCount: 6,
        pageCountDebugInfo: null,
        runawayPageGrowthResolution: {
          effectivePageCount: 6,
          cappedPageCount: 6,
          suppressionActive: true,
          runawayPageGrowthCheck: {
            shouldStabilize: true,
            actualGapShrink: null,
            expectedGapShrink: null,
            gapShrinkRatio: null
          }
        },
        nextAddPagesMeasurement: null,
        pageCountReason: 'add-pages',
        lastMeasuredPageGap: 42
      })
    })

    expect(result.widgetState).toEqual({
      rawMeasuredPageCount: 8,
      measuredPageCount: 6,
      storedPageCount: 4,
      totalPages: 5,
      pageCountReason: 'add-pages',
      lastMeasuredPageGap: 42,
      cappedPageCount: 6
    })
  })
})

describe('renderPaginationChromeWidget', () => {
  it('updates storage, logs the widget pass, and renders chrome', () => {
    const rendered = document.createElement('div')
    const view = {
      dom: document.createElement('div')
    } as never
    const storage = {
      pageCount: 4
    } as never
    const renderChrome = jest.fn(() => rendered)
    const onLogDebug = jest.fn()

    const result = renderPaginationChromeWidget({
      view,
      storage,
      runtimeOptions: {} as never,
      previousAddPagesMeasurement: null,
      cappedPageCount: null,
      growthSuppressionPageCount: null,
      measureHeights: () => ({
        headerHeights: new Map(),
        footerHeights: new Map()
      }),
      widgetPassId: 3,
      renderChrome,
      onOpenEditor: jest.fn(),
      onLogDebug,
      resolveChromeWidgetState: () => ({
        measurementState: {
          measured: {
            headerHeights: new Map(),
            footerHeights: new Map()
          },
          currentPageCount: 4,
          rawMeasuredPageCount: 6,
          measuredPageCount: 5,
          pageCountDebugInfo: null,
          runawayPageGrowthResolution: {
            effectivePageCount: 5,
            cappedPageCount: null,
            suppressionActive: false,
            runawayPageGrowthCheck: {
              shouldStabilize: false,
              actualGapShrink: null,
              expectedGapShrink: null,
              gapShrinkRatio: null
            }
          },
          nextAddPagesMeasurement: null,
          pageCountReason: 'add-pages',
          lastMeasuredPageGap: 120
        },
        widgetState: {
          rawMeasuredPageCount: 6,
          measuredPageCount: 5,
          storedPageCount: 4,
          totalPages: 5,
          pageCountReason: 'add-pages',
          lastMeasuredPageGap: 120,
          cappedPageCount: null
        }
      })
    })

    expect(result).toBe(rendered)
    expect(storage.pageCount).toBe(5)
    expect(renderChrome).toHaveBeenCalled()
    expect(onLogDebug).toHaveBeenCalledWith(
      'header-total-pages',
      expect.objectContaining({
        widgetPassId: 3,
        totalPages: 5,
        pageCountReason: 'add-pages'
      })
    )
  })
})
