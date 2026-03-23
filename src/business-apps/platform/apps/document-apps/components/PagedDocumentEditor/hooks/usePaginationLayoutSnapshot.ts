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
import {
  collectDocumentLayoutAnchors,
  collectDocumentLayoutTableFragments,
  createEmptyDocumentLayoutSnapshot,
  mergeMeasuredDocumentLayoutPageSpans,
  mergeRetainedDocumentLayoutPageSpans,
  resolveNextDocumentLayoutVersion
} from '../documentLayoutSnapshotHelpers'

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

export function resolveSpacerPageBodyBounds(flowEls: HTMLElement[]): DocumentLayoutPageBodyBounds[] {
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
      if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)) {
        return []
      }

      let currentTop = rect.top

      return pageHeights.map((pageHeight, index) => {
        const pageTop = currentTop
        const pageBottom = pageTop + pageHeight
        currentTop = pageBottom

        return {
          pageNumber: pageRange.startPage + index,
          left: rect.left,
          right: rect.right,
          top: pageTop,
          bottom: pageBottom
        }
      })
    })
    .sort((left, right) => left.pageNumber - right.pageNumber)
}

export function mergeMeasuredPageBodyBounds(
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[],
  spacerPageBodyBounds: DocumentLayoutPageBodyBounds[]
): DocumentLayoutPageBodyBounds[] {
  const merged = new Map<number, DocumentLayoutPageBodyBounds>()

  spacerPageBodyBounds.forEach(bounds => {
    merged.set(bounds.pageNumber, bounds)
  })
  mountedPageBodyBounds.forEach(bounds => {
    merged.set(bounds.pageNumber, bounds)
  })

  return Array.from(merged.values()).sort((left, right) => left.pageNumber - right.pageNumber)
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

function shouldRetainPreviousPagePositionRanges(scope: DocumentLayoutInvalidationScope): boolean {
  return scope === 'viewport'
}

export function mergeDocumentLayoutPagePositionRanges(
  previousRanges: DocumentLayoutPagePositionRange[],
  nextRanges: DocumentLayoutPagePositionRange[],
  pageCount: number,
  retainPrevious = true
): DocumentLayoutPagePositionRange[] {
  const safePageCount = Math.max(1, pageCount)
  const merged = new Map<number, DocumentLayoutPagePositionRange>()

  if (retainPrevious) {
    previousRanges.forEach(range => {
      if (range.pageNumber < 1 || range.pageNumber > safePageCount) {
        return
      }
      merged.set(range.pageNumber, range)
    })
  }

  nextRanges.forEach(range => {
    if (range.pageNumber < 1 || range.pageNumber > safePageCount) {
      return
    }
    merged.set(range.pageNumber, range)
  })

  return Array.from(merged.values()).sort((left, right) => left.pageNumber - right.pageNumber)
}

function createLayoutSnapshot(
  documentVersion: number,
  layoutVersion: number,
  pageCount: number,
  pages: DocumentLayoutPageSnapshot[],
  flow: DocumentLayoutFlowSnapshot[],
  mountedRange: DocumentLayoutPageRange | null,
  pageBounds: DocumentLayoutSnapshot['pageBounds'],
  mountedPageBodyBounds: DocumentLayoutSnapshot['mountedPageBodyBounds'],
  pageSpans: DocumentLayoutSnapshot['pageSpans'],
  retainedPageSpans: DocumentLayoutSnapshot['retainedPageSpans'],
  pagePositionRanges: DocumentLayoutPagePositionRange[],
  pageChromeMetrics: DocumentLayoutSnapshot['pageChromeMetrics'],
  anchors: DocumentLayoutSnapshot['anchors'],
  tableFragments: DocumentLayoutSnapshot['tableFragments'],
  activeRange: DocumentLayoutPageRange | null,
  activePages: DocumentLayoutPageSnapshot[],
  source: DocumentLayoutSnapshot['source']
): DocumentLayoutSnapshot {
  return {
    documentVersion,
    layoutVersion,
    source,
    pageCount,
    pages,
    flow,
    mountedRange,
    pageBounds,
    mountedPageBodyBounds,
    pageSpans,
    retainedPageSpans,
    pagePositionRanges,
    pageChromeMetrics,
    anchors,
    tableFragments,
    activeRange,
    activePages
  }
}

function resolveInvalidationScope(reason: DocumentLayoutInvalidationReason): DocumentLayoutInvalidationScope {
  switch (reason) {
    case 'viewport-resize':
      return 'viewport'
    case 'editor-transaction':
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

function isPendingViewportRefreshForPage(runtimeState: DocumentLayoutRuntimeState, pageNumber: number): boolean {
  if (runtimeState.pendingScope !== 'viewport') {
    return false
  }

  const pendingRange = runtimeState.pendingRange
  if (!pendingRange) {
    return true
  }

  return pageNumber >= pendingRange.startPage && pageNumber <= pendingRange.endPage
}

export function resolveCurrentPageFromPageBounds(
  container: HTMLDivElement,
  pageBounds: DocumentLayoutPageBodyBounds[],
  fallbackPage: number
): number {
  if (pageBounds.length === 0) {
    return fallbackPage
  }

  const containerRect = container.getBoundingClientRect()
  const containerHeight =
    Number.isFinite(containerRect.height) && containerRect.height > 0
      ? containerRect.height
      : containerRect.bottom - containerRect.top
  const viewportCenterY = containerRect.top + containerHeight / 2
  const matchingBounds =
    pageBounds.find(bounds => viewportCenterY >= bounds.top && viewportCenterY <= bounds.bottom) ??
    pageBounds.find(bounds => viewportCenterY < bounds.top) ??
    pageBounds[pageBounds.length - 1]

  return matchingBounds?.pageNumber ?? fallbackPage
}

function resolveSnapshotCurrentPage(
  container: HTMLDivElement,
  pageBounds: DocumentLayoutPageBodyBounds[],
  fallbackPage: number
): number {
  return Math.max(1, resolveCurrentPageFromPageBounds(container, pageBounds, fallbackPage))
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
    case 'editor-transaction':
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
    createEmptyDocumentLayoutSnapshot(resolvedLayoutService.source)
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
  const currentPageRef = useRef(1)
  const hasInitializedLayoutRef = useRef(false)
  const previousLayoutInputsKeyRef = useRef<string | undefined>(layoutInputsKey)
  const lastMeasuredDocRef = useRef<object | null>(null)

  const rebuildLayoutSnapshot = useCallback(
    (request: DocumentLayoutMeasurementRequest) => {
      const container = editorContainerRef.current
      if (!container) return

      const measurement = resolvedLayoutService.measureLayout(container, request)
      navigationStateRef.current = measurement.navigationState
      setLayoutNavigationState(measurement.navigationState)
      const spacerPageBodyBounds = resolveSpacerPageBodyBounds(measurement.navigationState.flowEls)
      const pageBounds = mergeMeasuredPageBodyBounds(measurement.layout.mountedPageBodyBounds, spacerPageBodyBounds)
      const mountedPagePositionRanges = resolveMountedPagePositionRanges(
        editor,
        measurement.layout.mountedPageBodyBounds
      )
      const spacerPagePositionRanges = resolveSpacerPagePositionRanges(editor, measurement.navigationState.flowEls)
      const measuredPageSpans = mergeMeasuredDocumentLayoutPageSpans({
        mountedRanges: mountedPagePositionRanges,
        spacerRanges: spacerPagePositionRanges,
        pageCount: measurement.layout.pageCount
      })

      let nextSnapshot = createEmptyDocumentLayoutSnapshot(resolvedLayoutService.source)

      setLayoutSnapshot(previous => {
        const nextRetainedPageSpans = mergeRetainedDocumentLayoutPageSpans(
          previous.retainedPageSpans,
          measuredPageSpans,
          measurement.layout.pageCount,
          shouldRetainPreviousPagePositionRanges(request.scope)
        )
        const nextPagePositionRanges = nextRetainedPageSpans.map(({ pageNumber, startPos, endPos }) => ({
          pageNumber,
          startPos,
          endPos
        }))
        const currentDoc = editor?.state.doc ?? null
        const docChanged = currentDoc !== lastMeasuredDocRef.current
        lastMeasuredDocRef.current = currentDoc as object | null
        const nextDocumentVersion = resolveNextDocumentLayoutVersion({
          previousSnapshot: previous,
          scope: request.scope,
          docChanged
        })
        const anchors =
          request.scope === 'viewport'
            ? previous.anchors
            : collectDocumentLayoutAnchors(editor, measuredPageSpans, measurement.layout.mountedPageBodyBounds)
        const tableFragments = collectDocumentLayoutTableFragments(editor, measuredPageSpans)

        nextSnapshot = createLayoutSnapshot(
          nextDocumentVersion,
          request.generation,
          measurement.layout.pageCount,
          measurement.layout.pages,
          measurement.layout.flow,
          measurement.layout.mountedRange,
          pageBounds,
          measurement.layout.mountedPageBodyBounds,
          measuredPageSpans,
          nextRetainedPageSpans,
          nextPagePositionRanges,
          measurement.layout.pageChromeMetrics,
          anchors,
          tableFragments,
          measurement.layout.activeRange,
          measurement.layout.activePages,
          resolvedLayoutService.source
        )

        return nextSnapshot
      })

      const nextCurrentPage = Math.min(
        resolveSnapshotCurrentPage(container, nextSnapshot.pageBounds, currentPageRef.current),
        measurement.layout.pageCount
      )
      currentPageRef.current = nextCurrentPage
      setCurrentPage(nextCurrentPage)
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
          resolveSnapshotCurrentPage(container, layoutSnapshot.pageBounds, currentPageRef.current),
          layoutSnapshot.pageCount || 1
        )

        currentPageRef.current = nextPage
        setCurrentPage(nextPage)

        const activeRange = navigationStateRef.current.activeRange
        if (
          shouldRefreshViewportWindow(activeRange, nextPage, layoutSnapshot.pageCount || 1) &&
          !isPendingViewportRefreshForPage(runtimeState, nextPage)
        ) {
          scheduleLayoutSnapshotRefresh('viewport-resize', false, nextPage)
        }
      })
    },
    [layoutSnapshot.pageBounds, layoutSnapshot.pageCount, runtimeState, scheduleLayoutSnapshotRefresh]
  )

  useEffect(() => {
    navigationStateRef.current = { boundaryEls: [], activeRange: null, pageBreakEls: [], flowEls: [] }
    setLayoutSnapshot(createEmptyDocumentLayoutSnapshot(resolvedLayoutService.source))
    setLayoutNavigationState({ boundaryEls: [], activeRange: null, pageBreakEls: [], flowEls: [] })
    setRuntimeState(layoutScheduler.getState())
    currentPageRef.current = 1
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
    if (!editor || typeof editor.on !== 'function' || typeof editor.off !== 'function') {
      return
    }

    const handleTransaction = ({ transaction }: { transaction: { docChanged?: boolean } }) => {
      if (!transaction.docChanged || !hasInitializedLayoutRef.current) {
        return
      }

      scheduleLayoutSnapshotRefresh('editor-transaction', true)
    }

    editor.on('transaction', handleTransaction as never)
    return () => {
      editor.off('transaction', handleTransaction as never)
    }
  }, [editor, scheduleLayoutSnapshotRefresh])

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
