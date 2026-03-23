import type { PagesOptions } from '../types'
import { applyMeasuredPageHeightsToView, documentHasTables, getPageBodyBands } from '../paginationLayoutHelpers'
import { createStorageFromOptions, getPageLayoutHeights, getPageSpacerHeight } from '../utils'
import * as paginationUtils from '../utils'

const baseOptions: PagesOptions = {
  pageFormat: 'A4',
  headerHeight: 50,
  footerHeight: 40,
  pageGap: 32,
  header: '',
  footer: '',
  differentFirstPage: false,
  differentOddEven: false
}

function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left ?? 0,
      y: rect.top,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left ?? 0,
      right: rect.right ?? 100,
      width: (rect.right ?? 100) - (rect.left ?? 0),
      height: rect.bottom - rect.top,
      toJSON: () => ''
    })
  })
}

function appendPageBreak(editorDom: HTMLElement, pageNumber: number) {
  const paginationRoot =
    (editorDom.querySelector('[data-rm-pagination]') as HTMLElement | null) ?? document.createElement('div')
  if (!paginationRoot.hasAttribute('data-rm-pagination')) {
    paginationRoot.dataset.rmPagination = 'true'
    editorDom.appendChild(paginationRoot)
  }

  const pageBreak = document.createElement('div')
  pageBreak.className = 'rm-page-break'
  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)
  pageBreak.appendChild(page)
  paginationRoot.appendChild(pageBreak)
}

