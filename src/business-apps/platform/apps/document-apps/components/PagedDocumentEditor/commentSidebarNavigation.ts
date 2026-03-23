import type { DocumentLayoutPageBodyBounds, DocumentLayoutPagePositionRange } from '../../../types'

const PAGE_NUMBER_SELECTOR = [
  '.page[data-rm-page-number]',
  '.rm-page-body-layer[data-rm-page-number]',
  '.rm-page-header-region[data-rm-page-number]',
  '.rm-page-footer-region[data-rm-page-number]',
  '.rm-first-page-header[data-rm-page-number]'
].join(', ')

type CommentNavigationView = {
  dom: HTMLElement
  nodeDOM?: (pos: number) => Node | null
  domAtPos: (pos: number) => { node: Node }
  coordsAtPos: (pos: number) => { top: number; bottom: number }
}

type CommentNavigationEditor = {
  view: CommentNavigationView
  commands?: {
    hydratePageBreakShells?: (pageNumbers: number[]) => boolean
    requestViewportPageFocus?: (pageNumber: number) => boolean
  }
  layoutHints?: {
    mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
    pagePositionRanges?: DocumentLayoutPagePositionRange[]
  }
}

type SelectionAnchorPosition = {
  top: number
  left: number
}

type PublishedPageBodyBounds = SelectionAnchorPosition & {
  bottom: number
  right: number
}

type ViewportLayoutSnapshot = {
  scrollTop: number
  windowKey: string
  mountedRangeKey: string
  runtimeGeneration: string
  runtimeStatus: string
}

const LAYOUT_SETTLE_FRAME_LIMIT = 12

