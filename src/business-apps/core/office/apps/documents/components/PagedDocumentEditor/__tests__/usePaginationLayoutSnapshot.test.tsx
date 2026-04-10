import type { MutableRefObject, UIEvent } from 'react'
import { act, renderHook } from '@testing-library/react'
import type { Transaction } from '@tiptap/pm/state'
import type { DocumentLayoutMeasurementRequest, DocumentLayoutPageSnapshot } from '../../../types'
import { LARGE_DOC_PAGE_YIELD_THRESHOLD } from '@/components/tiptap-extensions/tiptap-custom-pagination/deferredRepaginationEvaluationController'
import {
  PAGINATION_OWNED_DOC_CHANGE_META,
  PAGINATION_REFRESH_META
} from '@/components/tiptap-extensions/tiptap-custom-pagination/PaginationPlus'
import * as documentLayoutServiceModule from '../documentLayoutService'
import type { DocumentLayoutService } from '../documentLayoutService'
import * as documentLayoutScheduler from '../documentLayoutScheduler'
import {
  mergeDocumentLayoutPagePositionRanges,
  resolveCurrentPageFromPositionRanges,
  resolveCurrentPageFromPageBounds,
  resolveMountedPagePositionRanges,
  resolvePreferredActiveRange,
  resolveRetainedPagePositionRanges,
  resolveSpacerPageBodyBounds,
  resolveSpacerPagePositionRanges,
  shouldRefreshViewportWindow,
  shouldUseWindowedLayout,
  shouldScheduleDocumentHydrationRefresh,
  usePaginationLayoutSnapshot
} from '../hooks/usePaginationLayoutSnapshot'

function createPageSnapshots(pageCount: number): DocumentLayoutPageSnapshot[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1,
    flowIndex: index,
    mountedIndex: index,
    isMounted: true
  }))
}

function createLayoutServiceStub(pageCount = 30) {
  const pages = createPageSnapshots(pageCount)
  const measureLayout = jest.fn((_container: HTMLDivElement, request: DocumentLayoutMeasurementRequest) => ({
    layout: {
      pageCount,
      pages,
      flow: pages.map((page, index) => ({
        flowIndex: index,
        pageRange: { startPage: page.pageNumber, endPage: page.pageNumber },
        kind: 'page-break' as const,
        isMounted: true
      })),
      mountedRange: { startPage: 1, endPage: pageCount },
      mountedPageBodyBounds: pages.map(page => ({
        pageNumber: page.pageNumber,
        top: page.pageNumber * 100,
        bottom: page.pageNumber * 100 + 80,
        left: 10,
        right: 110
      })),
      pageChromeMetrics: pages.map(page => ({
        pageNumber: page.pageNumber,
        headerHeight: 40,
        footerHeight: 40
      })),
      activeRange: request.pageRange,
      activePages: request.pageRange ? pages.slice(request.pageRange.startPage - 1, request.pageRange.endPage) : pages
    },
    navigationState: {
      boundaryEls: [],
      activeRange: request.pageRange,
      pageBreakEls: [],
      flowEls: []
    }
  }))

  const service: DocumentLayoutService = {
    source: 'incremental-layout-engine',
    measureLayout,
    resolveCurrentPage: jest.fn(() => 1),
    observeLayout: jest.fn(() => () => {
      return undefined
    })
  }

  return {
    measureLayout,
    service
  }
}