describe('applyMeasuredPageHeightsToView', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('writes per-page body and spacer CSS variables from measured chrome heights', () => {
    const editorDom = document.createElement('div')
    document.body.appendChild(editorDom)
    appendPageBreak(editorDom, 1)
    appendPageBreak(editorDom, 2)
    const storage = createStorageFromOptions(baseOptions)
    storage.pageCount = 2

    jest.spyOn(paginationUtils, 'getExistingPageCount').mockReturnValue(2)
    jest.spyOn(paginationUtils, 'measureHeaderFooterContentHeights').mockReturnValue({
      headerHeights: new Map([
        [1, 60],
        [2, 70],
        [3, 80]
      ]),
      footerHeights: new Map([
        [1, 20],
        [2, 30],
        [3, 40]
      ])
    })

    const measured = applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    const pageOneLayout = getPageLayoutHeights(storage.pageFormat, storage, 60, 20)
    const pageTwoLayout = getPageLayoutHeights(storage.pageFormat, storage, 70, 30)
    const generalPageNumber = 3

    expect(measured.headerHeights.get(2)).toBe(70)
    expect(editorDom.style.getPropertyValue('--rm-page-body-1')).toBe(`${pageOneLayout.bodyHeight}px`)
    expect(editorDom.style.getPropertyValue('--rm-page-body-2')).toBe(`${pageTwoLayout.bodyHeight}px`)
    expect(editorDom.style.getPropertyValue('--rm-page-content-1')).toBe(
      `${getPageSpacerHeight(storage.pageFormat, storage, 1, 60, 20)}px`
    )
    expect(editorDom.style.getPropertyValue('--rm-page-content-2')).toBe(
      `${getPageSpacerHeight(storage.pageFormat, storage, 2, 70, 30)}px`
    )
    expect(editorDom.style.getPropertyValue('--rm-page-content-general')).toBe(
      `${getPageSpacerHeight(storage.pageFormat, storage, generalPageNumber, 80, 40)}px`
    )
    expect(editorDom.style.getPropertyValue('--rm-max-content-child-height')).toBe(
      `${Math.max(1, Math.min(pageOneLayout.bodyHeight, pageTwoLayout.bodyHeight) - 10)}px`
    )
  })

  it('limits windowed measurements to the active range plus the first page', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    document.body.appendChild(viewport)
    viewport.appendChild(editorDom)
    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '3'
    viewport.dataset.layoutWindowEnd = '4'

    const storage = createStorageFromOptions(baseOptions)
    storage.pageCount = 5

    jest.spyOn(paginationUtils, 'getExistingPageCount').mockReturnValue(5)
    const resolveMountedPageNumbersSpy = jest.spyOn(paginationUtils, 'resolveMountedPaginationPageNumbers')
    const measureSpy = jest.spyOn(paginationUtils, 'measureHeaderFooterContentHeights').mockReturnValue({
      headerHeights: new Map([
        [1, 55],
        [3, 65],
        [4, 75]
      ]),
      footerHeights: new Map([
        [1, 15],
        [3, 25],
        [4, 35]
      ])
    })

    applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    expect(measureSpy).toHaveBeenCalledWith(editorDom, 5, storage.pageFormat, storage, [1, 3, 4])
    expect(measureSpy.mock.calls[0]?.[4]).toEqual([1, 3, 4])
    expect(resolveMountedPageNumbersSpy).not.toHaveBeenCalled()
    expect(editorDom.style.getPropertyValue('--rm-page-body-3')).not.toBe('')
    expect(editorDom.style.getPropertyValue('--rm-page-body-2')).toBe('')
  })

  it('prefers sparse mounted-range metadata when measuring mounted window shells with spacers', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationChrome = document.createElement('div')
    const spacer = document.createElement('div')
    document.body.appendChild(viewport)
    viewport.appendChild(editorDom)
    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '3'
    viewport.dataset.layoutWindowEnd = '4'

    appendPageBreak(editorDom, 2)
    appendPageBreak(editorDom, 3)
    appendPageBreak(editorDom, 4)
    const paginationRoot = editorDom.querySelector('[data-rm-pagination]') as HTMLElement
    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')
    paginationChrome.dataset.rmPaginationChrome = 'true'
    editorDom.removeChild(paginationRoot)
    paginationChrome.appendChild(paginationRoot)
    editorDom.appendChild(paginationChrome)
    querySelectorSpy.mockClear()
    paginationRoot.dataset.rmTotalPages = '5'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '4'
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '5'
    spacer.dataset.rmPageRangeEnd = '5'
    paginationRoot.appendChild(spacer)

    const storage = createStorageFromOptions(baseOptions)
    storage.pageCount = 5

    jest.spyOn(paginationUtils, 'getExistingPageCount').mockReturnValue(5)
    const measureSpy = jest.spyOn(paginationUtils, 'measureHeaderFooterContentHeights').mockReturnValue({
      headerHeights: new Map([
        [1, 55],
        [2, 60],
        [3, 65],
        [4, 70],
        [5, 75]
      ]),
      footerHeights: new Map([
        [1, 15],
        [2, 20],
        [3, 25],
        [4, 30],
        [5, 35]
      ])
    })

    applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    expect(measureSpy).toHaveBeenCalledWith(editorDom, 5, storage.pageFormat, storage, [1, 2, 3, 4, 5])
    expect(measureSpy.mock.calls[0]?.[4]).toEqual([1, 2, 3, 4, 5])
    expect(editorDom.style.getPropertyValue('--rm-page-body-2')).not.toBe('')
    expect(editorDom.style.getPropertyValue('--rm-page-body-5')).not.toBe('')
    expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-rm-pagination]')
  })

  it('uses viewport mounted-range metadata when sparse shell DOM is still catching up', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    document.body.appendChild(viewport)
    viewport.appendChild(editorDom)
    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '3'
    viewport.dataset.layoutWindowEnd = '4'
    viewport.dataset.layoutMountedStart = '2'
    viewport.dataset.layoutMountedEnd = '4'

    appendPageBreak(editorDom, 2)
    appendPageBreak(editorDom, 3)
    const paginationRoot = editorDom.querySelector('[data-rm-pagination]') as HTMLElement
    paginationRoot.dataset.rmTotalPages = '5'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '4'

    const storage = createStorageFromOptions(baseOptions)
    storage.pageCount = 5

    jest.spyOn(paginationUtils, 'getExistingPageCount').mockReturnValue(5)
    const measureSpy = jest.spyOn(paginationUtils, 'measureHeaderFooterContentHeights').mockReturnValue({
      headerHeights: new Map([
        [1, 55],
        [2, 60],
        [3, 65],
        [4, 70],
        [5, 75]
      ]),
      footerHeights: new Map([
        [1, 15],
        [2, 20],
        [3, 25],
        [4, 30],
        [5, 35]
      ])
    })

    applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    expect(measureSpy.mock.calls[0]?.[4]).toEqual([1, 2, 3, 4, 5])
    expect(editorDom.style.getPropertyValue('--rm-page-body-2')).not.toBe('')
    expect(editorDom.style.getPropertyValue('--rm-page-body-5')).not.toBe('')
  })

  it('reuses cached off-window heights across successive windowed passes', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    document.body.appendChild(viewport)
    viewport.appendChild(editorDom)
    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'

    const storage = createStorageFromOptions(baseOptions)
    storage.pageCount = 5

    jest.spyOn(paginationUtils, 'getExistingPageCount').mockReturnValue(5)
    const measureSpy = jest.spyOn(paginationUtils, 'measureHeaderFooterContentHeights')

    viewport.dataset.layoutWindowStart = '2'
    viewport.dataset.layoutWindowEnd = '3'
    measureSpy.mockReturnValueOnce({
      headerHeights: new Map([
        [1, 50],
        [2, 60],
        [3, 70]
      ]),
      footerHeights: new Map([
        [1, 20],
        [2, 30],
        [3, 40]
      ])
    })

    const firstMeasured = applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    viewport.dataset.layoutWindowStart = '4'
    viewport.dataset.layoutWindowEnd = '5'
    measureSpy.mockReturnValueOnce({
      headerHeights: new Map([
        [1, 50],
        [4, 80],
        [5, 90]
      ]),
      footerHeights: new Map([
        [1, 20],
        [4, 45],
        [5, 55]
      ])
    })

    const secondMeasured = applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    expect(firstMeasured.headerHeights.get(2)).toBe(60)
    expect(secondMeasured.headerHeights.get(2)).toBe(60)
    expect(secondMeasured.headerHeights.get(5)).toBe(90)
  })

  it('does not rewrite unchanged CSS variables on repeated measurement passes', () => {
    const editorDom = document.createElement('div')
    document.body.appendChild(editorDom)
    appendPageBreak(editorDom, 1)
    appendPageBreak(editorDom, 2)

    const storage = createStorageFromOptions(baseOptions)
    storage.pageCount = 2

    jest.spyOn(paginationUtils, 'getExistingPageCount').mockReturnValue(2)
    jest.spyOn(paginationUtils, 'measureHeaderFooterContentHeights').mockReturnValue({
      headerHeights: new Map([
        [1, 60],
        [2, 70],
        [3, 80]
      ]),
      footerHeights: new Map([
        [1, 20],
        [2, 30],
        [3, 40]
      ])
    })

    const setPropertySpy = jest.spyOn(editorDom.style, 'setProperty')

    applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    setPropertySpy.mockClear()

    applyMeasuredPageHeightsToView(
      {
        dom: editorDom
      } as never,
      storage,
      baseOptions
    )

    expect(setPropertySpy).not.toHaveBeenCalled()
  })
})

