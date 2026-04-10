import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from 'react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { ySyncPluginKey } from '@tiptap/y-tiptap'
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
  resolvePlaceholderPageBodyBounds,
  resolvePageShellBodyBounds,
  yieldToNextAnimationFrame,
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
import { LARGE_DOC_PAGE_YIELD_THRESHOLD } from '@/components/tiptap-extensions/tiptap-custom-pagination/deferredRepaginationEvaluationController'
import {
  incrementPaginationInstrumentationCounter,
  recordPaginationInstrumentationEvent,
  startPaginationInstrumentationTimer
} from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationInstrumentation'
import { classifyPaginationTransaction } from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationTransactionClassifier'
import { PAGINATION_REFRESH_META } from '@/components/tiptap-extensions/tiptap-custom-pagination/PaginationPlus'
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
  /** First layout scheduler idle after open (pagination measurement caught up for initial view). */
  isInitialLayoutSettled: boolean
}

const PAGE_POSITION_SAMPLE_INSET_PX = 12
const SPACER_PAGE_HEIGHTS_SEPARATOR = ','
const OPEN_LAYOUT_BURST_MS = 150

/** Align with repagination large-doc threshold: debounce structural layout to coalesce pagination-owned bursts. */
const LARGE_DOC_LAYOUT_DEBOUNCE_PAGE_THRESHOLD = LARGE_DOC_PAGE_YIELD_THRESHOLD

const BOOTSTRAP_LAYOUT_REASON_PRIORITY: Partial<Record<DocumentLayoutInvalidationReason, number>> = {
  'initial-load': 1,
  'layout-service-changed': 2,
  'document-hydration': 3
}

function mergeBootstrapLayoutReason(
  current: DocumentLayoutInvalidationReason,
  next: DocumentLayoutInvalidationReason
): DocumentLayoutInvalidationReason {
  const currentRank = BOOTSTRAP_LAYOUT_REASON_PRIORITY[current] ?? 0
  const nextRank = BOOTSTRAP_LAYOUT_REASON_PRIORITY[next] ?? 0
  return nextRank > currentRank ? next : current
}

function syncDocumentLayoutRuntimeTelemetry(container: HTMLDivElement | null, state: DocumentLayoutRuntimeState): void {
  if (!container) return
  container.dataset.layoutRuntimeStatus = state.status
  container.dataset.layoutRuntimeGeneration = String(state.resolvedGeneration)
  container.dataset.layoutRuntimeReason = state.lastResolvedReason ?? ''
}

function isBootstrapLayoutReason(reason: DocumentLayoutInvalidationReason): boolean {
  return reason === 'initial-load' || reason === 'document-hydration' || reason === 'layout-service-changed'
}

/**
 * Returns the ProseMirror view when `editor.view` and `view.dom` are readable.
 * TipTap getters throw after unmount — common when layout resumes after `await requestAnimationFrame()`.
 */
