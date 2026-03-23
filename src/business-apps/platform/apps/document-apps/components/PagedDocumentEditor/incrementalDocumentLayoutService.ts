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
  resolveMountedPageBodyBounds,
  resolveObservableLayoutRoot,
  resolvePageBreakElementsFromPaginationRoot,
  resolvePaginationFlowElementsFromPaginationRoot,
  resolvePaginationRootElement,
  resolvePaginationTotalPagesFromPaginationRoot
} from './documentLayoutService'

interface IncrementalPageRegistryState {
  container: HTMLDivElement | null
  version: number
  pageBreakEls: HTMLElement[]
  flowEls: HTMLElement[]
  totalPageCount: number
}

interface SyncedIncrementalRegistryResult {
  changed: boolean
  invalidationReason: 'viewport-resize' | 'legacy-dom-structure'
  state: IncrementalPageRegistryState
}

function hasRegistryChanged(
  current: IncrementalPageRegistryState,
  container: HTMLDivElement,
  nextPageBreakEls: HTMLElement[],
  nextFlowEls: HTMLElement[],
  nextTotalPageCount: number
) {
  if (current.container !== container) return true
  if (current.totalPageCount !== nextTotalPageCount) return true
  if (current.pageBreakEls.length !== nextPageBreakEls.length) return true
  if (current.flowEls.length !== nextFlowEls.length) return true
  return (
    current.pageBreakEls.some((element, index) => element !== nextPageBreakEls[index]) ||
    current.flowEls.some((element, index) => element !== nextFlowEls[index])
  )
}

function resolveRegistryInvalidationReason(options: {
  current: IncrementalPageRegistryState
  container: HTMLDivElement
  nextTotalPageCount: number
}): 'viewport-resize' | 'legacy-dom-structure' {
  if (options.current.container !== options.container) {
    return 'legacy-dom-structure'
  }

  return options.current.totalPageCount === options.nextTotalPageCount ? 'viewport-resize' : 'legacy-dom-structure'
}

export function createIncrementalDocumentLayoutService(): DocumentLayoutService {
  let registry: IncrementalPageRegistryState = {
    container: null,
    version: 0,
    pageBreakEls: [],
    flowEls: [],
    totalPageCount: 1
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

  const syncRegistry = (container: HTMLDivElement): SyncedIncrementalRegistryResult => {
    const paginationRoot = resolvePaginationRootElement(container)
    const nextPageBreakEls = resolvePageBreakElementsFromPaginationRoot(paginationRoot)
    const nextFlowEls = resolvePaginationFlowElementsFromPaginationRoot(paginationRoot)
    const nextTotalPageCount = resolvePaginationTotalPagesFromPaginationRoot(paginationRoot, nextPageBreakEls)
    const changed = hasRegistryChanged(registry, container, nextPageBreakEls, nextFlowEls, nextTotalPageCount)
    const invalidationReason = resolveRegistryInvalidationReason({
      current: registry,
      container,
      nextTotalPageCount
    })
    registry = {
      container,
      version: changed ? registry.version + 1 : registry.version,
      pageBreakEls: nextPageBreakEls,
      flowEls: nextFlowEls,
      totalPageCount: nextTotalPageCount
    }
    return {
      changed,
      invalidationReason,
      state: registry
    }
  }

  const rebuildMeasurement = (
    registryState: IncrementalPageRegistryState,
    request: Parameters<DocumentLayoutService['measureLayout']>[1]
  ) => {
    const measurement = buildLayoutMeasurement(registryState.pageBreakEls, registryState.flowEls, request)
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
          : syncRegistry(container).state

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
        const mountedPageBodyBounds = resolveMountedPageBodyBounds(cachedMeasurement.navigationState.pageBreakEls)

        return {
          layout: {
            ...cachedMeasurement.layout,
            mountedPageBodyBounds,
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
      const root = resolveObservableLayoutRoot(editor, container)
      let observedPaginationRoot: HTMLElement | null = null
      let paginationObserver: MutationObserver | null = null

      const onResize = () => {
        onInvalidated('viewport-resize')
      }

      const bindPaginationObserver = () => {
        const nextPaginationRoot = resolvePaginationRootElement(container)
        if (observedPaginationRoot === nextPaginationRoot) return

        paginationObserver?.disconnect()
        paginationObserver = null
        observedPaginationRoot = nextPaginationRoot

        if (!nextPaginationRoot) return

        paginationObserver = new MutationObserver(() => {
          const registryResult = syncRegistry(container)
          if (registryResult.changed) {
            onInvalidated(registryResult.invalidationReason)
          }
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
        const registryResult = syncRegistry(container)
        bindPaginationObserver()
        if (registryResult.changed) {
          onInvalidated(registryResult.invalidationReason)
        }
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