describe('getPageBodyBands', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('collects and sorts visible body bands by page number', () => {
    const editorDom = document.createElement('div')
    const pageTwo = document.createElement('div')
    const pageOne = document.createElement('div')
    const invalid = document.createElement('div')

    pageTwo.className = 'rm-page-body-layer'
    pageTwo.dataset.rmPageNumber = '2'
    pageOne.className = 'rm-page-body-layer'
    pageOne.dataset.rmPageNumber = '1'
    invalid.className = 'rm-page-body-layer'
    invalid.dataset.rmPageNumber = '0'

    setRect(pageTwo, { top: 300, bottom: 520, left: 40, right: 180 })
    setRect(pageOne, { top: 80, bottom: 260, left: 20, right: 160 })
    setRect(invalid, { top: 0, bottom: 0, left: 0, right: 0 })

    editorDom.append(pageTwo, pageOne, invalid)

    expect(getPageBodyBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 20,
        right: 160,
        top: 80,
        bottom: 260
      },
      {
        pageNumber: 2,
        left: 40,
        right: 180,
        top: 300,
        bottom: 520
      }
    ])
  })

  it('uses ordered page-break children when collecting visible body bands', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '2'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '2'

    for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const page = document.createElement('div')
      const bodyLayer = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      page.className = 'page'
      page.dataset.rmPageNumber = String(pageNumber)
      bodyLayer.className = 'rm-page-body-layer'
      bodyLayer.dataset.rmPageNumber = String(pageNumber)

      page.appendChild(bodyLayer)
      pageBreak.appendChild(page)
      paginationRoot.appendChild(pageBreak)
    }

    const firstBodyLayer = paginationRoot.children[0]?.querySelector('.rm-page-body-layer') as HTMLElement
    const secondBodyLayer = paginationRoot.children[1]?.querySelector('.rm-page-body-layer') as HTMLElement

    setRect(firstBodyLayer, { top: 80, bottom: 260, left: 20, right: 160 })
    setRect(secondBodyLayer, { top: 300, bottom: 520, left: 40, right: 180 })

    editorDom.appendChild(paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    expect(getPageBodyBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 20,
        right: 160,
        top: 80,
        bottom: 260
      },
      {
        pageNumber: 2,
        left: 40,
        right: 180,
        top: 300,
        bottom: 520
      }
    ])
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('.rm-page-body-layer[data-rm-page-number]')
  })
})

describe('documentHasTables', () => {
  it('detects when the document tree contains a table node', () => {
    const doc = {
      descendants: (visit: (node: { type: { name: string } }) => boolean | void) => {
        if (visit({ type: { name: 'paragraph' } }) === false) return
        visit({ type: { name: 'table' } })
      }
    } as never

    expect(documentHasTables(doc)).toBe(true)
  })

  it('memoizes table detection for the same document instance', () => {
    const descendants = jest.fn((visit: (node: { type: { name: string } }) => boolean | void) => {
      if (visit({ type: { name: 'paragraph' } }) === false) return
      visit({ type: { name: 'table' } })
    })

    const doc = {
      descendants
    } as never

    expect(documentHasTables(doc)).toBe(true)
    expect(documentHasTables(doc)).toBe(true)
    expect(descendants).toHaveBeenCalledTimes(1)
  })

  it('returns false when no table node is present', () => {
    const doc = {
      descendants: (visit: (node: { type: { name: string } }) => boolean | void) => {
        visit({ type: { name: 'paragraph' } })
        visit({ type: { name: 'blockquote' } })
      }
    } as never

    expect(documentHasTables(doc)).toBe(false)
  })
})
