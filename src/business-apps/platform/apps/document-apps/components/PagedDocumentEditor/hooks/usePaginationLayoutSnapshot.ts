import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type {
  DocumentLayoutFlowSnapshot,
  DocumentLayoutInvalidationReason,
  DocumentLayoutInvalidationScope,
  DocumentLayoutMeasurementRequest,
  DocumentLayoutPageBodyBounds,
  DocumentLayoutPagePositionRange,
  DocumentLayoutPageRange,
  DocumentLayoutPageSnapshot,
  DocumentLayoutRuntimeState,
  DocumentLayoutSnapshot
} from '../../../types'
import { type DocumentLayoutNavigationState, type DocumentLayoutService } from '../documentLayoutService'
import { createIncrementalDocumentLayoutService } from '../incrementalDocumentLayoutService'
import { createDocumentLayoutScheduler } from '../documentLayoutScheduler'

export interface UsePaginationLayoutSnapshotProps {
  editor: TiptapEditor | null
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  documentId?: string
  isYjsSynced: boolean
  layoutService?: DocumentLayoutService
  layoutInputsKey?: string
}

export interface UsePaginationLayoutSnapshotResult {
  currentPage: number
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  layoutNavigationState: DocumentLayoutNavigationState
  layoutSnapshot: DocumentLayoutSnapshot
  runtimeState: DocumentLayoutRuntimeState
}

const WINDOWED_PAGE_COUNT_THRESHOLD = 24
const WINDOWED_PAGE_RADIUS = 3
const WINDOWED_PAGE_EDGE_BUFFER = 2
const PAGE_POSITION_SAMPLE_INSET_PX = 12
const SPACER_PAGE_HEIGHTS_SEPARATOR = ','

function resolveEditorView(editor: TiptapEditor | null): TiptapEditor['view'] | null {
  try {
    return editor?.view ?? null
  } catch {
    return null
  }
}

function clampCoordinate(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function resolveCoordinateSamples(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return []
  }

  const span = end - start
  const inset = Math.min(PAGE_POSITION_SAMPLE_INSET_PX, span / 3)
  const first = clampCoordinate(start + inset, start + 1, end - 1)
  const middle = clampCoordinate(start + span / 2, start + 1, end - 1)
  const last = clampCoordinate(end - inset, start + 1, end - 1)
  return Array.from(new Set([first, middle, last].filter(Number.isFinite)))
}

function resolvePositionAtCoordinates(view: TiptapEditor['view'] | null, left: number, top: number): number | null {
  if (!view) {
    return null
  }

  try {
    const position = view.posAtCoords({ left, top })?.pos ?? null
    return Number.isInteger(position) && position >= 0 ? position : null
  } catch {
    return null
  }
}

function resolveHorizontalSample(left: number, right: number): number | null {
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) {
    return null
  }

  return (left + right) / 2
}

export function resolveMountedPagePositionRanges(
  editor: TiptapEditor | null,
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
): DocumentLayoutPagePositionRange[] {
  const view = resolveEditorView(editor)
  if (!view || mountedPageBodyBounds.length === 0) {
    return []
  }

  return mountedPageBodyBounds
    .map(bounds => {
      const horizontalSamples = resolveCoordinateSamples(bounds.left, bounds.right)
      const verticalSamples = resolveCoordinateSamples(bounds.top, bounds.bottom)
      const positions = verticalSamples.flatMap(top =>
        horizontalSamples
          .map(left => resolvePositionAtCoordinates(view, left, top))
          .filter((position): position is number => position !== null)
      )
      if (positions.length === 0) {
        return null
      }

      return {
        pageNumber: bounds.pageNumber,
        startPos: Math.min(...positions),
        endPos: Math.max(...positions)
      }
    })
    .filter((range): range is DocumentLayoutPagePositionRange => range !== null)
    .sort((left, right) => left.pageNumber - right.pageNumber)
}

function resolveSpacerPageRange(spacerElement: HTMLElement): DocumentLayoutPageRange | null {
  const startPage = Number(spacerElement.dataset.rmPageRangeStart ?? '')
  const endPage = Number(spacerElement.dataset.rmPageRangeEnd ?? '')
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
    return null
  }

  return { startPage, endPage }
}

function resolveSpacerPageSegmentHeights(spacerElement: HTMLElement, pageCount: number): number[] {
  const encodedHeights = spacerElement.dataset.rmPageSegmentHeights?.trim()
  if (!encodedHeights) {
    return []
  }

  const parsedHeights = encodedHeights
    .split(SPACER_PAGE_HEIGHTS_SEPARATOR)
    .map(value => Number.parseFloat(value))
    .filter(height => Number.isFinite(height) && height > 0)

  return parsedHeights.length === pageCount ? parsedHeights : []
}

