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
import {
  resolvePageShellBodyBounds,
  type DocumentLayoutNavigationState,
  type DocumentLayoutService
} from '../documentLayoutService'
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
import { resolvePageBodyWrapBands } from '@/components/tiptap-extensions/tiptap-custom-pagination/utils'
import {
  isDocumentVirtualWindowEnabled,
  resolveDocumentVirtualWindowRange,
  shouldShiftDocumentVirtualWindow
} from '../virtualWindowConfig'

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
    const position = view.posAtCoords({ left, top })?.pos
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) {
      return null
    }

    return position
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

  const positionsByPageNumber = new Map<number, number[]>()

  mountedPageBodyBounds.forEach(bounds => {
    const horizontalSamples = resolveCoordinateSamples(bounds.left, bounds.right)
    const verticalSamples = resolveCoordinateSamples(bounds.top, bounds.bottom)
    const positions = verticalSamples.flatMap(top =>
      horizontalSamples
        .map(left => resolvePositionAtCoordinates(view, left, top))
        .filter((position): position is number => position !== null)
    )
    if (positions.length === 0) {
      return
    }

    const existingPositions = positionsByPageNumber.get(bounds.pageNumber) ?? []
    existingPositions.push(...positions)
    positionsByPageNumber.set(bounds.pageNumber, existingPositions)
  })

  return Array.from(positionsByPageNumber.entries())
    .map(([pageNumber, positions]) => {
      if (positions.length === 0) {
        return null
      }

      return {
        pageNumber,
        startPos: Math.min(...positions),
        endPos: Math.max(...positions)
      }
    })
    .filter((range): range is DocumentLayoutPagePositionRange => range !== null)
    .sort((left, right) => left.pageNumber - right.pageNumber)
}

