import { createLegacyDomPaginationLayoutService } from '../documentLayoutService'
import { createIncrementalDocumentLayoutService } from '../incrementalDocumentLayoutService'

function createMeasurementRequest(
  generation: number,
  reason: 'initial-load' | 'viewport-resize' | 'legacy-dom-structure',
  scope: 'full-document' | 'viewport' | 'structure',
  pageRange: { startPage: number; endPage: number } | null = null
) {
  return {
    generation,
    reason,
    scope,
    pageRange
  } as const
}

function createPage(documentRef: Document, pageNumber: number): HTMLElement {
  const page = documentRef.createElement('div')
  page.setAttribute('data-page-number', String(pageNumber))

  const breaker = documentRef.createElement('div')
  breaker.className = 'breaker'
  page.appendChild(breaker)

  return page
}

function mountPaginationRoot(pageCount: number): HTMLDivElement {
  const container = document.createElement('div')
  const paginationRoot = document.createElement('div')
  paginationRoot.setAttribute('data-rm-pagination', '')

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    paginationRoot.appendChild(createPage(document, pageNumber))
  }

  container.appendChild(paginationRoot)
  return container
}

function runSharedLayoutServiceContract(label: string, createService: typeof createLegacyDomPaginationLayoutService) {
  describe(label, () => {
    it('reuses cached layout for viewport requests', () => {
      const service = createService()
      const container = mountPaginationRoot(3)

      const initialMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(1, 'initial-load', 'full-document')
      )

      const paginationRoot = container.querySelector('[data-rm-pagination]')
      expect(paginationRoot).not.toBeNull()

      paginationRoot?.replaceChildren(createPage(document, 1))

      const viewportMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(2, 'viewport-resize', 'viewport', { startPage: 2, endPage: 3 })
      )

      expect(initialMeasurement.layout.pageCount).toBe(3)
      expect(initialMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([1, 2, 3])
      expect(viewportMeasurement.layout.pageCount).toBe(3)
      expect(viewportMeasurement.navigationState.boundaryEls).toHaveLength(2)
      expect(viewportMeasurement.navigationState.activeRange).toEqual({ startPage: 2, endPage: 3 })
      expect(viewportMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([2, 3])
    })

    it('refreshes the cached layout for structure requests', () => {
      const service = createService()
      const container = mountPaginationRoot(3)

      service.measureLayout(container, createMeasurementRequest(1, 'initial-load', 'full-document'))

      const paginationRoot = container.querySelector('[data-rm-pagination]')
      expect(paginationRoot).not.toBeNull()

      paginationRoot?.replaceChildren(createPage(document, 1))

      service.measureLayout(container, createMeasurementRequest(2, 'viewport-resize', 'viewport'))

      const structureMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(3, 'legacy-dom-structure', 'structure')
      )

      expect(structureMeasurement.layout.pageCount).toBe(1)
      expect(structureMeasurement.navigationState.boundaryEls).toHaveLength(0)
      expect(structureMeasurement.navigationState.activeRange).toEqual({ startPage: 1, endPage: 1 })
      expect(structureMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([1])
    })

    it('rebuilds the viewport window when the requested page range changes', () => {
      const service = createService()
      const container = mountPaginationRoot(5)

      service.measureLayout(container, createMeasurementRequest(1, 'initial-load', 'full-document'))

      const firstViewportMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(2, 'viewport-resize', 'viewport', { startPage: 2, endPage: 3 })
      )
      const secondViewportMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(3, 'viewport-resize', 'viewport', { startPage: 4, endPage: 5 })
      )

      expect(firstViewportMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([2, 3])
      expect(secondViewportMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([4, 5])
      expect(secondViewportMeasurement.navigationState.activeRange).toEqual({ startPage: 4, endPage: 5 })
    })
  })
}

runSharedLayoutServiceContract('createLegacyDomPaginationLayoutService', createLegacyDomPaginationLayoutService)
runSharedLayoutServiceContract('createIncrementalDocumentLayoutService', createIncrementalDocumentLayoutService)