export function resolveSpacerPagePositionRanges(
  editor: TiptapEditor | null,
  flowEls: HTMLElement[]
): DocumentLayoutPagePositionRange[] {
  const view = resolveEditorView(editor)
  if (!view || flowEls.length === 0) {
    return []
  }

  return flowEls
    .flatMap(flowEl => {
      if (!flowEl.classList.contains('rm-page-spacer')) {
        return []
      }

      const pageRange = resolveSpacerPageRange(flowEl)
      if (!pageRange) {
        return []
      }

      const pageCount = pageRange.endPage - pageRange.startPage + 1
      const pageHeights = resolveSpacerPageSegmentHeights(flowEl, pageCount)
      if (pageHeights.length !== pageCount) {
        return []
      }

      const rect = flowEl.getBoundingClientRect()
      const sampleLeft = resolveHorizontalSample(rect.left, rect.right)
      if (sampleLeft === null) {
        return []
      }

      let currentTop = rect.top
      return pageHeights
        .map((pageHeight, index) => {
          const pageTop = currentTop
          const pageBottom = currentTop + pageHeight
          currentTop = pageBottom

          const verticalSamples = resolveCoordinateSamples(pageTop, pageBottom)
          const positions = verticalSamples
            .map(top => resolvePositionAtCoordinates(view, sampleLeft, top))
            .filter((position): position is number => position !== null)
          if (positions.length === 0) {
            return null
          }

          return {
            pageNumber: pageRange.startPage + index,
            startPos: Math.min(...positions),
            endPos: Math.max(...positions)
          }
        })
        .filter((range): range is DocumentLayoutPagePositionRange => range !== null)
    })
    .sort((left, right) => left.pageNumber - right.pageNumber)
}

function resolveMeasuredPagePositionRanges(
  editor: TiptapEditor | null,
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[],
  flowEls: HTMLElement[],
  pageCount: number
): DocumentLayoutPagePositionRange[] {
  return mergeDocumentLayoutPagePositionRanges(
    resolveSpacerPagePositionRanges(editor, flowEls),
    resolveMountedPagePositionRanges(editor, mountedPageBodyBounds),
    pageCount
  )
}

export function mergeDocumentLayoutPagePositionRanges(
  previousRanges: DocumentLayoutPagePositionRange[],
  nextRanges: DocumentLayoutPagePositionRange[],
  pageCount: number
): DocumentLayoutPagePositionRange[] {
  const safePageCount = Math.max(1, pageCount)
  const merged = new Map<number, DocumentLayoutPagePositionRange>()

  previousRanges.forEach(range => {
    if (range.pageNumber < 1 || range.pageNumber > safePageCount) {
      return
    }
    merged.set(range.pageNumber, range)
  })

  nextRanges.forEach(range => {
    if (range.pageNumber < 1 || range.pageNumber > safePageCount) {
      return
    }
    merged.set(range.pageNumber, range)
  })

  return Array.from(merged.values()).sort((left, right) => left.pageNumber - right.pageNumber)
}

function createLayoutSnapshot(
  layoutVersion: number,
  pageCount: number,
  pages: DocumentLayoutPageSnapshot[],
  flow: DocumentLayoutFlowSnapshot[],
  mountedRange: DocumentLayoutPageRange | null,
  mountedPageBodyBounds: DocumentLayoutSnapshot['mountedPageBodyBounds'],
  pagePositionRanges: DocumentLayoutPagePositionRange[],
  activeRange: DocumentLayoutPageRange | null,
  activePages: DocumentLayoutPageSnapshot[],
  source: DocumentLayoutSnapshot['source']
): DocumentLayoutSnapshot {
  return {
    layoutVersion,
    source,
    pageCount,
    pages,
    flow,
    mountedRange,
    mountedPageBodyBounds,
    pagePositionRanges,
    activeRange,
    activePages
  }
}

function resolveInvalidationScope(reason: DocumentLayoutInvalidationReason): DocumentLayoutInvalidationScope {
  switch (reason) {
    case 'viewport-resize':
      return 'viewport'
    case 'legacy-dom-structure':
      return 'structure'
    case 'layout-inputs-changed':
      return 'formatting'
    case 'initial-load':
    case 'document-hydration':
    case 'layout-service-changed':
    default:
      return 'full-document'
  }
}

function createPageRange(startPage: number, endPage: number): DocumentLayoutPageRange {
  return {
    startPage: Math.max(1, Math.min(startPage, endPage)),
    endPage: Math.max(1, Math.max(startPage, endPage))
  }
}

function shouldUseWindowedLayout(pageCount: number): boolean {
  return pageCount > WINDOWED_PAGE_COUNT_THRESHOLD
}