function resolveElementPageNumber(element: Element | null): number | null {
  const pageElement = element?.closest(PAGE_NUMBER_SELECTOR)
  const pageNumber = Number(pageElement?.getAttribute('data-rm-page-number') ?? '')
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

function resolvePositionElement(view: CommentNavigationView, pos: number): Element | null {
  const directNode = typeof view.nodeDOM === 'function' ? view.nodeDOM(pos) : null
  if (directNode instanceof Element) {
    return directNode
  }
  if (directNode instanceof Text) {
    return directNode.parentElement
  }

  try {
    const dom = view.domAtPos(pos)
    if (dom.node instanceof Element) {
      return dom.node
    }
    if (dom.node instanceof Text) {
      return dom.node.parentElement
    }
  } catch {
    return null
  }

  return null
}

function resolvePublishedPageBodyBounds(element: Element | null): PublishedPageBodyBounds | null {
  const pageElement = element?.closest(PAGE_NUMBER_SELECTOR)
  if (!(pageElement instanceof HTMLElement)) {
    return null
  }

  const top = Number(pageElement.dataset.layoutBodyTop ?? '')
  const bottom = Number(pageElement.dataset.layoutBodyBottom ?? '')
  const left = Number(pageElement.dataset.layoutBodyLeft ?? '')
  const right = Number(pageElement.dataset.layoutBodyRight ?? '')
  if (![top, bottom, left, right].every(Number.isFinite)) {
    return null
  }

  return {
    top,
    bottom,
    left,
    right
  }
}

function resolveLayoutHintPageBounds(
  layoutHints: CommentNavigationEditor['layoutHints'],
  top: number,
  bottom: number
): DocumentLayoutPageBodyBounds | null {
  const midpoint = (top + bottom) / 2
  return (
    layoutHints?.mountedPageBodyBounds.find(candidate => midpoint >= candidate.top && midpoint <= candidate.bottom) ??
    null
  )
}

function toPublishedPageBodyBounds(bounds: DocumentLayoutPageBodyBounds): PublishedPageBodyBounds {
  return {
    top: bounds.top,
    bottom: bounds.bottom,
    left: bounds.left,
    right: bounds.right
  }
}

function resolvePageNumberFromPositionRanges(
  pagePositionRanges: DocumentLayoutPagePositionRange[] | undefined,
  pos: number
): number | null {
  if (!Number.isInteger(pos) || pos < 0) {
    return null
  }

  const range = pagePositionRanges?.find(candidate => pos >= candidate.startPos && pos <= candidate.endPos)
  return range?.pageNumber ?? null
}

function resolvePageBoundsByNumber(
  layoutHints: CommentNavigationEditor['layoutHints'],
  pageNumber: number | null
): PublishedPageBodyBounds | null {
  if (pageNumber === null) {
    return null
  }

  const bounds = layoutHints?.mountedPageBodyBounds.find(candidate => candidate.pageNumber === pageNumber)
  return bounds ? toPublishedPageBodyBounds(bounds) : null
}

function resolvePageNumberFromLayoutHints(editor: CommentNavigationEditor, pos: number): number | null {
  const positionRangePageNumber = resolvePageNumberFromPositionRanges(editor.layoutHints?.pagePositionRanges, pos)
  if (positionRangePageNumber !== null) {
    return positionRangePageNumber
  }

  try {
    const coords = editor.view.coordsAtPos(pos)
    return resolveLayoutHintPageBounds(editor.layoutHints, coords.top, coords.bottom)?.pageNumber ?? null
  } catch {
    return null
  }
}

function resolveSelectionPositionBodyBounds(
  editor: CommentNavigationEditor,
  pos: number
): PublishedPageBodyBounds | null {
  const hintedPageNumber = resolvePageNumberFromPositionRanges(editor.layoutHints?.pagePositionRanges, pos)
  const hintedPageBounds = resolvePageBoundsByNumber(editor.layoutHints, hintedPageNumber)
  if (hintedPageBounds) {
    return hintedPageBounds
  }

  try {
    const coords = editor.view.coordsAtPos(pos)
    const hintedBounds = resolveLayoutHintPageBounds(editor.layoutHints, coords.top, coords.bottom)
    if (hintedBounds) {
      return toPublishedPageBodyBounds(hintedBounds)
    }
  } catch {
    // Fall back to published bounds or DOM rects below.
  }

  return resolvePublishedPageBodyBounds(resolvePositionElement(editor.view, pos))
}

export function resolveInlineCommentSelectionPageNumbers(
  editor: CommentNavigationEditor,
  from: number,
  to: number
): number[] {
  const positions = [from, to > from ? to - 1 : from]

  return Array.from(
    new Set(
      positions
        .map(
          pos =>
            resolvePageNumberFromLayoutHints(editor, pos) ??
            resolveElementPageNumber(resolvePositionElement(editor.view, pos))
        )
        .filter((pageNumber): pageNumber is number => pageNumber !== null)
    )
  ).sort((left, right) => left - right)
}

function resolvePaginationViewport(view: CommentNavigationView): HTMLElement | null {
  const viewport = view.dom.closest('.document-editor-viewport')
  return viewport instanceof HTMLElement ? viewport : null
}

function captureViewportLayoutSnapshot(view: CommentNavigationView): ViewportLayoutSnapshot | null {
  const viewport = resolvePaginationViewport(view)
  if (!(viewport instanceof HTMLElement)) {
    return null
  }

  return {
    scrollTop: viewport.scrollTop,
    windowKey: viewport.dataset.layoutWindowKey ?? '',
    mountedRangeKey: `${viewport.dataset.layoutMountedStart ?? ''}-${viewport.dataset.layoutMountedEnd ?? ''}`,
    runtimeGeneration: viewport.dataset.layoutRuntimeGeneration ?? '',
    runtimeStatus: viewport.dataset.layoutRuntimeStatus ?? 'idle'
  }
}

function hasViewportLayoutSettledChange(
  baseline: ViewportLayoutSnapshot | null,
  nextSnapshot: ViewportLayoutSnapshot
): boolean {
  if (!baseline) {
    return true
  }

  return (
    nextSnapshot.scrollTop !== baseline.scrollTop ||
    nextSnapshot.windowKey !== baseline.windowKey ||
    nextSnapshot.mountedRangeKey !== baseline.mountedRangeKey ||
    nextSnapshot.runtimeGeneration !== baseline.runtimeGeneration
  )
}

function retryAfterViewportFocusSettles(
  editor: CommentNavigationEditor,
  baseline: ViewportLayoutSnapshot | null,
  onReady: () => void,
  remainingFrames = LAYOUT_SETTLE_FRAME_LIMIT,
  hasObservedChange = false
) {
  requestAnimationFrame(() => {
    if (remainingFrames <= 0) {
      onReady()
      return
    }

    const nextSnapshot = captureViewportLayoutSnapshot(editor.view)
    if (!nextSnapshot) {
      onReady()
      return
    }

    const observedChange = hasObservedChange || hasViewportLayoutSettledChange(baseline, nextSnapshot)
    if (observedChange && nextSnapshot.runtimeStatus === 'idle') {
      onReady()
      return
    }

    retryAfterViewportFocusSettles(editor, baseline, onReady, remainingFrames - 1, observedChange)
  })
}

function scrollViewportToPageBounds(
  view: CommentNavigationView,
  bounds: PublishedPageBodyBounds,
  block: ScrollLogicalPosition
): boolean {
  const viewport = resolvePaginationViewport(view)
  if (!(viewport instanceof HTMLElement)) {
    return false
  }

  const viewportRect = viewport.getBoundingClientRect()
  let targetScrollTop = viewport.scrollTop

  if (block === 'start') {
    targetScrollTop += bounds.top - viewportRect.top - 24
  } else {
    const pageCenter = (bounds.top + bounds.bottom) / 2
    const viewportCenter = (viewportRect.top + viewportRect.bottom) / 2
    targetScrollTop += pageCenter - viewportCenter
  }

  viewport.scrollTop = Math.max(0, targetScrollTop)
  viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
  return true
}

export function hydrateInlineCommentSelectionPages(editor: CommentNavigationEditor, from: number, to: number): boolean {
  const pageNumbers = resolveInlineCommentSelectionPageNumbers(editor, from, to)
  if (pageNumbers.length === 0) {
    return false
  }

  return editor.commands?.hydratePageBreakShells?.(pageNumbers) ?? false
}

function requestSelectionViewportPageFocus(editor: CommentNavigationEditor, from: number, to: number): boolean {
  const pageNumbers = resolveInlineCommentSelectionPageNumbers(editor, from, to)
  const primaryPageNumber = pageNumbers[0] ?? null
  if (primaryPageNumber === null) {
    return false
  }

  return editor.commands?.requestViewportPageFocus?.(primaryPageNumber) ?? false
}

export function scrollEditorSelectionNodeIntoView(
  editor: CommentNavigationEditor,
  from: number,
  to: number,
  block: ScrollLogicalPosition
) {
  requestAnimationFrame(() => {
    const runScroll = () => {
      const target = resolvePositionElement(editor.view, from)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block })
        return true
      }

      const bounds = resolveSelectionPositionBodyBounds(editor, from)
      if (bounds) {
        scrollViewportToPageBounds(editor.view, bounds, block)
        return true
      }

      return false
    }

    if (runScroll()) {
      return
    }

    const viewportSnapshot = captureViewportLayoutSnapshot(editor.view)
    const didShiftViewport = requestSelectionViewportPageFocus(editor, from, to)
    if (didShiftViewport) {
      retryAfterViewportFocusSettles(editor, viewportSnapshot, () => {
        if (runScroll()) {
          return
        }

        const didHydrate = hydrateInlineCommentSelectionPages(editor, from, to)
        if (didHydrate) {
          requestAnimationFrame(() => {
            runScroll()
          })
        }
      })
      return
    }

    const didHydrate = hydrateInlineCommentSelectionPages(editor, from, to)
    if (didHydrate) {
      requestAnimationFrame(() => {
        runScroll()
      })
      return
    }

    runScroll()
  })
}

