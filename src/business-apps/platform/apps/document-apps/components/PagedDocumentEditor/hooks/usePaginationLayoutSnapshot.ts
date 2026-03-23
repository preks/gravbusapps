import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type {
  DocumentLayoutInvalidationReason,
  DocumentLayoutInvalidationScope,
  DocumentLayoutMeasurementRequest,
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

function createLayoutSnapshot(
  layoutVersion: number,
  pageCount: number,
  pages: DocumentLayoutPageSnapshot[],
  activeRange: DocumentLayoutPageRange | null,
  activePages: DocumentLayoutPageSnapshot[],
  source: DocumentLayoutSnapshot['source']
): DocumentLayoutSnapshot {
  return {
    layoutVersion,
    source,
    pageCount,
    pages,
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

function resolveInvalidationRange(
  reason: DocumentLayoutInvalidationReason,
  pageCount: number,
  currentPage: number
): DocumentLayoutPageRange | null {
  const safePageCount = Math.max(1, pageCount)
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount)

  switch (reason) {
    case 'viewport-resize':
      return createPageRange(Math.max(1, safeCurrentPage - 1), Math.min(safePageCount, safeCurrentPage + 1))
    case 'layout-inputs-changed':
    case 'initial-load':
    case 'document-hydration':
    case 'layout-service-changed':
      return createPageRange(1, safePageCount)
    case 'legacy-dom-structure':
    default:
      return null
  }
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
    pageBreakEls: []
  })
  const scrollThrottleRef = useRef<number | null>(null)

  const [layoutSnapshot, setLayoutSnapshot] = useState<DocumentLayoutSnapshot>(() =>
    createLayoutSnapshot(0, 1, [{ pageNumber: 1 }], null, [{ pageNumber: 1 }], resolvedLayoutService.source)
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
    pageBreakEls: []
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

      setLayoutSnapshot(
        createLayoutSnapshot(
          request.generation,
          measurement.layout.pageCount,
          measurement.layout.pages,
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
    [editorContainerRef, resolvedLayoutService]
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
        if (
          activeRange &&
          (activeRange.startPage > 1 || activeRange.endPage < layoutSnapshot.pageCount) &&
          (nextPage <= activeRange.startPage + 1 || nextPage >= activeRange.endPage - 1)
        ) {
          scheduleLayoutSnapshotRefresh('viewport-resize', false, nextPage)
        }
      })
    },
    [layoutSnapshot.pageCount, resolvedLayoutService, scheduleLayoutSnapshotRefresh]
  )

  useEffect(() => {
    navigationStateRef.current = { boundaryEls: [], activeRange: null, pageBreakEls: [] }
    setLayoutSnapshot(
      createLayoutSnapshot(0, 1, [{ pageNumber: 1 }], null, [{ pageNumber: 1 }], resolvedLayoutService.source)
    )
    setLayoutNavigationState({ boundaryEls: [], activeRange: null, pageBreakEls: [] })
    setRuntimeState(layoutScheduler.getState())
    setCurrentPage(1)
    previousLayoutInputsKeyRef.current = layoutInputsKey
  }, [layoutScheduler, resolvedLayoutService.source])

  useEffect(() => {
    if (!documentId) return
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