function resolvePreferredActiveRange(pageCount: number, targetPage: number): DocumentLayoutPageRange {
  if (!shouldUseWindowedLayout(pageCount)) {
    return createPageRange(1, pageCount)
  }

  const safePageCount = Math.max(1, pageCount)
  const safeTargetPage = Math.min(Math.max(1, targetPage), safePageCount)
  return createPageRange(safeTargetPage - WINDOWED_PAGE_RADIUS, safeTargetPage + WINDOWED_PAGE_RADIUS)
}

function shouldRefreshViewportWindow(
  activeRange: DocumentLayoutPageRange | null,
  nextPage: number,
  pageCount: number
): boolean {
  if (!shouldUseWindowedLayout(pageCount)) {
    return false
  }

  if (!activeRange) {
    return true
  }

  const isFullRange = activeRange.startPage <= 1 && activeRange.endPage >= pageCount
  if (isFullRange) {
    return true
  }

  return (
    nextPage <= activeRange.startPage + WINDOWED_PAGE_EDGE_BUFFER ||
    nextPage >= activeRange.endPage - WINDOWED_PAGE_EDGE_BUFFER
  )
}

function resolveInvalidationRange(
  reason: DocumentLayoutInvalidationReason,
  pageCount: number,
  currentPage: number
): DocumentLayoutPageRange | null {
  const safePageCount = Math.max(1, pageCount)
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount)

  switch (reason) {
    case 'viewport-resize':
      return resolvePreferredActiveRange(safePageCount, safeCurrentPage)
    case 'layout-inputs-changed':
    case 'initial-load':
    case 'document-hydration':
    case 'layout-service-changed':
      return resolvePreferredActiveRange(safePageCount, safeCurrentPage)
    case 'legacy-dom-structure':
    default:
      return null
  }
}

export function shouldScheduleDocumentHydrationRefresh(options: {
  documentId?: string
  isYjsSynced: boolean
  hasInitializedLayout: boolean
}): boolean {
  return Boolean(options.documentId) && options.isYjsSynced && options.hasInitializedLayout
}