function resolveSelectionAnchorPosition(editor: CommentNavigationEditor, from: number): SelectionAnchorPosition | null {
  const { view } = editor
  const target = resolvePositionElement(view, from)
  const publishedBounds = resolvePublishedPageBodyBounds(target)

  try {
    const coords = view.coordsAtPos(from)
    const hintedBounds = resolveLayoutHintPageBounds(editor.layoutHints, coords.top, coords.bottom)
    return {
      top: coords.top,
      left: hintedBounds?.left ?? publishedBounds?.left ?? target?.getBoundingClientRect().left ?? 0
    }
  } catch {
    if (!(target instanceof Element)) {
      return null
    }

    if (publishedBounds) {
      return {
        top: publishedBounds.top,
        left: publishedBounds.left
      }
    }

    const rect = target.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left
    }
  }
}

export function requestEditorSelectionAnchorPosition(
  editor: CommentNavigationEditor,
  from: number,
  to: number,
  onResolved: (position: SelectionAnchorPosition) => void
) {
  requestAnimationFrame(() => {
    const runResolve = () => {
      const position = resolveSelectionAnchorPosition(editor, from)
      if (position) {
        onResolved(position)
        return true
      }

      const hintedBounds = resolveSelectionPositionBodyBounds(editor, from)
      if (hintedBounds) {
        onResolved({
          top: hintedBounds.top,
          left: hintedBounds.left
        })
        return true
      }

      return false
    }

    if (runResolve()) {
      return
    }

    const viewportSnapshot = captureViewportLayoutSnapshot(editor.view)
    const didShiftViewport = requestSelectionViewportPageFocus(editor, from, to)
    if (didShiftViewport) {
      retryAfterViewportFocusSettles(editor, viewportSnapshot, () => {
        if (runResolve()) {
          return
        }

        const didHydrate = hydrateInlineCommentSelectionPages(editor, from, to)
        if (didHydrate) {
          requestAnimationFrame(() => {
            runResolve()
          })
        }
      })
      return
    }

    const didHydrate = hydrateInlineCommentSelectionPages(editor, from, to)
    if (didHydrate) {
      requestAnimationFrame(() => {
        runResolve()
      })
      return
    }

    runResolve()
  })
}

