import type { DocumentLayoutPageRange, DocumentLayoutPageSnapshot } from '../../types'
import type {
  DocumentLayoutMeasurement,
  DocumentLayoutNavigationState,
  DocumentLayoutService,
  ObserveDocumentLayoutParams
} from './documentLayoutService'
import {
  buildLayoutMeasurement,
  resolveActivePages,
  resolveActiveRange,
  resolveCurrentPageFromLayoutNavigation,
  resolvePageBreakElements
} from './documentLayoutService'

interface IncrementalPageRegistryState {
  container: HTMLDivElement | null
  version: number
  pageBreakEls: HTMLElement[]
}

function hasRegistryChanged(
  current: IncrementalPageRegistryState,
  container: HTMLDivElement,
  nextPageBreakEls: HTMLElement[]
) {
  if (current.container !== container) return true
  if (current.pageBreakEls.length !== nextPageBreakEls.length) return true
  return current.pageBreakEls.some((element, index) => element !== nextPageBreakEls[index])
}

export function createIncrementalDocumentLayoutService(): DocumentLayoutService {
  let registry: IncrementalPageRegistryState = {
    container: null,
    version: 0,
    pageBreakEls: []
  }
  let cachedMeasurement: {
    version: number
    layout: DocumentLayoutMeasurement
    navigationState: DocumentLayoutNavigationState
  } | null = null
  let cachedViewportWindow: {
    activeRange: DocumentLayoutPageRange
    activePages: DocumentLayoutPageSnapshot[]
  } | null = null

  const syncRegistry = (container: HTMLDivElement): IncrementalPageRegistryState => {
    const nextPageBreakEls = resolvePageBreakElements(container)
    const changed = hasRegistryChanged(registry, container, nextPageBreakEls)
    registry = {
      container,
      version: changed ? registry.version + 1 : registry.version,
      pageBreakEls: nextPageBreakEls
    }
    return registry
  }

  const rebuildMeasurement = (
    registryState: IncrementalPageRegistryState,
    request: Parameters<DocumentLayoutService['measureLayout']>[1]
  ) => {
    const measurement = buildLayoutMeasurement(registryState.pageBreakEls, request)
    measurement.layout.activeRange = measurement.navigationState.activeRange
    measurement.layout.activePages = resolveActivePages(
      measurement.layout.pages,
      measurement.navigationState.activeRange
    )
    cachedMeasurement = {
      version: registryState.version,
      ...measurement
    }
    cachedViewportWindow = {
      activeRange: measurement.navigationState.activeRange,
      activePages: measurement.layout.activePages
    }
    return measurement
  }

  return {
    source: 'incremental-layout-engine',
    measureLayout(container, request) {
      const registryState =
        request.scope === 'viewport' && registry.container === container && registry.version > 0
          ? registry
          : syncRegistry(container)

      if (request.scope === 'viewport' && cachedMeasurement && cachedMeasurement.version === registryState.version) {
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

      return rebuildMeasurement(registryState, request)
    },
    resolveCurrentPage(container, navigationState) {
      return resolveCurrentPageFromLayoutNavigation(container, navigationState)
    },
    observeLayout({ editor, container, onInvalidated }: ObserveDocumentLayoutParams) {
      const root: HTMLElement | null = (editor?.view?.dom ??
        container.querySelector('.ProseMirror')) as HTMLElement | null
      let observedPaginationRoot: HTMLElement | null = null
      let paginationObserver: MutationObserver | null = null

      const onResize = () => {
        onInvalidated('viewport-resize')
      }

      const bindPaginationObserver = () => {
        const nextPaginationRoot = container.querySelector('[data-rm-pagination]') as HTMLElement | null
        if (observedPaginationRoot === nextPaginationRoot) return

        paginationObserver?.disconnect()
        paginationObserver = null
        observedPaginationRoot = nextPaginationRoot

        if (!nextPaginationRoot) return

        paginationObserver = new MutationObserver(() => {
          syncRegistry(container)
          onInvalidated('legacy-dom-structure')
        })

        paginationObserver.observe(nextPaginationRoot, {
          childList: true,
          subtree: false,
          attributes: false,
          characterData: false
        })
      }

      globalThis.window.addEventListener('resize', onResize)
      syncRegistry(container)
      bindPaginationObserver()

      if (!root) {
        return () => {
          paginationObserver?.disconnect()
          globalThis.window.removeEventListener('resize', onResize)
        }
      }

      const rootObserver = new MutationObserver(() => {
        syncRegistry(container)
        bindPaginationObserver()
        onInvalidated('legacy-dom-structure')
      })

      rootObserver.observe(root, {
        childList: true,
        subtree: false,
        attributes: false,
        characterData: false
      })

      return () => {
        paginationObserver?.disconnect()
        rootObserver.disconnect()
        globalThis.window.removeEventListener('resize', onResize)
      }
    }
  }
}