function resolveMountedPageSamplingBounds(
  editor: TiptapEditor | null,
  fallbackBounds: DocumentLayoutPageBodyBounds[]
): DocumentLayoutPageBodyBounds[] {
  const view = resolveEditorView(editor)
  if (!view || !(view.dom instanceof HTMLElement)) {
    return fallbackBounds
  }

  const wrapBands = resolvePageBodyWrapBands(view.dom, 'viewport')
  if (wrapBands.length === 0) {
    return fallbackBounds
  }

  const mountedPageNumbers = new Set(fallbackBounds.map(bounds => bounds.pageNumber))
  return wrapBands
    .filter(band => mountedPageNumbers.size === 0 || mountedPageNumbers.has(band.pageNumber))
    .map(band => ({
      pageNumber: band.pageNumber,
      left: band.left,
      right: band.right,
      top: band.top,
      bottom: band.bottom
    }))
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

function createLayoutSnapshot(options: {
  documentVersion: number
  layoutVersion: number
  pageCount: number
  pages: DocumentLayoutPageSnapshot[]
  flow: DocumentLayoutFlowSnapshot[]
  mountedRange: DocumentLayoutPageRange | null
  pageBounds: DocumentLayoutSnapshot['pageBounds']
  mountedPageBodyBounds: DocumentLayoutSnapshot['mountedPageBodyBounds']
  pageSpans: DocumentLayoutSnapshot['pageSpans']
  retainedPageSpans: DocumentLayoutSnapshot['retainedPageSpans']
  pagePositionRanges: DocumentLayoutPagePositionRange[]
  pageChromeMetrics: DocumentLayoutSnapshot['pageChromeMetrics']
  anchors: DocumentLayoutSnapshot['anchors']
  tableFragments: DocumentLayoutSnapshot['tableFragments']
  activeRange: DocumentLayoutPageRange | null
  activePages: DocumentLayoutPageSnapshot[]
  source: DocumentLayoutSnapshot['source']
}): DocumentLayoutSnapshot {
  return {
    documentVersion: options.documentVersion,
    layoutVersion: options.layoutVersion,
    source: options.source,
    pageCount: options.pageCount,
    pages: options.pages,
    flow: options.flow,
    mountedRange: options.mountedRange,
    pageBounds: options.pageBounds,
    mountedPageBodyBounds: options.mountedPageBodyBounds,
    pageSpans: options.pageSpans,
    retainedPageSpans: options.retainedPageSpans,
    pagePositionRanges: options.pagePositionRanges,
    pageChromeMetrics: options.pageChromeMetrics,
    anchors: options.anchors,
    tableFragments: options.tableFragments,
    activeRange: options.activeRange,
    activePages: options.activePages
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

export function shouldUseWindowedLayout(pageCount: number): boolean {
  return isDocumentVirtualWindowEnabled(pageCount)
}

export function resolvePreferredActiveRange(pageCount: number, targetPage: number): DocumentLayoutPageRange {
  return resolveDocumentVirtualWindowRange(pageCount, targetPage)
}

export function shouldRefreshViewportWindow(
  activeRange: DocumentLayoutPageRange | null,
  nextPage: number,
  pageCount: number
): boolean {
  return shouldShiftDocumentVirtualWindow(activeRange, nextPage, pageCount)
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

export function resolveCurrentPageFromPositionRanges(
  pagePositionRanges: DocumentLayoutPagePositionRange[],
  position: number,
  fallbackPage: number,
  preferredPage: number | null = null
): number {
  if (!Number.isInteger(position) || position < 0 || pagePositionRanges.length === 0) {
    return fallbackPage
  }

  const containingRanges = pagePositionRanges.filter(range => position >= range.startPos && position <= range.endPos)
  const normalizedPreferredPage =
    Number.isInteger(preferredPage) && (preferredPage ?? 0) > 0 ? (preferredPage as number) : null
  const lastRange = pagePositionRanges[pagePositionRanges.length - 1]

  if (containingRanges.length > 0) {
    if (normalizedPreferredPage !== null) {
      if (
        containingRanges.length === 1 &&
        lastRange &&
        containingRanges[0]?.pageNumber === lastRange.pageNumber &&
        position === lastRange.endPos &&
        normalizedPreferredPage > lastRange.pageNumber
      ) {
        return normalizedPreferredPage
      }

      return (
        containingRanges.reduce(
          (bestPage, range) => {
            if (bestPage === null) {
              return range.pageNumber
            }

            const bestDistance = Math.abs(bestPage - normalizedPreferredPage)
            const nextDistance = Math.abs(range.pageNumber - normalizedPreferredPage)
            if (nextDistance < bestDistance) {
              return range.pageNumber
            }

            if (nextDistance === bestDistance && range.pageNumber > bestPage) {
              return range.pageNumber
            }

            return bestPage
          },
          null as number | null
        ) ?? fallbackPage
      )
    }

    return containingRanges[containingRanges.length - 1]?.pageNumber ?? fallbackPage
  }

  if (
    normalizedPreferredPage !== null &&
    lastRange &&
    position >= lastRange.endPos &&
    normalizedPreferredPage > lastRange.pageNumber
  ) {
    return normalizedPreferredPage
  }

  const matchingRange = pagePositionRanges.find(range => position < range.startPos) ?? lastRange

  return matchingRange?.pageNumber ?? fallbackPage
}

function resolveSnapshotCurrentPage(
  container: HTMLDivElement,
  pageBounds: DocumentLayoutPageBodyBounds[],
  pageCount: number,
  fallbackPage: number = 1
): number {
  if (pageBounds.length > 0) {
    return Math.max(1, resolveCurrentPageFromPageBounds(container, pageBounds, fallbackPage))
  }

  // Fallback: estimate page from scroll position when bounds are unavailable (e.g., windowed shells not yet measured).
  const scrollableHeight = container.scrollHeight - container.clientHeight
  if (scrollableHeight <= 0) {
    return fallbackPage
  }
  const progress = Math.min(Math.max(container.scrollTop / scrollableHeight, 0), 1)
  const estimatedPage = Math.floor(progress * Math.max(1, pageCount)) + 1
  return Math.max(1, estimatedPage)
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

function hasLiveNavigationState(navigationState: DocumentLayoutNavigationState): boolean {
  return (
    navigationState.activeRange !== null ||
    navigationState.boundaryEls.length > 0 ||
    navigationState.pageBreakEls.length > 0 ||
    navigationState.flowEls.length > 0
  )
}

function resolveFreshCurrentPageFromNavigationState(
  container: HTMLDivElement,
  navigationState: DocumentLayoutNavigationState,
  fallbackPage: number
): number | null {
  const pageShellBounds = resolvePageShellBodyBounds(navigationState.pageBreakEls)
  const spacerBounds = resolveSpacerPageBodyBounds(navigationState.flowEls)
  const freshPageBounds = mergeMeasuredPageBodyBounds(pageShellBounds, spacerBounds)

  if (freshPageBounds.length === 0) {
    return null
  }

  return resolveCurrentPageFromPageBounds(container, freshPageBounds, fallbackPage)
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

  const resolveVisibleCurrentPage = useCallback(
    (
      container: HTMLDivElement,
      pageBounds: DocumentLayoutPageBodyBounds[],
      pageCount: number,
      fallbackPage: number = 1
    ): number => {
      const safePageCount = Math.max(1, pageCount)
      const safeFallbackPage = Math.min(Math.max(1, fallbackPage), safePageCount)
      const navigationState = navigationStateRef.current

      if (hasLiveNavigationState(navigationState)) {
        const freshCurrentPage = resolveFreshCurrentPageFromNavigationState(
          container,
          navigationState,
          safeFallbackPage
        )
        if (Number.isInteger(freshCurrentPage) && freshCurrentPage > 0) {
          return Math.min(freshCurrentPage, safePageCount)
        }

        try {
          const liveCurrentPage = resolvedLayoutService.resolveCurrentPage(container, navigationState)
          if (Number.isInteger(liveCurrentPage) && liveCurrentPage > 0) {
            return Math.min(liveCurrentPage, safePageCount)
          }
        } catch {
          // Fall back to cached snapshot geometry when live DOM navigation is unavailable.
        }
      }

      return Math.min(resolveSnapshotCurrentPage(container, pageBounds, safePageCount, safeFallbackPage), safePageCount)
    },
    [resolvedLayoutService]
  )

  const rebuildLayoutSnapshot = useCallback(
    (request: DocumentLayoutMeasurementRequest) => {
      const container = editorContainerRef.current
      if (!container) return

      const measurement = resolvedLayoutService.measureLayout(container, request)
      navigationStateRef.current = measurement.navigationState
      setLayoutNavigationState(measurement.navigationState)
      const pageShellBodyBounds = resolvePageShellBodyBounds(measurement.navigationState.pageBreakEls)
      const spacerPageBodyBounds = resolveSpacerPageBodyBounds(measurement.navigationState.flowEls)
      const mountedPageSamplingBounds = resolveMountedPageSamplingBounds(
        editor,
        measurement.layout.mountedPageBodyBounds
      )
      const mountedPageNumbers = new Set(mountedPageSamplingBounds.map(bounds => bounds.pageNumber))
      const placeholderPageBodyBounds = pageShellBodyBounds.filter(bounds => !mountedPageNumbers.has(bounds.pageNumber))
      const pageBounds = mergeMeasuredPageBodyBounds(pageShellBodyBounds, spacerPageBodyBounds)
      const mountedPagePositionRanges = resolveMountedPagePositionRanges(editor, mountedPageSamplingBounds)
      const placeholderPagePositionRanges = resolveMountedPagePositionRanges(editor, placeholderPageBodyBounds)
      const spacerPagePositionRanges = resolveSpacerPagePositionRanges(editor, measurement.navigationState.flowEls)
      const measuredPageSpans = mergeMeasuredDocumentLayoutPageSpans({
        mountedRanges: mountedPagePositionRanges,
        placeholderRanges: placeholderPagePositionRanges,
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

        nextSnapshot = createLayoutSnapshot({
          documentVersion: nextDocumentVersion,
          layoutVersion: request.generation,
          pageCount: measurement.layout.pageCount,
          pages: measurement.layout.pages,
          flow: measurement.layout.flow,
          mountedRange: measurement.layout.mountedRange,
          pageBounds,
          mountedPageBodyBounds: measurement.layout.mountedPageBodyBounds,
          pageSpans: measuredPageSpans,
          retainedPageSpans: nextRetainedPageSpans,
          pagePositionRanges: nextPagePositionRanges,
          pageChromeMetrics: measurement.layout.pageChromeMetrics,
          anchors,
          tableFragments,
          activeRange: measurement.layout.activeRange,
          activePages: measurement.layout.activePages,
          source: resolvedLayoutService.source
        })

        return nextSnapshot
      })

      const fallbackPage = currentPageRef.current ?? 1
      const nextCurrentPage = resolveVisibleCurrentPage(
        container,
        nextSnapshot.pageBounds,
        measurement.layout.pageCount,
        fallbackPage
      )
      currentPageRef.current = nextCurrentPage
      setCurrentPage(nextCurrentPage)
    },
    [editor, editorContainerRef, resolveVisibleCurrentPage, resolvedLayoutService]
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
        const fallbackPage = currentPageRef.current ?? 1
        const nextPage = resolveVisibleCurrentPage(
          container,
          layoutSnapshot.pageBounds,
          layoutSnapshot.pageCount || 1,
          fallbackPage
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
    [
      layoutSnapshot.pageBounds,
      layoutSnapshot.pageCount,
      resolveVisibleCurrentPage,
      runtimeState,
      scheduleLayoutSnapshotRefresh
    ]
  )

  useEffect(() => {
    if (!editor || typeof editor.on !== 'function' || typeof editor.off !== 'function') {
      return
    }

    const handleSelectionUpdate = () => {
      const container = editorContainerRef.current
      const visiblePage =
        container && layoutSnapshot.pageCount > 0
          ? resolveVisibleCurrentPage(
              container,
              layoutSnapshot.pageBounds,
              layoutSnapshot.pageCount || 1,
              currentPageRef.current
            )
          : currentPageRef.current
      const nextPage = Math.min(
        resolveCurrentPageFromPositionRanges(
          layoutSnapshot.pagePositionRanges ?? [],
          editor.state.selection.head,
          currentPageRef.current,
          visiblePage
        ),
        layoutSnapshot.pageCount || 1
      )

      if (nextPage === currentPageRef.current) {
        return
      }

      currentPageRef.current = nextPage
      setCurrentPage(nextPage)

      const activeRange = navigationStateRef.current.activeRange
      if (
        shouldRefreshViewportWindow(activeRange, nextPage, layoutSnapshot.pageCount || 1) &&
        !isPendingViewportRefreshForPage(runtimeState, nextPage)
      ) {
        scheduleLayoutSnapshotRefresh('viewport-resize', false, nextPage)
      }
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [
    editor,
    editorContainerRef,
    layoutSnapshot.pageBounds,
    layoutSnapshot.pageCount,
    layoutSnapshot.pagePositionRanges,
    resolveVisibleCurrentPage,
    runtimeState,
    scheduleLayoutSnapshotRefresh
  ])

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