export function scrollInlineCommentRangeIntoView(
  editor: CommentNavigationEditor,
  from: number,
  to: number,
  commentId?: string
) {
  requestAnimationFrame(() => {
    const runScroll = () => {
      const view = editor.view
      const domFallback = () => {
        if (!commentId) return false
        const fallbackElement = globalThis.document.querySelector(`[data-comment-id="${commentId}"]`)
        if (!(fallbackElement instanceof HTMLElement)) {
          return false
        }

        fallbackElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return true
      }

      let top: number
      let bottom: number

      try {
        const startCoords = view.coordsAtPos(from)
        const endCoords = view.coordsAtPos(to > from ? to - 1 : from)
        top = Math.min(startCoords.top, endCoords.top)
        bottom = Math.max(startCoords.bottom, endCoords.bottom)
      } catch {
        const startBounds = resolveSelectionPositionBodyBounds(editor, from)
        const endBounds = resolveSelectionPositionBodyBounds(editor, to > from ? to - 1 : from)
        const fallbackTop = Math.min(
          startBounds?.top ?? Number.POSITIVE_INFINITY,
          endBounds?.top ?? Number.POSITIVE_INFINITY
        )
        const fallbackBottom = Math.max(
          startBounds?.bottom ?? Number.NEGATIVE_INFINITY,
          endBounds?.bottom ?? Number.NEGATIVE_INFINITY
        )

        if (!Number.isFinite(fallbackTop) || !Number.isFinite(fallbackBottom)) {
          return domFallback()
        }

        top = fallbackTop
        bottom = fallbackBottom
      }

      const viewport = view.dom.closest('.document-editor-viewport') as HTMLElement | null
      if (!viewport) {
        return domFallback()
      }

      const viewportRect = viewport.getBoundingClientRect()
      const padding = 24

      if (top < viewportRect.top + padding) {
        viewport.scrollTop -= viewportRect.top + padding - top
      } else if (bottom > viewportRect.bottom - padding) {
        viewport.scrollTop += bottom - (viewportRect.bottom - padding)
      }

      return true
    }

    if (runScroll()) {
      return
    }

    const viewportSnapshot = captureViewportLayoutSnapshot(editor.view)
    const didShiftViewport = requestSelectionViewportPageFocus(editor, from, to)
    if (didShiftViewport) {
      retryAfterViewportFocusSettles(editor, viewportSnapshot, () => {
        if (runScroll()) {
          return
        }

        const didHydrate = hydrateInlineCommentSelectionPages(editor, from, to)
        if (didHydrate) {
          requestAnimationFrame(() => {
            runScroll()
          })
        }
      })
      return
    }

    const didHydrate = hydrateInlineCommentSelectionPages(editor, from, to)
    if (didHydrate) {
      requestAnimationFrame(() => {
        runScroll()
      })
      return
    }

    runScroll()
  })
}
