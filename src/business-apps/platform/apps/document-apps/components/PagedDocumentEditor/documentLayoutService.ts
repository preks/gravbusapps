import type { Editor as TiptapEditor } from '@tiptap/react'
import type {
  DocumentLayoutInvalidationReason,
  DocumentLayoutMeasurementRequest,
  DocumentLayoutPageRange,
  DocumentLayoutPageSnapshot,
  DocumentLayoutSource
} from '../../types'

export interface DocumentLayoutNavigationState {
  boundaryEls: HTMLElement[]
  activeRange: DocumentLayoutPageRange | null
  pageBreakEls: HTMLElement[]
}

export interface DocumentLayoutMeasurement {
  pageCount: number
  pages: DocumentLayoutPageSnapshot[]
  activePages: DocumentLayoutPageSnapshot[]
  activeRange: DocumentLayoutPageRange | null
}

export interface ObserveDocumentLayoutParams {
  editor: TiptapEditor | null
  container: HTMLDivElement
  onInvalidated: (reason: DocumentLayoutInvalidationReason) => void
}

export interface DocumentLayoutService {
  readonly source: DocumentLayoutSource
  measureLayout: (
    container: HTMLDivElement,
    request: DocumentLayoutMeasurementRequest
  ) => {
    layout: DocumentLayoutMeasurement
    navigationState: DocumentLayoutNavigationState
  }
  resolveCurrentPage: (container: HTMLDivElement, navigationState: DocumentLayoutNavigationState) => number
  observeLayout: (params: ObserveDocumentLayoutParams) => () => void
}

export function createLinearPageList(pageCount: number): DocumentLayoutPageSnapshot[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1
  }))
}

export function createPageRange(startPage: number, endPage: number): DocumentLayoutPageRange {
  return {
    startPage: Math.max(1, Math.min(startPage, endPage)),
    endPage: Math.max(1, Math.max(startPage, endPage))
  }
}

export function resolveActiveRange(
  pageCount: number,
  request: DocumentLayoutMeasurementRequest
): DocumentLayoutPageRange {
  if (request.scope !== 'viewport' || !request.pageRange) {
    return createPageRange(1, pageCount)
  }

  return createPageRange(
    Math.min(request.pageRange.startPage, pageCount),
    Math.min(request.pageRange.endPage, pageCount)
  )
}

export function resolveActivePages(
  pages: DocumentLayoutPageSnapshot[],
  activeRange: DocumentLayoutPageRange
): DocumentLayoutPageSnapshot[] {
  return pages.filter(page => page.pageNumber >= activeRange.startPage && page.pageNumber <= activeRange.endPage)
}

export function resolvePageBreakElements(container: HTMLDivElement): HTMLElement[] {
  const paginationRoot = container.querySelector('[data-rm-pagination]')
  const pageEls = paginationRoot ? Array.from(paginationRoot.children) : []
  return pageEls.filter((el): el is HTMLElement => el instanceof HTMLElement)
}

export function buildLayoutMeasurement(
  pageBreakEls: HTMLElement[],
  request: DocumentLayoutMeasurementRequest
): {
  layout: DocumentLayoutMeasurement
  navigationState: DocumentLayoutNavigationState
} {
  const pageCount = pageBreakEls.length > 0 ? pageBreakEls.length : 1

  return {
    layout: {
      pageCount,
      pages: createLinearPageList(pageCount),
      activePages: [],
      activeRange: null
    },
    navigationState: {
      activeRange: resolveActiveRange(pageCount, request),
      pageBreakEls,
      boundaryEls: pageBreakEls
        .slice(0, -1)
        .map(el => el.querySelector('.breaker'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    }
  }
}

function measureLegacyDomPagination(
  container: HTMLDivElement,
  request: DocumentLayoutMeasurementRequest
): {
  layout: DocumentLayoutMeasurement
  navigationState: DocumentLayoutNavigationState
} {
  return buildLayoutMeasurement(resolvePageBreakElements(container), request)
}

export function resolveCurrentPageFromLayoutNavigation(
  container: HTMLDivElement,
  navigationState: DocumentLayoutNavigationState
): number {
  if (navigationState.boundaryEls.length === 0) return 1

  const containerRect = container.getBoundingClientRect()
  const viewportCenterY = containerRect.top + containerRect.height / 2

  let passedBoundaries = 0
  for (const boundaryEl of navigationState.boundaryEls) {
    const boundaryTop = boundaryEl.getBoundingClientRect().top
    if (viewportCenterY >= boundaryTop) {
      passedBoundaries += 1
    } else {
      break
    }
  }

  return Math.max(1, 1 + passedBoundaries)
}

export function createLegacyDomPaginationLayoutService(): DocumentLayoutService {
  let cachedMeasurement: {
    layout: DocumentLayoutMeasurement
    navigationState: DocumentLayoutNavigationState
  } | null = null
  let cachedViewportWindow: {
    activeRange: DocumentLayoutPageRange
    activePages: DocumentLayoutPageSnapshot[]
  } | null = null

  return {
    source: 'legacy-dom-pagination',
    measureLayout(container, request) {
      if (request.scope === 'viewport' && cachedMeasurement) {
        const activeRange = resolveActiveRange(cachedMeasurement.layout.pageCount, request)
        const activePages =
          cachedViewportWindow &&
          cachedViewportWindow.activeRange.startPage === activeRange.startPage &&
          cachedViewportWindow.activeRange.endPage === activeRange.endPage
            ? cachedViewportWindow.activePages
            : resolveActivePages(cachedMeasurement.layout.pages, activeRange)

        cachedViewportWindow = {
          activeRange,
          activePages
        }

        return {
          layout: {
            ...cachedMeasurement.layout,
            activeRange,
            activePages
          },
          navigationState: {
            ...cachedMeasurement.navigationState,
            activeRange
          }
        }
      }

      cachedMeasurement = measureLegacyDomPagination(container, request)
      cachedMeasurement.layout.activeRange = cachedMeasurement.navigationState.activeRange
      cachedMeasurement.layout.activePages = resolveActivePages(
        cachedMeasurement.layout.pages,
        cachedMeasurement.navigationState.activeRange
      )
      cachedViewportWindow = {
        activeRange: cachedMeasurement.navigationState.activeRange,
        activePages: cachedMeasurement.layout.activePages
      }
      return cachedMeasurement
    },
    resolveCurrentPage(container, navigationState) {
      return resolveCurrentPageFromLayoutNavigation(container, navigationState)
    },
    observeLayout({ editor, container, onInvalidated }) {
      const root: HTMLElement | null = (editor?.view?.dom ??
        container.querySelector('.ProseMirror')) as HTMLElement | null

      const onResize = () => {
        onInvalidated('viewport-resize')
      }

      globalThis.window.addEventListener('resize', onResize)

      if (!root) {
        return () => {
          globalThis.window.removeEventListener('resize', onResize)
        }
      }

      const observer = new MutationObserver(() => {
        onInvalidated('legacy-dom-structure')
      })

      observer.observe(root, {
        childList: true,
        subtree: false,
        attributes: false,
        characterData: false
      })

      return () => {
        observer.disconnect()
        globalThis.window.removeEventListener('resize', onResize)
      }
    }
  }
}