function createSparseLayoutServiceStub(options?: {
  pageCount?: number
  initialResolvedCurrentPage?: number
  initialVisiblePage?: number
}) {
  const pageCount = options?.pageCount ?? 30
  const pageHeight = 100
  const viewportCenterY = 100
  const pages = createPageSnapshots(pageCount)
  const spacer = document.createElement('div')
  spacer.className = 'rm-page-spacer'
  spacer.dataset.rmPageRangeStart = '1'
  spacer.dataset.rmPageRangeEnd = String(pageCount)
  spacer.dataset.rmPageSegmentHeights = Array.from({ length: pageCount }, () => String(pageHeight)).join(',')

  let visiblePage = options?.initialVisiblePage ?? 1
  const resolveSpacerTop = () => viewportCenterY - (visiblePage - 0.5) * pageHeight
  spacer.getBoundingClientRect = () =>
    ({
      left: 40,
      right: 160,
      top: resolveSpacerTop(),
      bottom: resolveSpacerTop() + pageCount * pageHeight
    }) as DOMRect

  let resolvedCurrentPage = options?.initialResolvedCurrentPage ?? 1
  const resolveCurrentPage = jest.fn(() => resolvedCurrentPage)
  const measureLayout = jest.fn((_container: HTMLDivElement, request: DocumentLayoutMeasurementRequest) => {
    const activeRange = request.pageRange ?? { startPage: 1, endPage: pageCount }

    return {
      layout: {
        pageCount,
        pages,
        flow: [
          {
            flowIndex: 0,
            pageRange: { startPage: 1, endPage: pageCount },
            kind: 'spacer' as const,
            isMounted: false
          }
        ],
        mountedRange: null,
        mountedPageBodyBounds: [],
        pageChromeMetrics: [],
        activeRange,
        activePages: pages.slice(activeRange.startPage - 1, activeRange.endPage)
      },
      navigationState: {
        boundaryEls: [],
        activeRange,
        pageBreakEls: [],
        flowEls: [spacer]
      }
    }
  })

  const service: DocumentLayoutService = {
    source: 'incremental-layout-engine',
    measureLayout,
    resolveCurrentPage,
    observeLayout: jest.fn(() => () => {
      return undefined
    })
  }

  return {
    measureLayout,
    resolveCurrentPage,
    setResolvedCurrentPage: (pageNumber: number) => {
      resolvedCurrentPage = pageNumber
    },
    setVisiblePage: (pageNumber: number) => {
      visiblePage = pageNumber
    },
    service
  }
}

function createEditorStub(options: {
  selectionHead: number
  posAtCoords: ({ left, top }: { left: number; top: number }) => { pos: number } | null
}) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const viewDom = document.createElement('div')

  const on = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    const registeredHandlers = listeners.get(event) ?? new Set<(...args: unknown[]) => void>()
    registeredHandlers.add(handler)
    listeners.set(event, registeredHandlers)
  })

  const off = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    listeners.get(event)?.delete(handler)
  })

  return {
    state: {
      doc: {
        descendants: () => {
          return undefined
        }
      },
      selection: {
        head: options.selectionHead
      }
    },
    view: {
      dom: viewDom,
      posAtCoords: options.posAtCoords
    },
    on,
    off,
    emit: (event: string, payload?: unknown) => {
      listeners.get(event)?.forEach(handler => handler(payload))
    }
  }
}