function resolveEditorView(editor: TiptapEditor | null): TiptapEditor['view'] | null {
  try {
    const view = editor?.view ?? null
    if (!view) {
      return null
    }
    void view.dom
    return view
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

const pagePositionRangeCache = new WeakMap<object, Map<string, DocumentLayoutPagePositionRange[]>>()

function createPageBodyBoundsCacheKey(bounds: DocumentLayoutPageBodyBounds[], variant: 'mounted' | 'spacer'): string {
  return `${variant}:${bounds
    .map(bound =>
      [
        bound.pageNumber,
        bound.left.toFixed(1),
        bound.right.toFixed(1),
        bound.top.toFixed(1),
        bound.bottom.toFixed(1)
      ].join(':')
    )
    .join('|')}`
}

function resolveCachedPagePositionRanges(doc: object | null, key: string): DocumentLayoutPagePositionRange[] | null {
  if (doc === null) {
    return null
  }

  return pagePositionRangeCache.get(doc)?.get(key) ?? null
}

function storeCachedPagePositionRanges(
  doc: object | null,
  key: string,
  ranges: DocumentLayoutPagePositionRange[]
): DocumentLayoutPagePositionRange[] {
  if (doc === null) {
    return ranges
  }

  const nextRanges = ranges.map(range => ({ ...range }))
  const existingCache = pagePositionRangeCache.get(doc)
  if (existingCache) {
    existingCache.set(key, nextRanges)
  } else {
    pagePositionRangeCache.set(doc, new Map([[key, nextRanges]]))
  }

  return nextRanges.map(range => ({ ...range }))
}

export function resolveMountedPagePositionRanges(
  editor: TiptapEditor | null,
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
): DocumentLayoutPagePositionRange[] {
  const view = resolveEditorView(editor)
  if (!view || mountedPageBodyBounds.length === 0) {
    return []
  }

  const doc = (view as { state?: { doc?: object } }).state?.doc ?? null
  const cacheKey = createPageBodyBoundsCacheKey(mountedPageBodyBounds, 'mounted')
  const cachedRanges = resolveCachedPagePositionRanges(doc, cacheKey)
  if (cachedRanges) {
    incrementPaginationInstrumentationCounter('layout-page-position-range-cache-hit:mounted')
    return cachedRanges.map(range => ({ ...range }))
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

  const resolvedRanges = Array.from(positionsByPageNumber.entries())
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

  return storeCachedPagePositionRanges(doc, cacheKey, resolvedRanges)
}

function resolveMountedPageSamplingBounds(
  editor: TiptapEditor | null,
  fallbackBounds: DocumentLayoutPageBodyBounds[]
): DocumentLayoutPageBodyBounds[] {
  const view = resolveEditorView(editor)
  if (!view) {
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

  const spacerBounds = resolveSpacerPageBodyBounds(flowEls)
  if (spacerBounds.length === 0) {
    return []
  }

  const doc = (view as { state?: { doc?: object } }).state?.doc ?? null
  const cacheKey = createPageBodyBoundsCacheKey(spacerBounds, 'spacer')
  const cachedRanges = resolveCachedPagePositionRanges(doc, cacheKey)
  if (cachedRanges) {
    incrementPaginationInstrumentationCounter('layout-page-position-range-cache-hit:spacer')
    return cachedRanges.map(range => ({ ...range }))
  }

  const resolvedRanges = spacerBounds
    .map(bounds => {
      const sampleLeft = resolveHorizontalSample(bounds.left, bounds.right)
      if (sampleLeft === null) {
        return null
      }

      const verticalSamples = resolveCoordinateSamples(bounds.top, bounds.bottom)
      const positions = verticalSamples
        .map(top => resolvePositionAtCoordinates(view, sampleLeft, top))
        .filter((position): position is number => position !== null)
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

  return storeCachedPagePositionRanges(doc, cacheKey, resolvedRanges)
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

export function resolveRetainedPagePositionRanges(
  previousRanges: DocumentLayoutPagePositionRange[],
  pageNumbers: Set<number>
): DocumentLayoutPagePositionRange[] {
  if (pageNumbers.size === 0 || previousRanges.length === 0) {
    return []
  }

  return previousRanges
    .filter(range => pageNumbers.has(range.pageNumber))
    .map(range => ({
      pageNumber: range.pageNumber,
      startPos: range.startPos,
      endPos: range.endPos
    }))
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
  const runtimeStateRef = useRef<DocumentLayoutRuntimeState>({
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
  const openBurstDeadlineMsRef = useRef(0)
  const openBurstRafRef = useRef<number | null>(null)
  const openBurstPendingRef = useRef<{
    reason: DocumentLayoutInvalidationReason
    targetPage: number
  } | null>(null)
  const firstLayoutIdleMarkedRef = useRef(false)
  const hydrationRefreshKeyRef = useRef<string | null>(null)

  const [layoutSnapshot, setLayoutSnapshot] = useState<DocumentLayoutSnapshot>(() =>
    createEmptyDocumentLayoutSnapshot(resolvedLayoutService.source)
  )
  const layoutSnapshotRef = useRef<DocumentLayoutSnapshot>(
    createEmptyDocumentLayoutSnapshot(resolvedLayoutService.source)
  )
  /** Last page count from a layout measurement (updated before React state catches up; drives large-doc debounce). */
  const lastMeasuredLayoutPageCountRef = useRef(1)
  const [layoutNavigationState, setLayoutNavigationState] = useState<DocumentLayoutNavigationState>({
    boundaryEls: [],
    activeRange: null,
    pageBreakEls: [],
    flowEls: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const currentPageRef = useRef(1)
  const [isInitialLayoutSettled, setIsInitialLayoutSettled] = useState(false)
  const hasInitializedLayoutRef = useRef(false)
  const previousLayoutInputsKeyRef = useRef<string | undefined>(layoutInputsKey)
  const lastMeasuredDocRef = useRef<object | null>(null)

  useEffect(() => {
    layoutSnapshotRef.current = layoutSnapshot
  }, [layoutSnapshot])

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
        if (freshCurrentPage !== null && Number.isInteger(freshCurrentPage) && freshCurrentPage > 0) {
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
    async (request: DocumentLayoutMeasurementRequest) => {
      const container = editorContainerRef.current
      if (!container) return
      incrementPaginationInstrumentationCounter('layout-snapshot-rebuild-total')
      incrementPaginationInstrumentationCounter(`layout-snapshot-rebuild-reason:${request.reason}`)
      incrementPaginationInstrumentationCounter(`layout-snapshot-rebuild-scope:${request.scope}`)
      const finishInstrumentation = startPaginationInstrumentationTimer('layout-snapshot-rebuild', {
        generation: request.generation,
        reason: request.reason,
        scope: request.scope,
        requestedPageRangeEnd: request.pageRange?.endPage ?? null,
        requestedPageRangeStart: request.pageRange?.startPage ?? null
      })
      let measuredPageCount = 0
      let mountedPageBodyBoundCount = 0
      let mountedPageSamplingBoundsCount = 0
      let mountedPagePositionRangeCount = 0
      let placeholderPagePositionRangeCount = 0
      let spacerPagePositionRangeCount = 0
      let nextSnapshotMountedRangeStart: number | null = null
      let nextSnapshotMountedRangeEnd: number | null = null
      let nextSnapshotActiveRangeStart: number | null = null
      let nextSnapshotActiveRangeEnd: number | null = null

      try {
        const measurement =
          typeof resolvedLayoutService.measureLayoutAsync === 'function'
            ? await resolvedLayoutService.measureLayoutAsync(container, request)
            : resolvedLayoutService.measureLayout(container, request)
        if (!editorContainerRef.current) {
          return
        }
        measuredPageCount = measurement.layout.pageCount
        mountedPageBodyBoundCount = measurement.layout.mountedPageBodyBounds.length
        lastMeasuredLayoutPageCountRef.current = measurement.layout.pageCount
        navigationStateRef.current = measurement.navigationState
        setLayoutNavigationState(previous => {
          const nextNav = measurement.navigationState
          if (
            previous.activeRange?.startPage === nextNav.activeRange?.startPage &&
            previous.activeRange?.endPage === nextNav.activeRange?.endPage &&
            previous.pageBreakEls === nextNav.pageBreakEls &&
            previous.flowEls === nextNav.flowEls &&
            previous.boundaryEls === nextNav.boundaryEls
          ) {
            return previous
          }
          return nextNav
        })
        if (measurement.layout.pageCount >= LARGE_DOC_LAYOUT_DEBOUNCE_PAGE_THRESHOLD) {
          await yieldToNextAnimationFrame()
          await yieldToNextAnimationFrame()
        }
        if (!editorContainerRef.current) {
          return
        }
        const mountedPageBodyBounds = measurement.layout.mountedPageBodyBounds
        const placeholderPageBodyBounds = resolvePlaceholderPageBodyBounds(measurement.navigationState.pageBreakEls)
        const spacerPageBodyBounds = resolveSpacerPageBodyBounds(measurement.navigationState.flowEls)
        let currentDoc: ProseMirrorNode | null = null
        try {
          currentDoc = editor?.state.doc ?? null
        } catch {
          currentDoc = null
        }
        const previousSnapshot = layoutSnapshotRef.current
        const docChanged = currentDoc !== lastMeasuredDocRef.current
        const mountedPageSamplingBounds = resolveMountedPageSamplingBounds(editor, mountedPageBodyBounds)
        mountedPageSamplingBoundsCount = mountedPageSamplingBounds.length
        const mountedPageNumbers = new Set(mountedPageSamplingBounds.map(bounds => bounds.pageNumber))
        const placeholderSamplingBounds = placeholderPageBodyBounds.filter(
          bounds => !mountedPageNumbers.has(bounds.pageNumber)
        )
        const pageBounds = mergeMeasuredPageBodyBounds(
          mergeMeasuredPageBodyBounds(mountedPageBodyBounds, placeholderPageBodyBounds),
          spacerPageBodyBounds
        )
        const mountedPagePositionRanges = resolveMountedPagePositionRanges(editor, mountedPageSamplingBounds)
        mountedPagePositionRangeCount = mountedPagePositionRanges.length
        const retainedPlaceholderPageNumbers = new Set(placeholderSamplingBounds.map(bounds => bounds.pageNumber))
        const retainedPlaceholderPagePositionRanges = docChanged
          ? []
          : resolveRetainedPagePositionRanges(previousSnapshot.pagePositionRanges ?? [], retainedPlaceholderPageNumbers)
        const sampledPlaceholderPagePositionRanges = resolveMountedPagePositionRanges(
          editor,
          placeholderSamplingBounds.filter(
            bounds => !retainedPlaceholderPagePositionRanges.some(range => range.pageNumber === bounds.pageNumber)
          )
        )
        if (retainedPlaceholderPagePositionRanges.length > 0) {
          incrementPaginationInstrumentationCounter('layout-placeholder-position-range-reused')
        }
        const placeholderPagePositionRanges = mergeDocumentLayoutPagePositionRanges(
          retainedPlaceholderPagePositionRanges,
          sampledPlaceholderPagePositionRanges,
          measurement.layout.pageCount
        )
        placeholderPagePositionRangeCount = placeholderPagePositionRanges.length
        const spacerPagePositionRanges = resolveSpacerPagePositionRanges(editor, measurement.navigationState.flowEls)
        spacerPagePositionRangeCount = spacerPagePositionRanges.length
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
          const tableFragments =
            request.scope === 'viewport' && !docChanged
              ? previous.tableFragments
              : collectDocumentLayoutTableFragments(editor, measuredPageSpans)

          nextSnapshot = createLayoutSnapshot({
            documentVersion: nextDocumentVersion,
            layoutVersion: request.generation,
            pageCount: measurement.layout.pageCount,
            pages: measurement.layout.pages,
            flow: measurement.layout.flow,
            mountedRange: measurement.layout.mountedRange,
            pageBounds,
            mountedPageBodyBounds,
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

        nextSnapshotMountedRangeStart = nextSnapshot.mountedRange?.startPage ?? null
        nextSnapshotMountedRangeEnd = nextSnapshot.mountedRange?.endPage ?? null
        nextSnapshotActiveRangeStart = nextSnapshot.activeRange?.startPage ?? null
        nextSnapshotActiveRangeEnd = nextSnapshot.activeRange?.endPage ?? null

        const fallbackPage = currentPageRef.current ?? 1
        const nextCurrentPage = resolveVisibleCurrentPage(
          container,
          nextSnapshot.pageBounds,
          measurement.layout.pageCount,
          fallbackPage
        )
        currentPageRef.current = nextCurrentPage
        setCurrentPage(previous => (previous === nextCurrentPage ? previous : nextCurrentPage))
      } finally {
        finishInstrumentation({
          activeRangeEnd: nextSnapshotActiveRangeEnd,
          activeRangeStart: nextSnapshotActiveRangeStart,
          measuredPageCount,
          mountedPageBodyBoundCount,
          mountedPagePositionRangeCount,
          mountedPageSamplingBoundsCount,
          mountedRangeEnd: nextSnapshotMountedRangeEnd,
          mountedRangeStart: nextSnapshotMountedRangeStart,
          placeholderPagePositionRangeCount,
          spacerPagePositionRangeCount
        })
      }
    },
    [editor, editorContainerRef, resolveVisibleCurrentPage, resolvedLayoutService]
  )

  const handleSchedulerRuntimeChange = useCallback(
    (next: DocumentLayoutRuntimeState) => {
      const previous = runtimeStateRef.current
      runtimeStateRef.current = next
      syncDocumentLayoutRuntimeTelemetry(editorContainerRef.current, next)
      if (
        typeof performance !== 'undefined' &&
        typeof performance.mark === 'function' &&
        !firstLayoutIdleMarkedRef.current &&
        next.status === 'idle' &&
        next.resolvedGeneration > 0 &&
        next.requestedGeneration === next.resolvedGeneration
      ) {
        firstLayoutIdleMarkedRef.current = true
        performance.mark('document-layout-first-idle')
        setIsInitialLayoutSettled(true)
      }
      if (
        typeof performance !== 'undefined' &&
        typeof performance.mark === 'function' &&
        previous.status !== 'idle' &&
        next.status === 'idle'
      ) {
        performance.mark('document-layout-runtime-idle')
      }
    },
    [editorContainerRef]
  )

  const layoutScheduler = useMemo(
    () =>
      createDocumentLayoutScheduler({
        source: resolvedLayoutService.source,
        runMeasurement: rebuildLayoutSnapshot,
        onStateChange: handleSchedulerRuntimeChange
      }),
    [rebuildLayoutSnapshot, handleSchedulerRuntimeChange, resolvedLayoutService.source]
  )

  useEffect(() => {
    openBurstDeadlineMsRef.current = Date.now() + OPEN_LAYOUT_BURST_MS
    firstLayoutIdleMarkedRef.current = false
    setIsInitialLayoutSettled(false)
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark('document-layout-open-bootstrap')
    }
  }, [layoutScheduler])

  const scheduleLayoutSnapshotRefresh = useCallback(
    (reason: DocumentLayoutInvalidationReason, immediate = false, targetPage?: number) => {
      const pageCount = Math.max(1, layoutSnapshotRef.current.pageCount || lastMeasuredLayoutPageCountRef.current || 1)
      const resolvedTargetPage = targetPage ?? currentPageRef.current
      const scope = resolveInvalidationScope(reason)
      const pageRange = resolveInvalidationRange(reason, pageCount, resolvedTargetPage)
      incrementPaginationInstrumentationCounter('layout-snapshot-refresh-scheduled-total')
      incrementPaginationInstrumentationCounter(`layout-snapshot-refresh-reason:${reason}`)
      if (immediate) {
        incrementPaginationInstrumentationCounter('layout-snapshot-refresh-immediate')
      }
      recordPaginationInstrumentationEvent('layout-snapshot-refresh-scheduled', {
        immediate,
        pageCount,
        pageRangeEnd: pageRange?.endPage ?? null,
        pageRangeStart: pageRange?.startPage ?? null,
        reason,
        scope,
        targetPage: resolvedTargetPage
      })
      const now = Date.now()
      const inOpenBurst = immediate && now < openBurstDeadlineMsRef.current && isBootstrapLayoutReason(reason)

      if (inOpenBurst) {
        const pending = openBurstPendingRef.current
        const mergedReason = pending === null ? reason : mergeBootstrapLayoutReason(pending.reason, reason)
        openBurstPendingRef.current = {
          reason: mergedReason,
          targetPage: resolvedTargetPage
        }
        if (openBurstRafRef.current === null) {
          openBurstRafRef.current = requestAnimationFrame(() => {
            openBurstRafRef.current = null
            const burst = openBurstPendingRef.current
            openBurstPendingRef.current = null
            if (!burst) return
            const snapshotPageCount = lastMeasuredLayoutPageCountRef.current
            const burstScope = resolveInvalidationScope(burst.reason)
            const burstPageRange = resolveInvalidationRange(burst.reason, snapshotPageCount, burst.targetPage)
            recordPaginationInstrumentationEvent('layout-snapshot-open-burst-flush', {
              pageCount: snapshotPageCount,
              pageRangeEnd: burstPageRange?.endPage ?? null,
              pageRangeStart: burstPageRange?.startPage ?? null,
              reason: burst.reason,
              scope: burstScope,
              targetPage: burst.targetPage
            })
            layoutScheduler.requestLayout({
              immediate: true,
              reason: burst.reason,
              scope: burstScope,
              pageRange: burstPageRange
            })
          })
        }
        return
      }

      layoutScheduler.requestLayout({
        immediate,
        reason,
        scope,
        pageRange
      })
    },
    [layoutScheduler]
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
          !isPendingViewportRefreshForPage(runtimeStateRef.current, nextPage)
        ) {
          scheduleLayoutSnapshotRefresh('viewport-resize', false, nextPage)
        }
      })
    },
    [layoutSnapshot.pageBounds, layoutSnapshot.pageCount, resolveVisibleCurrentPage, scheduleLayoutSnapshotRefresh]
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
        !isPendingViewportRefreshForPage(runtimeStateRef.current, nextPage)
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
    scheduleLayoutSnapshotRefresh
  ])

  useEffect(() => {
    navigationStateRef.current = { boundaryEls: [], activeRange: null, pageBreakEls: [], flowEls: [] }
    lastMeasuredLayoutPageCountRef.current = 1
    const emptySnapshot = createEmptyDocumentLayoutSnapshot(resolvedLayoutService.source)
    layoutSnapshotRef.current = emptySnapshot
    setLayoutSnapshot(emptySnapshot)
    setLayoutNavigationState({ boundaryEls: [], activeRange: null, pageBreakEls: [], flowEls: [] })
    const initialRuntime = layoutScheduler.getState()
    runtimeStateRef.current = initialRuntime
    syncDocumentLayoutRuntimeTelemetry(editorContainerRef.current, initialRuntime)
    currentPageRef.current = 1
    setCurrentPage(1)
    setIsInitialLayoutSettled(false)
    hydrationRefreshKeyRef.current = null
    previousLayoutInputsKeyRef.current = layoutInputsKey
  }, [editorContainerRef, layoutScheduler, resolvedLayoutService.source])

  useEffect(() => {
    if (!isYjsSynced) {
      hydrationRefreshKeyRef.current = null
    }
  }, [documentId, isYjsSynced, resolvedLayoutService.source])

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

    const hydrationRefreshKey = documentId ? `${documentId}:${resolvedLayoutService.source}` : null
    if (hydrationRefreshKeyRef.current === hydrationRefreshKey) {
      return
    }

    hydrationRefreshKeyRef.current = hydrationRefreshKey
    scheduleLayoutSnapshotRefresh('document-hydration', true)
  }, [documentId, isYjsSynced, resolvedLayoutService.source, scheduleLayoutSnapshotRefresh])

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

    const handleTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!hasInitializedLayoutRef.current) {
        return
      }
      const isPaginationRefresh = transaction.getMeta(PAGINATION_REFRESH_META) === true
      if (!transaction.docChanged && !isPaginationRefresh) {
        return
      }
      if (transaction.getMeta(ySyncPluginKey)) {
        return
      }

      // Large docs: debounce coalesces rapid structural passes (e.g. pagination-owned RM_PAGES_* transactions).
      const debounceStructuralLayout =
        lastMeasuredLayoutPageCountRef.current >= LARGE_DOC_LAYOUT_DEBOUNCE_PAGE_THRESHOLD
      const transactionClassification = transaction.docChanged
        ? classifyPaginationTransaction({
            transaction,
            previousDoc: transaction.before ?? null,
            nextDoc: transaction.doc ?? null
          })
        : null

      if (transactionClassification?.isLayoutNeutral) {
        return
      }

      if (isPaginationRefresh) {
        scheduleLayoutSnapshotRefresh('editor-transaction', !debounceStructuralLayout)
        return
      }

      const shouldDebounceForLocalTextChange =
        transactionClassification?.kind === 'local-text' && !transactionClassification.touchesTableRegion

      scheduleLayoutSnapshotRefresh(
        'editor-transaction',
        !(debounceStructuralLayout || shouldDebounceForLocalTextChange)
      )
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
      if (openBurstRafRef.current !== null) {
        cancelAnimationFrame(openBurstRafRef.current)
        openBurstRafRef.current = null
      }
      openBurstPendingRef.current = null
    }
  }, [layoutScheduler])

  return {
    currentPage,
    handleScroll,
    layoutNavigationState,
    layoutSnapshot,
    isInitialLayoutSettled
  }
}