export function usePaginationLayoutSnapshot({
  editor,
  editorContainerRef,
  documentId,
  isYjsSynced,
  layoutService,
  layoutInputsKey
}: UsePaginationLayoutSnapshotProps): UsePaginationLayoutSnapshotResult {
  const resolvedLayoutService = useMemo(
    () => layoutService ?? createIncrementalDocumentLayoutService(),
    [layoutService]
  )
  const navigationStateRef = useRef<DocumentLayoutNavigationState>({
    boundaryEls: [],
    activeRange: null,
    pageBreakEls: [],
    flowEls: []
  })
  const scrollThrottleRef = useRef<number | null>(null)

  const [layoutSnapshot, setLayoutSnapshot] = useState<DocumentLayoutSnapshot>(() =>
    createLayoutSnapshot(
      0,
      1,
      [{ pageNumber: 1, flowIndex: null, mountedIndex: null, isMounted: false }],
      [],
      null,
      [],
      [],
      null,
      [{ pageNumber: 1, flowIndex: null, mountedIndex: null, isMounted: false }],
      resolvedLayoutService.source
    )
  )
  const [runtimeState, setRuntimeState] = useState<DocumentLayoutRuntimeState>({
    source: resolvedLayoutService.source,
    requestedGeneration: 0,
    resolvedGeneration: 0,
    status: 'idle',
    pendingScope: null,
    pendingRange: null,
    lastRequestedReason: null,
    lastRequestedScope: null,
    lastRequestedRange: null,
    lastResolvedReason: null,
    lastResolvedScope: null,
    lastResolvedRange: null
  })
  const [layoutNavigationState, setLayoutNavigationState] = useState<DocumentLayoutNavigationState>({
    boundaryEls: [],
    activeRange: null,
    pageBreakEls: [],
    flowEls: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const hasInitializedLayoutRef = useRef(false)
  const previousLayoutInputsKeyRef = useRef<string | undefined>(layoutInputsKey)

  const rebuildLayoutSnapshot = useCallback(
    (request: DocumentLayoutMeasurementRequest) => {
      const container = editorContainerRef.current
      if (!container) return

      const measurement = resolvedLayoutService.measureLayout(container, request)
      navigationStateRef.current = measurement.navigationState
      setLayoutNavigationState(measurement.navigationState)
      const measuredPagePositionRanges = resolveMeasuredPagePositionRanges(
        editor,
        measurement.layout.mountedPageBodyBounds,
        measurement.navigationState.flowEls,
        measurement.layout.pageCount
      )

      setLayoutSnapshot(previous =>
        createLayoutSnapshot(
          request.generation,
          measurement.layout.pageCount,
          measurement.layout.pages,
          measurement.layout.flow,
          measurement.layout.mountedRange,
          measurement.layout.mountedPageBodyBounds,
          mergeDocumentLayoutPagePositionRanges(
            previous.pagePositionRanges ?? [],
            measuredPagePositionRanges,
            measurement.layout.pageCount
          ),
          measurement.layout.activeRange,
          measurement.layout.activePages,
          resolvedLayoutService.source
        )
      )
      setCurrentPage(
        Math.min(
          Math.max(1, resolvedLayoutService.resolveCurrentPage(container, measurement.navigationState)),
          measurement.layout.pageCount
        )
      )
    },
    [editor, editorContainerRef, resolvedLayoutService]
  )

  const layoutScheduler = useMemo(
    () =>
      createDocumentLayoutScheduler({
        source: resolvedLayoutService.source,
        runMeasurement: rebuildLayoutSnapshot,
        onStateChange: setRuntimeState
      }),
    [rebuildLayoutSnapshot, resolvedLayoutService.source]
  )

  const scheduleLayoutSnapshotRefresh = useCallback(
    (reason: DocumentLayoutInvalidationReason, immediate = false, targetPage = currentPage) => {
      layoutScheduler.requestLayout({
        immediate,
        reason,
        scope: resolveInvalidationScope(reason),
        pageRange: resolveInvalidationRange(reason, layoutSnapshot.pageCount, targetPage)
      })
    },
    [currentPage, layoutScheduler, layoutSnapshot.pageCount]
  )

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget
      if (scrollThrottleRef.current) return

      scrollThrottleRef.current = requestAnimationFrame(() => {
        scrollThrottleRef.current = null
        const nextPage = Math.min(
          Math.max(1, resolvedLayoutService.resolveCurrentPage(container, navigationStateRef.current)),
          layoutSnapshot.pageCount || 1
        )

        setCurrentPage(nextPage)

        const activeRange = navigationStateRef.current.activeRange
        if (shouldRefreshViewportWindow(activeRange, nextPage, layoutSnapshot.pageCount || 1)) {
          scheduleLayoutSnapshotRefresh('viewport-resize', false, nextPage)
        }
      })
    },
    [layoutSnapshot.pageCount, resolvedLayoutService, scheduleLayoutSnapshotRefresh]
  )

  useEffect(() => {
    navigationStateRef.current = { boundaryEls: [], activeRange: null, pageBreakEls: [], flowEls: [] }
    setLayoutSnapshot(
      createLayoutSnapshot(
        0,
        1,
        [{ pageNumber: 1, flowIndex: null, mountedIndex: null, isMounted: false }],
        [],
        null,
        [],
        [],
        null,
        [{ pageNumber: 1, flowIndex: null, mountedIndex: null, isMounted: false }],
        resolvedLayoutService.source
      )
    )
    setLayoutNavigationState({ boundaryEls: [], activeRange: null, pageBreakEls: [], flowEls: [] })
    setRuntimeState(layoutScheduler.getState())
    setCurrentPage(1)
    previousLayoutInputsKeyRef.current = layoutInputsKey
  }, [layoutScheduler, resolvedLayoutService.source])

  useEffect(() => {
    if (
      !shouldScheduleDocumentHydrationRefresh({
        documentId,
        isYjsSynced,
        hasInitializedLayout: hasInitializedLayoutRef.current
      })
    ) {
      return
    }
    scheduleLayoutSnapshotRefresh('document-hydration', true)
  }, [documentId, isYjsSynced, scheduleLayoutSnapshotRefresh])

  useEffect(() => {
    if (!hasInitializedLayoutRef.current) return
    if (previousLayoutInputsKeyRef.current === layoutInputsKey) return

    previousLayoutInputsKeyRef.current = layoutInputsKey
    scheduleLayoutSnapshotRefresh('layout-inputs-changed', true)
  }, [layoutInputsKey, scheduleLayoutSnapshotRefresh])

  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const unsubscribe = resolvedLayoutService.observeLayout({
      editor,
      container,
      onInvalidated: reason => {
        scheduleLayoutSnapshotRefresh(reason, false)
      }
    })
    scheduleLayoutSnapshotRefresh(hasInitializedLayoutRef.current ? 'layout-service-changed' : 'initial-load', true)
    hasInitializedLayoutRef.current = true

    return () => {
      unsubscribe()
    }
  }, [editor, editorContainerRef, resolvedLayoutService, scheduleLayoutSnapshotRefresh])

  useEffect(() => {
    return () => {
      layoutScheduler.dispose()
      if (scrollThrottleRef.current) cancelAnimationFrame(scrollThrottleRef.current)
    }
  }, [layoutScheduler])

  return {
    currentPage,
    handleScroll,
    layoutNavigationState,
    layoutSnapshot,
    runtimeState
  }
}