describe('usePaginationLayoutSnapshot', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame
  const originalCancelAnimationFrame = global.cancelAnimationFrame

  beforeEach(() => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }
    global.cancelAnimationFrame = () => undefined
  })

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame
    global.cancelAnimationFrame = originalCancelAnimationFrame
  })

  it('requires a document id, sync readiness, and an initialized layout before scheduling hydration', () => {
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: undefined,
        isYjsSynced: true,
        hasInitializedLayout: true
      })
    ).toBe(false)
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: 'doc-1',
        isYjsSynced: false,
        hasInitializedLayout: true
      })
    ).toBe(false)
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: 'doc-1',
        isYjsSynced: true,
        hasInitializedLayout: false
      })
    ).toBe(false)
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: 'doc-1',
        isYjsSynced: true,
        hasInitializedLayout: true
      })
    ).toBe(true)
  })

  it('avoids duplicating hydration work on the initial synced mount', () => {
    const { service, measureLayout } = createLayoutServiceStub()
    const editorContainerRef = {
      current: document.createElement('div')
    } as MutableRefObject<HTMLDivElement | null>

    renderHook(
      props =>
        usePaginationLayoutSnapshot({
          editor: null,
          editorContainerRef,
          layoutService: service,
          ...props
        }),
      {
        initialProps: {
          documentId: 'doc-1',
          isYjsSynced: true,
          layoutInputsKey: 'layout-1'
        }
      }
    )

    expect(measureLayout).toHaveBeenCalledTimes(1)
    expect(measureLayout.mock.calls[0]?.[1].reason).toBe('initial-load')
  })

  it('reuses measured mounted bounds and only reads placeholder shell bounds during rebuild', () => {
    const mountedPageBreak = document.createElement('div')
    mountedPageBreak.className = 'rm-page-break'
    mountedPageBreak.dataset.rmPageShellState = 'hydrated'
    const mountedBody = document.createElement('div')
    mountedBody.className = 'page'
    mountedBody.dataset.rmPageNumber = '1'
    mountedPageBreak.appendChild(mountedBody)
    mountedBody.getBoundingClientRect = () =>
      ({
        top: 20,
        bottom: 120,
        left: 10,
        right: 90
      }) as DOMRect

    const placeholderPageBreak = document.createElement('div')
    placeholderPageBreak.className = 'rm-page-break'
    placeholderPageBreak.dataset.rmPageShellState = 'placeholder'
    const placeholderBody = document.createElement('div')
    placeholderBody.className = 'page'
    placeholderBody.dataset.rmPageNumber = '2'
    placeholderPageBreak.appendChild(placeholderBody)
    placeholderBody.getBoundingClientRect = () =>
      ({
        top: 120,
        bottom: 220,
        left: 10,
        right: 90
      }) as DOMRect

    const pages = [
      { pageNumber: 1, flowIndex: 0, mountedIndex: 0, isMounted: true },
      { pageNumber: 2, flowIndex: 1, mountedIndex: null, isMounted: false }
    ]
    const measureLayout = jest.fn((_container: HTMLDivElement, request: DocumentLayoutMeasurementRequest) => ({
      layout: {
        pageCount: 2,
        pages,
        flow: [
          { flowIndex: 0, pageRange: { startPage: 1, endPage: 1 }, kind: 'page-break' as const, isMounted: true },
          { flowIndex: 1, pageRange: { startPage: 2, endPage: 2 }, kind: 'page-break' as const, isMounted: false }
        ],
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageBodyBounds: [{ pageNumber: 1, top: 100, bottom: 180, left: 20, right: 100 }],
        pageChromeMetrics: [],
        activeRange: request.pageRange ?? { startPage: 1, endPage: 2 },
        activePages: pages
      },
      navigationState: {
        boundaryEls: [],
        activeRange: request.pageRange ?? { startPage: 1, endPage: 2 },
        pageBreakEls: [mountedPageBreak, placeholderPageBreak],
        flowEls: [mountedPageBreak, placeholderPageBreak]
      }
    }))

    const service: DocumentLayoutService = {
      source: 'incremental-layout-engine',
      measureLayout,
      resolveCurrentPage: jest.fn(() => 1),
      observeLayout: jest.fn(() => () => undefined)
    }
    const editorContainerRef = {
      current: document.createElement('div')
    } as MutableRefObject<HTMLDivElement | null>
    editorContainerRef.current.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 200,
        height: 200
      }) as DOMRect

    const { result } = renderHook(() =>
      usePaginationLayoutSnapshot({
        editor: null,
        editorContainerRef,
        layoutService: service,
        isYjsSynced: false
      })
    )

    expect(result.current.layoutSnapshot.mountedPageBodyBounds).toEqual([
      { pageNumber: 1, top: 100, bottom: 180, left: 20, right: 100 }
    ])
    expect(result.current.layoutSnapshot.pageBounds).toEqual([
      { pageNumber: 1, top: 100, bottom: 180, left: 20, right: 100 },
      { pageNumber: 2, top: 120, bottom: 220, left: 10, right: 90 }
    ])
  })

  it('prefers fresh page and spacer bounds over the live layout-service resolver while scrolling', () => {
    const { service, resolveCurrentPage, setResolvedCurrentPage, setVisiblePage } = createSparseLayoutServiceStub({
      pageCount: 30,
      initialResolvedCurrentPage: 30,
      initialVisiblePage: 1
    })
    const container = document.createElement('div')
    container.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 200,
        height: 200
      }) as DOMRect
    const editorContainerRef = {
      current: container
    } as MutableRefObject<HTMLDivElement | null>

    const { result } = renderHook(() =>
      usePaginationLayoutSnapshot({
        editor: null,
        editorContainerRef,
        layoutService: service,
        isYjsSynced: false
      })
    )

    expect(result.current.currentPage).toBe(1)
    expect(resolveCurrentPage).not.toHaveBeenCalled()
    setVisiblePage(10)
    setResolvedCurrentPage(30)

    act(() => {
      result.current.handleScroll({ currentTarget: container } as UIEvent<HTMLDivElement>)
    })

    expect(result.current.currentPage).toBe(10)
    expect(resolveCurrentPage).not.toHaveBeenCalled()
  })

  it('uses the fresh visible page as the preferred page during selection updates at the trailing edge', () => {
    const { service, resolveCurrentPage, setResolvedCurrentPage, setVisiblePage } = createSparseLayoutServiceStub({
      pageCount: 4,
      initialResolvedCurrentPage: 1,
      initialVisiblePage: 1
    })
    const container = document.createElement('div')
    container.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 200,
        height: 200
      }) as DOMRect
    const editorContainerRef = {
      current: container
    } as MutableRefObject<HTMLDivElement | null>
    const editor = createEditorStub({
      selectionHead: 59,
      posAtCoords: ({ top }: { left: number; top: number }) => {
        if (top < 100) {
          return { pos: top < 50 ? 1 : 19 }
        }
        if (top < 200) {
          return { pos: top < 150 ? 20 : 39 }
        }
        if (top < 300) {
          return { pos: top < 250 ? 40 : 59 }
        }
        return null
      }
    })

    const { result } = renderHook(() =>
      usePaginationLayoutSnapshot({
        editor: editor as never,
        editorContainerRef,
        layoutService: service,
        isYjsSynced: false
      })
    )

    expect(result.current.currentPage).toBe(1)
    expect(resolveCurrentPage).not.toHaveBeenCalled()
    setVisiblePage(4)
    setResolvedCurrentPage(1)

    act(() => {
      editor.emit('selectionUpdate')
    })

    expect(result.current.currentPage).toBe(4)
    expect(resolveCurrentPage).not.toHaveBeenCalled()
  })

  it('resolves mounted page position ranges from sampled page body coordinates', () => {
    const ranges = resolveMountedPagePositionRanges(
      {
        view: {
          posAtCoords: ({ top }: { left: number; top: number }) =>
            top < 200
              ? {
                  pos: 12
                }
              : {
                  pos: 38
                }
        }
      } as never,
      [{ pageNumber: 2, top: 100, bottom: 220, left: 20, right: 140 }]
    )

    expect(ranges).toEqual([{ pageNumber: 2, startPos: 12, endPos: 38 }])
  })

  it('merges sampled positions from multiple mounted wrap bands on the same page', () => {
    const ranges = resolveMountedPagePositionRanges(
      {
        view: {
          state: {
            doc: {}
          },
          posAtCoords: ({ left, top }: { left: number; top: number }) => {
            if (top < 140) {
              return {
                pos: left < 80 ? 12 : 16
              }
            }

            return {
              pos: left < 80 ? 34 : 39
            }
          }
        }
      } as never,
      [
        { pageNumber: 2, top: 100, bottom: 140, left: 20, right: 80 },
        { pageNumber: 2, top: 140, bottom: 220, left: 80, right: 140 }
      ]
    )

    expect(ranges).toEqual([{ pageNumber: 2, startPos: 12, endPos: 39 }])
  })

  it('reuses cached mounted page position ranges when doc and bounds are unchanged', () => {
    const posAtCoords = jest.fn(({ top }: { left: number; top: number }) =>
      top < 200
        ? {
            pos: 12
          }
        : {
            pos: 38
          }
    )
    const doc = {}
    const editor = {
      view: {
        state: {
          doc
        },
        posAtCoords
      }
    } as never
    const bounds = [{ pageNumber: 2, top: 100, bottom: 220, left: 20, right: 140 }]

    expect(resolveMountedPagePositionRanges(editor, bounds)).toEqual([{ pageNumber: 2, startPos: 12, endPos: 38 }])
    expect(resolveMountedPagePositionRanges(editor, bounds)).toEqual([{ pageNumber: 2, startPos: 12, endPos: 38 }])
    expect(posAtCoords).toHaveBeenCalledTimes(9)
  })

  it('resolves spacer page position ranges from page-segment metadata', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '7'
    spacer.dataset.rmPageRangeEnd = '8'
    spacer.dataset.rmPageSegmentHeights = '80,120'
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 400,
        bottom: 600
      }) as DOMRect

    const ranges = resolveSpacerPagePositionRanges(
      {
        view: {
          state: {
            doc: {}
          },
          posAtCoords: ({ top }: { left: number; top: number }) =>
            top < 480
              ? {
                  pos: top < 440 ? 70 : 79
                }
              : {
                  pos: top < 540 ? 80 : 99
                }
        }
      } as never,
      [spacer]
    )

    expect(ranges).toEqual([
      { pageNumber: 7, startPos: 70, endPos: 79 },
      { pageNumber: 8, startPos: 80, endPos: 99 }
    ])
  })

  it('reuses cached spacer page position ranges when doc and spacer bounds are unchanged', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '7'
    spacer.dataset.rmPageRangeEnd = '8'
    spacer.dataset.rmPageSegmentHeights = '80,120'
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 400,
        bottom: 600
      }) as DOMRect

    const posAtCoords = jest.fn(({ top }: { left: number; top: number }) =>
      top < 480
        ? {
            pos: top < 440 ? 70 : 79
          }
        : {
            pos: top < 540 ? 80 : 99
          }
    )
    const editor = {
      view: {
        state: {
          doc: {}
        },
        posAtCoords
      }
    } as never

    expect(resolveSpacerPagePositionRanges(editor, [spacer])).toEqual([
      { pageNumber: 7, startPos: 70, endPos: 79 },
      { pageNumber: 8, startPos: 80, endPos: 99 }
    ])
    expect(resolveSpacerPagePositionRanges(editor, [spacer])).toEqual([
      { pageNumber: 7, startPos: 70, endPos: 79 },
      { pageNumber: 8, startPos: 80, endPos: 99 }
    ])
    expect(posAtCoords).toHaveBeenCalledTimes(6)
  })

  it('resolves spacer page body bounds from page-segment metadata', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '7'
    spacer.dataset.rmPageRangeEnd = '8'
    spacer.dataset.rmPageSegmentHeights = '80,120'
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 400,
        bottom: 600
      }) as DOMRect

    expect(resolveSpacerPageBodyBounds([spacer])).toEqual([
      { pageNumber: 7, top: 400, bottom: 480, left: 40, right: 160 },
      { pageNumber: 8, top: 480, bottom: 600, left: 40, right: 160 }
    ])
  })

  it('reuses retained page position ranges only for the requested placeholder pages', () => {
    expect(
      resolveRetainedPagePositionRanges(
        [
          { pageNumber: 1, startPos: 1, endPos: 9 },
          { pageNumber: 2, startPos: 10, endPos: 19 },
          { pageNumber: 3, startPos: 20, endPos: 29 }
        ],
        new Set([1, 3, 4])
      )
    ).toEqual([
      { pageNumber: 1, startPos: 1, endPos: 9 },
      { pageNumber: 3, startPos: 20, endPos: 29 }
    ])
  })

  it('derives current page from snapshot page bounds without DOM navigation state', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '1'
    spacer.dataset.rmPageRangeEnd = '30'
    spacer.dataset.rmPageSegmentHeights = Array.from({ length: 30 }, () => '100').join(',')
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 0,
        bottom: 3000
      }) as DOMRect

    const pageBounds = resolveSpacerPageBodyBounds([spacer])
    const container = document.createElement('div')
    container.getBoundingClientRect = () =>
      ({
        top: 1400,
        bottom: 1600
      }) as DOMRect

    expect(pageBounds).toHaveLength(30)
    expect(resolveCurrentPageFromPageBounds(container, pageBounds, 1)).toBe(15)
  })

  it('merges page position ranges across viewport window refreshes and drops out-of-range pages', () => {
    expect(
      mergeDocumentLayoutPagePositionRanges(
        [
          { pageNumber: 1, startPos: 1, endPos: 19 },
          { pageNumber: 4, startPos: 60, endPos: 79 }
        ],
        [
          { pageNumber: 2, startPos: 20, endPos: 39 },
          { pageNumber: 4, startPos: 62, endPos: 81 }
        ],
        4,
        true
      )
    ).toEqual([
      { pageNumber: 1, startPos: 1, endPos: 19 },
      { pageNumber: 2, startPos: 20, endPos: 39 },
      { pageNumber: 4, startPos: 62, endPos: 81 }
    ])
    expect(mergeDocumentLayoutPagePositionRanges([{ pageNumber: 5, startPos: 80, endPos: 99 }], [], 4)).toEqual([])
  })

  it('drops previously retained page position ranges after non-viewport invalidations', () => {
    expect(
      mergeDocumentLayoutPagePositionRanges(
        [
          { pageNumber: 1, startPos: 1, endPos: 19 },
          { pageNumber: 4, startPos: 60, endPos: 79 }
        ],
        [{ pageNumber: 2, startPos: 20, endPos: 39 }],
        4,
        false
      )
    ).toEqual([{ pageNumber: 2, startPos: 20, endPos: 39 }])
  })

  it('activates the virtual page window once the document grows beyond five pages', () => {
    expect(shouldUseWindowedLayout(5)).toBe(false)
    expect(shouldUseWindowedLayout(6)).toBe(true)
  })

  it('centers the preferred active range around the current page with two pages of overscan', () => {
    expect(resolvePreferredActiveRange(4, 2)).toEqual({ startPage: 1, endPage: 4 })
    expect(resolvePreferredActiveRange(6, 1)).toEqual({ startPage: 1, endPage: 3 })
    expect(resolvePreferredActiveRange(6, 3)).toEqual({ startPage: 1, endPage: 5 })
    expect(resolvePreferredActiveRange(6, 4)).toEqual({ startPage: 2, endPage: 6 })
    expect(resolvePreferredActiveRange(14, 14)).toEqual({ startPage: 12, endPage: 14 })
  })

  it('shifts the viewport window whenever the centered page range changes', () => {
    expect(shouldRefreshViewportWindow({ startPage: 1, endPage: 3 }, 2, 6)).toBe(true)
    expect(shouldRefreshViewportWindow({ startPage: 1, endPage: 5 }, 3, 6)).toBe(false)
    expect(shouldRefreshViewportWindow({ startPage: 1, endPage: 5 }, 4, 6)).toBe(true)
    expect(shouldRefreshViewportWindow({ startPage: 12, endPage: 14 }, 14, 14)).toBe(false)
  })

  it('derives the current page from selection position ranges while editing', () => {
    const ranges = [
      { pageNumber: 1, startPos: 1, endPos: 19 },
      { pageNumber: 2, startPos: 20, endPos: 39 },
      { pageNumber: 3, startPos: 40, endPos: 59 }
    ]

    expect(resolveCurrentPageFromPositionRanges(ranges, 25, 1)).toBe(2)
    expect(resolveCurrentPageFromPositionRanges(ranges, 60, 1)).toBe(3)
    expect(resolveCurrentPageFromPositionRanges(ranges, -1, 2)).toBe(2)
  })

  it('prefers the visible trailing page when the selection is parked at the last measured document position', () => {
    const ranges = [
      { pageNumber: 1, startPos: 1, endPos: 19 },
      { pageNumber: 2, startPos: 20, endPos: 39 },
      { pageNumber: 3, startPos: 40, endPos: 59 }
    ]

    expect(resolveCurrentPageFromPositionRanges(ranges, 59, 3, 4)).toBe(4)
  })

  describe('editor-transaction layout debounce for large documents', () => {
    let requestLayoutCalls: Array<{ reason: string; immediate?: boolean }>
    const realCreateDocumentLayoutScheduler =
      jest.requireActual<typeof documentLayoutScheduler>('../documentLayoutScheduler').createDocumentLayoutScheduler

    function createMockTransaction(docChanged: boolean, meta?: Partial<Record<string, unknown>>): Transaction {
      return {
        docChanged,
        getMeta: (key: string) => meta?.[key]
      } as unknown as Transaction
    }

    beforeEach(() => {
      requestLayoutCalls = []
      jest.spyOn(documentLayoutScheduler, 'createDocumentLayoutScheduler').mockImplementation(params => {
        const scheduler = realCreateDocumentLayoutScheduler(params)
        const originalRequestLayout = scheduler.requestLayout.bind(scheduler)
        scheduler.requestLayout = options => {
          requestLayoutCalls.push({ reason: options.reason, immediate: options.immediate })
          return originalRequestLayout(options)
        }
        return scheduler
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('schedules immediate structural layout for editor transactions when page count is below the large-doc threshold', async () => {
      const pageCount = LARGE_DOC_PAGE_YIELD_THRESHOLD - 1
      const { service } = createLayoutServiceStub(pageCount)
      const container = document.createElement('div')
      const editorContainerRef = { current: container } as MutableRefObject<HTMLDivElement | null>
      const editor = createEditorStub({
        selectionHead: 1,
        posAtCoords: () => ({ pos: 1 })
      })

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: editor as never,
          editorContainerRef,
          layoutService: service,
          isYjsSynced: false
        })
      )

      await act(async () => {
        for (let i = 0; i < 12; i += 1) {
          await Promise.resolve()
        }
      })

      act(() => {
        editor.emit('transaction', {
          transaction: createMockTransaction(true)
        })
      })

      const editorTxCalls = requestLayoutCalls.filter(call => call.reason === 'editor-transaction')
      expect(editorTxCalls.length).toBeGreaterThanOrEqual(1)
      expect(editorTxCalls[editorTxCalls.length - 1]?.immediate).toBe(true)
    })

    it('debounces structural layout for editor transactions when page count is at or above the large-doc threshold', async () => {
      const pageCount = LARGE_DOC_PAGE_YIELD_THRESHOLD
      const { service } = createLayoutServiceStub(pageCount)
      const container = document.createElement('div')
      const editorContainerRef = { current: container } as MutableRefObject<HTMLDivElement | null>
      const editor = createEditorStub({
        selectionHead: 1,
        posAtCoords: () => ({ pos: 1 })
      })

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: editor as never,
          editorContainerRef,
          layoutService: service,
          isYjsSynced: false
        })
      )

      await act(async () => {
        for (let i = 0; i < 12; i += 1) {
          await Promise.resolve()
        }
      })

      act(() => {
        editor.emit('transaction', {
          transaction: createMockTransaction(true, { [PAGINATION_OWNED_DOC_CHANGE_META]: true })
        })
      })

      const editorTxCalls = requestLayoutCalls.filter(call => call.reason === 'editor-transaction')
      expect(editorTxCalls.length).toBeGreaterThanOrEqual(1)
      expect(editorTxCalls[editorTxCalls.length - 1]?.immediate).toBe(false)
    })

    it('schedules a layout catch-up when pagination refresh metadata arrives without a doc change', async () => {
      const pageCount = LARGE_DOC_PAGE_YIELD_THRESHOLD - 1
      const { service } = createLayoutServiceStub(pageCount)
      const container = document.createElement('div')
      const editorContainerRef = { current: container } as MutableRefObject<HTMLDivElement | null>
      const editor = createEditorStub({
        selectionHead: 1,
        posAtCoords: () => ({ pos: 1 })
      })

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: editor as never,
          editorContainerRef,
          layoutService: service,
          isYjsSynced: false
        })
      )

      await act(async () => {
        for (let i = 0; i < 12; i += 1) {
          await Promise.resolve()
        }
      })

      act(() => {
        editor.emit('transaction', {
          transaction: createMockTransaction(false, { [PAGINATION_REFRESH_META]: true })
        })
      })

      const editorTxCalls = requestLayoutCalls.filter(call => call.reason === 'editor-transaction')
      expect(editorTxCalls.length).toBeGreaterThanOrEqual(1)
      expect(editorTxCalls[editorTxCalls.length - 1]?.immediate).toBe(true)
    })
  })

  describe('layout refresh scheduling stability', () => {
    let requestLayoutCalls: Array<{ reason: string; immediate?: boolean }>
    const realCreateDocumentLayoutScheduler =
      jest.requireActual<typeof documentLayoutScheduler>('../documentLayoutScheduler').createDocumentLayoutScheduler

    beforeEach(() => {
      requestLayoutCalls = []
      jest.spyOn(documentLayoutScheduler, 'createDocumentLayoutScheduler').mockImplementation(params => {
        const scheduler = realCreateDocumentLayoutScheduler(params)
        const originalRequestLayout = scheduler.requestLayout.bind(scheduler)
        scheduler.requestLayout = options => {
          requestLayoutCalls.push({ reason: options.reason, immediate: options.immediate })
          return originalRequestLayout(options)
        }
        return scheduler
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('does not reschedule hydration or layout-service refreshes when only the current page changes', async () => {
      const { service, setResolvedCurrentPage, setVisiblePage } = createSparseLayoutServiceStub({
        pageCount: 4,
        initialResolvedCurrentPage: 1,
        initialVisiblePage: 1
      })
      const container = document.createElement('div')
      container.getBoundingClientRect = () =>
        ({
          top: 0,
          bottom: 200,
          height: 200
        }) as DOMRect
      const editorContainerRef = {
        current: container
      } as MutableRefObject<HTMLDivElement | null>
      const editor = createEditorStub({
        selectionHead: 59,
        posAtCoords: ({ top }: { left: number; top: number }) => {
          if (top < 100) {
            return { pos: top < 50 ? 1 : 19 }
          }
          if (top < 200) {
            return { pos: top < 150 ? 20 : 39 }
          }
          if (top < 300) {
            return { pos: top < 250 ? 40 : 59 }
          }
          return null
        }
      })

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: editor as never,
          editorContainerRef,
          layoutService: service,
          documentId: 'doc-1',
          isYjsSynced: true
        })
      )

      await act(async () => {
        for (let i = 0; i < 12; i += 1) {
          await Promise.resolve()
        }
      })

      requestLayoutCalls = []
      setVisiblePage(4)
      setResolvedCurrentPage(1)

      act(() => {
        editor.emit('selectionUpdate')
      })

      await act(async () => {
        for (let i = 0; i < 4; i += 1) {
          await Promise.resolve()
        }
      })

      expect(requestLayoutCalls.filter(call => call.reason === 'document-hydration')).toEqual([])
      expect(requestLayoutCalls.filter(call => call.reason === 'layout-service-changed')).toEqual([])
    })
  })

  describe('chunked layout yields after measurement', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('does not call yieldToNextAnimationFrame when page count is below the large-doc threshold', async () => {
      const yieldSpy = jest.spyOn(documentLayoutServiceModule, 'yieldToNextAnimationFrame').mockResolvedValue(undefined)
      const pageCount = LARGE_DOC_PAGE_YIELD_THRESHOLD - 1
      const { service } = createLayoutServiceStub(pageCount)
      const editorContainerRef = { current: document.createElement('div') } as MutableRefObject<HTMLDivElement | null>

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: null,
          editorContainerRef,
          layoutService: service,
          isYjsSynced: false
        })
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(yieldSpy).not.toHaveBeenCalled()
    })

    it('calls yieldToNextAnimationFrame twice when page count reaches the large-doc threshold', async () => {
      const yieldSpy = jest.spyOn(documentLayoutServiceModule, 'yieldToNextAnimationFrame').mockResolvedValue(undefined)
      const pageCount = LARGE_DOC_PAGE_YIELD_THRESHOLD
      const { service } = createLayoutServiceStub(pageCount)
      const editorContainerRef = { current: document.createElement('div') } as MutableRefObject<HTMLDivElement | null>

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: null,
          editorContainerRef,
          layoutService: service,
          isYjsSynced: false
        })
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(yieldSpy).toHaveBeenCalledTimes(2)
    })

    it('uses measureLayoutAsync from the layout service when provided', async () => {
      const pageCount = 6
      const { measureLayout, service } = createLayoutServiceStub(pageCount)
      const measureLayoutAsync = jest.fn(async (...args: Parameters<typeof measureLayout>) => measureLayout(...args))
      service.measureLayoutAsync = measureLayoutAsync
      const editorContainerRef = { current: document.createElement('div') } as MutableRefObject<HTMLDivElement | null>

      renderHook(() =>
        usePaginationLayoutSnapshot({
          editor: null,
          editorContainerRef,
          layoutService: service,
          isYjsSynced: false
        })
      )

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(measureLayoutAsync).toHaveBeenCalled()
      expect(measureLayout).toHaveBeenCalled()
    })
  })
})
