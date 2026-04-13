import {
  calculatePageCount,
  getDocumentContentBottom,
  getExistingPageCount,
  getPageBodyMeasurementBands,
  PAGE_COUNT_ADD_HYSTERESIS_PX,
  PAGE_COUNT_REMOVE_HYSTERESIS_PX,
  resolveMountedPaginationPageNumbers,
  getSelectionBottom,
  measureHeaderFooterContentHeights,
  resolvePageCountFromLastPageGap
} from '../utils'
import { NodeSelection } from '@tiptap/pm/state'

describe('resolvePageCountFromLastPageGap', () => {
  it('keeps the existing page count within the add-page hysteresis band', () => {
    expect(
      resolvePageCountFromLastPageGap({
        currentPageCount: 2,
        lastPageGap: PAGE_COUNT_ADD_HYSTERESIS_PX,
        pageContentHeight: 800,
        pageFormatHeight: 1000,
        pageGap: 50
      })
    ).toEqual({
      reason: 'keep-existing',
      resultPageCount: 2,
      lowerBound: -(1000 - PAGE_COUNT_REMOVE_HYSTERESIS_PX)
    })
  })

  it('adds a page once the overflow exceeds the add-page hysteresis band', () => {
    expect(
      resolvePageCountFromLastPageGap({
        currentPageCount: 2,
        lastPageGap: PAGE_COUNT_ADD_HYSTERESIS_PX + 12,
        pageContentHeight: 800,
        pageFormatHeight: 1000,
        pageGap: 50
      })
    ).toEqual({
      reason: 'add-pages',
      resultPageCount: 3,
      lowerBound: -(1000 - PAGE_COUNT_REMOVE_HYSTERESIS_PX)
    })
  })

  it('keeps the existing page count until almost a full page becomes empty', () => {
    expect(
      resolvePageCountFromLastPageGap({
        currentPageCount: 2,
        lastPageGap: -(1000 - PAGE_COUNT_REMOVE_HYSTERESIS_PX) + 1,
        pageContentHeight: 800,
        pageFormatHeight: 1000,
        pageGap: 50
      })
    ).toEqual({
      reason: 'keep-existing',
      resultPageCount: 2,
      lowerBound: -(1000 - PAGE_COUNT_REMOVE_HYSTERESIS_PX)
    })
  })

  it('removes a page once the empty trailing space crosses the removal threshold', () => {
    expect(
      resolvePageCountFromLastPageGap({
        currentPageCount: 2,
        lastPageGap: -(1000 - PAGE_COUNT_REMOVE_HYSTERESIS_PX) - 1,
        pageContentHeight: 800,
        pageFormatHeight: 1000,
        pageGap: 50
      })
    ).toEqual({
      reason: 'remove-pages',
      resultPageCount: 1,
      lowerBound: -(1000 - PAGE_COUNT_REMOVE_HYSTERESIS_PX)
    })
  })
})

describe('getExistingPageCount', () => {
  it('uses pagination metadata when the full document shell range is mounted', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const spacer = document.createElement('div')
    const view = { dom: editorDom } as never

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '500'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '500'
    pageBreak.className = 'rm-page-break'
    spacer.className = 'rm-page-spacer'
    paginationRoot.append(pageBreak, spacer)
    editorDom.appendChild(paginationRoot)

    expect(getExistingPageCount(view)).toBe(500)
  })

  it('uses the chrome-wrapped pagination root without a broad lookup', () => {
    const editorDom = document.createElement('div')
    const paginationChrome = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const view = { dom: editorDom } as never
    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')

    paginationChrome.dataset.rmPaginationChrome = 'true'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '2'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '2'
    pageBreak.className = 'rm-page-break'
    paginationRoot.appendChild(pageBreak)
    paginationChrome.appendChild(paginationRoot)
    editorDom.appendChild(paginationChrome)

    expect(getExistingPageCount(view)).toBe(2)
    expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-rm-pagination]')
  })

  it('counts only mounted page shells even when sparse pagination stores total page metadata', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageBreak = document.createElement('div')
    const secondPageBreak = document.createElement('div')
    const spacer = document.createElement('div')
    const view = { dom: editorDom } as never

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '500'
    paginationRoot.dataset.rmMountedStartPage = '197'
    paginationRoot.dataset.rmMountedEndPage = '203'
    firstPageBreak.className = 'rm-page-break'
    secondPageBreak.className = 'rm-page-break'
    spacer.className = 'rm-page-spacer'
    paginationRoot.append(firstPageBreak, secondPageBreak, spacer)
    editorDom.appendChild(paginationRoot)

    expect(getExistingPageCount(view)).toBe(2)
  })
})

describe('resolveMountedPaginationPageNumbers', () => {
  it('uses mounted range metadata from the pagination root when available', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageHeader = document.createElement('div')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '8'
    paginationRoot.dataset.rmMountedStartPage = '3'
    paginationRoot.dataset.rmMountedEndPage = '5'
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'
    firstPageHeader.dataset.rmEditorType = 'header'

    editorDom.append(paginationRoot, firstPageHeader)

    expect(resolveMountedPaginationPageNumbers(editorDom)).toEqual([1, 3, 4, 5, 6])
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith(
      '[data-rm-pagination] > .rm-page-break .page[data-rm-page-number]'
    )
  })

  it('uses chrome-wrapped pagination and first-page header without broad lookups', () => {
    const editorDom = document.createElement('div')
    const paginationChrome = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageHeader = document.createElement('div')
    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    paginationChrome.dataset.rmPaginationChrome = 'true'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '8'
    paginationRoot.dataset.rmMountedStartPage = '3'
    paginationRoot.dataset.rmMountedEndPage = '5'
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'
    firstPageHeader.dataset.rmEditorType = 'header'

    paginationChrome.append(paginationRoot, firstPageHeader)
    editorDom.appendChild(paginationChrome)

    expect(resolveMountedPaginationPageNumbers(editorDom)).toEqual([1, 3, 4, 5, 6])
    expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-rm-pagination]')
    expect(querySelectorSpy).not.toHaveBeenCalledWith('.rm-first-page-header[data-rm-page-number]')
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith(
      '[data-rm-pagination] > .rm-page-break .page[data-rm-page-number]'
    )
  })

  it('prefers viewport mounted-range metadata when pagination root metadata lags', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageHeader = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutMountedStart = '3'
    viewport.dataset.layoutMountedEnd = '5'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '8'
    paginationRoot.dataset.rmMountedStartPage = '3'
    paginationRoot.dataset.rmMountedEndPage = '3'
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'
    firstPageHeader.dataset.rmEditorType = 'header'

    viewport.appendChild(editorDom)
    editorDom.append(paginationRoot, firstPageHeader)

    expect(resolveMountedPaginationPageNumbers(editorDom)).toEqual([1, 3, 4, 5, 6])
  })

  it('falls back to mounted page-break DOM scanning when range metadata is missing', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageBreak = document.createElement('div')
    const secondPageBreak = document.createElement('div')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')
    const firstPageBreakQuerySelectorSpy = jest.spyOn(firstPageBreak, 'querySelector')
    const secondPageBreakQuerySelectorSpy = jest.spyOn(secondPageBreak, 'querySelector')

    paginationRoot.dataset.rmPagination = 'true'
    firstPageBreak.className = 'rm-page-break'
    firstPageBreak.dataset.rmPageNumber = '2'
    secondPageBreak.className = 'rm-page-break'
    secondPageBreak.dataset.rmPageNumber = '3'
    paginationRoot.append(firstPageBreak, secondPageBreak)
    editorDom.appendChild(paginationRoot)

    expect(resolveMountedPaginationPageNumbers(editorDom)).toEqual([2, 3, 4])
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith(
      '[data-rm-pagination] > .rm-page-break .page[data-rm-page-number]'
    )
    expect(firstPageBreakQuerySelectorSpy).not.toHaveBeenCalledWith('.page[data-rm-page-number]')
    expect(secondPageBreakQuerySelectorSpy).not.toHaveBeenCalledWith('.page[data-rm-page-number]')
  })
})

describe('getPageBodyMeasurementBands', () => {
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

  it('collects and sorts visible body measurement bands by page number', () => {
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

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 25 })
    setRect(editorDom, { top: 10, bottom: 500 })
    setRect(pageTwo, { top: 210, bottom: 340 })
    setRect(pageOne, { top: 40, bottom: 180 })
    setRect(invalid, { top: 0, bottom: 0 })

    editorDom.append(pageTwo, pageOne, invalid)

    expect(getPageBodyMeasurementBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 0,
        right: 100,
        top: 55,
        bottom: 195,
        pageLeft: 0,
        pageRight: 100
      },
      {
        pageNumber: 2,
        left: 0,
        right: 100,
        top: 225,
        bottom: 355,
        pageLeft: 0,
        pageRight: 100
      }
    ])
  })

  it('uses ordered page-break children when collecting body measurement bands', () => {
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

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 25 })
    setRect(editorDom, { top: 10, bottom: 500 })
    setRect(firstBodyLayer, { top: 40, bottom: 180 })
    setRect(secondBodyLayer, { top: 210, bottom: 340 })

    editorDom.appendChild(paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    expect(getPageBodyMeasurementBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 0,
        right: 100,
        top: 55,
        bottom: 195,
        pageLeft: 0,
        pageRight: 100
      },
      {
        pageNumber: 2,
        left: 0,
        right: 100,
        top: 225,
        bottom: 355,
        pageLeft: 0,
        pageRight: 100
      }
    ])
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('.rm-page-body-layer[data-rm-page-number]')
  })

  it('uses viewport mounted-range metadata when ordered body shells are still catching up', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutMountedStart = '2'
    viewport.dataset.layoutMountedEnd = '3'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '4'

    for (let pageNumber = 2; pageNumber <= 3; pageNumber += 1) {
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

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 25 })
    setRect(editorDom, { top: 10, bottom: 500 })
    setRect(firstBodyLayer, { top: 40, bottom: 180 })
    setRect(secondBodyLayer, { top: 210, bottom: 340 })

    viewport.appendChild(editorDom)
    editorDom.appendChild(paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    expect(getPageBodyMeasurementBands(editorDom)).toEqual([
      {
        pageNumber: 2,
        left: 0,
        right: 100,
        top: 55,
        bottom: 195,
        pageLeft: 0,
        pageRight: 100
      },
      {
        pageNumber: 3,
        left: 0,
        right: 100,
        top: 225,
        bottom: 355,
        pageLeft: 0,
        pageRight: 100
      }
    ])
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('.rm-page-body-layer[data-rm-page-number]')
  })

  it('uses page-break children for body measurement bands without range metadata', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'

    for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const bodyLayer = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      pageBreak.dataset.rmPageNumber = String(pageNumber)
      bodyLayer.className = 'rm-page-body-layer'
      bodyLayer.dataset.rmPageNumber = String(pageNumber)

      pageBreak.appendChild(bodyLayer)
      paginationRoot.appendChild(pageBreak)
    }

    const firstBodyLayer = paginationRoot.children[0]?.querySelector('.rm-page-body-layer') as HTMLElement
    const secondBodyLayer = paginationRoot.children[1]?.querySelector('.rm-page-body-layer') as HTMLElement

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 25 })
    setRect(editorDom, { top: 10, bottom: 500 })
    setRect(firstBodyLayer, { top: 40, bottom: 180 })
    setRect(secondBodyLayer, { top: 210, bottom: 340 })

    editorDom.appendChild(paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    expect(getPageBodyMeasurementBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 0,
        right: 100,
        top: 55,
        bottom: 195,
        pageLeft: 0,
        pageRight: 100
      },
      {
        pageNumber: 2,
        left: 0,
        right: 100,
        top: 225,
        bottom: 355,
        pageLeft: 0,
        pageRight: 100
      }
    ])
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('.rm-page-body-layer[data-rm-page-number]')
  })

  it('splits editor-space measurement bands around floating image exclusions', () => {
    const editorDom = document.createElement('div')
    const pageBody = document.createElement('div')
    const imageAnchor = document.createElement('div')

    pageBody.className = 'rm-page-body-layer'
    pageBody.dataset.rmPageNumber = '1'
    imageAnchor.dataset.imageExclusionMode = 'square'
    imageAnchor.dataset.imageWrapTextSide = 'left'

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 15 })
    Object.defineProperty(editorDom, 'scrollLeft', { configurable: true, value: 0 })
    setRect(editorDom, { top: 10, bottom: 500, left: 0, right: 300 })
    setRect(pageBody, { top: 40, bottom: 240, left: 20, right: 220 })
    setRect(imageAnchor, { top: 90, bottom: 150, left: 120, right: 220 })

    editorDom.append(pageBody, imageAnchor)

    expect(getPageBodyMeasurementBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 20,
        right: 220,
        top: 45,
        bottom: 95,
        pageLeft: 20,
        pageRight: 220
      },
      {
        pageNumber: 1,
        left: 20,
        right: 120,
        top: 95,
        bottom: 155,
        pageLeft: 20,
        pageRight: 220
      },
      {
        pageNumber: 1,
        left: 20,
        right: 220,
        top: 155,
        bottom: 245,
        pageLeft: 20,
        pageRight: 220
      }
    ])
  })

  it('preserves through-wrap interior openings from contour slices', () => {
    const editorDom = document.createElement('div')
    const pageBody = document.createElement('div')
    const imageAnchor = document.createElement('div')

    pageBody.className = 'rm-page-body-layer'
    pageBody.dataset.rmPageNumber = '1'
    imageAnchor.dataset.imageExclusionMode = 'polygon'
    imageAnchor.dataset.imageWrapTextSide = 'bothSides'
    imageAnchor.dataset.imageWrapMode = 'through'
    imageAnchor.dataset.imageWrapContour = JSON.stringify({
      polygon: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 1, y: 0 },
          { x: 0, y: 0 }
        ],
        source: 'alpha-mask-outer',
        supportsInnerContours: true
      },
      slices: [
        {
          top: 0,
          bottom: 1,
          spans: [
            { start: 0, end: 0.2 },
            { start: 0.8, end: 1 }
          ]
        }
      ],
      hasInteriorOpenings: true
    })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(editorDom, 'scrollLeft', { configurable: true, value: 0 })
    setRect(editorDom, { top: 0, bottom: 400, left: 0, right: 300 })
    setRect(pageBody, { top: 0, bottom: 200, left: 0, right: 200 })
    setRect(imageAnchor, { top: 50, bottom: 150, left: 50, right: 150 })

    editorDom.append(pageBody, imageAnchor)

    expect(getPageBodyMeasurementBands(editorDom)).toEqual([
      {
        pageNumber: 1,
        left: 0,
        right: 200,
        top: 0,
        bottom: 50,
        pageLeft: 0,
        pageRight: 200
      },
      {
        pageNumber: 1,
        left: 0,
        right: 50,
        top: 50,
        bottom: 150,
        pageLeft: 0,
        pageRight: 200
      },
      {
        pageNumber: 1,
        left: 70,
        right: 130,
        top: 50,
        bottom: 150,
        pageLeft: 0,
        pageRight: 200
      },
      {
        pageNumber: 1,
        left: 150,
        right: 200,
        top: 50,
        bottom: 150,
        pageLeft: 0,
        pageRight: 200
      },
      {
        pageNumber: 1,
        left: 0,
        right: 200,
        top: 150,
        bottom: 200,
        pageLeft: 0,
        pageRight: 200
      }
    ])
  })
})

describe('getSelectionBottom', () => {
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

  it('uses the containing paragraph bottom when the caret rect under-reports a trailing paragraph line', () => {
    const editorDom = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('')

    editorDom.appendChild(paragraph)
    paragraph.appendChild(textNode)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 200 })
    setRect(paragraph, { top: 80, bottom: 120 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          from: 5,
          to: 5
        }
      },
      coordsAtPos: () => ({
        top: 84,
        bottom: 96,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(getSelectionBottom(view)).toBe(120)
  })

  it('falls back to the caret rect when no block element can be resolved', () => {
    const editorDom = document.createElement('div')
    const textNode = document.createTextNode('')

    editorDom.appendChild(textNode)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 10, bottom: 210 })
    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 7 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          from: 3,
          to: 3
        }
      },
      coordsAtPos: () => ({
        top: 50,
        bottom: 62,
        left: 20,
        right: 20
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(getSelectionBottom(view)).toBe(59)
  })
})

describe('getDocumentContentBottom', () => {
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

  it('measures the rendered document tail even when the current selection is earlier', () => {
    const editorDom = document.createElement('div')
    const firstParagraph = document.createElement('p')
    const secondParagraph = document.createElement('p')
    const firstTextNode = document.createTextNode('first')
    const secondTextNode = document.createTextNode('second')

    firstParagraph.appendChild(firstTextNode)
    secondParagraph.appendChild(secondTextNode)
    editorDom.append(firstParagraph, secondParagraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(firstParagraph, { top: 10, bottom: 40 })
    setRect(secondParagraph, { top: 180, bottom: 220 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(firstParagraph, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'clientHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'scrollHeight', { configurable: true, value: 30 })
    Object.defineProperty(secondParagraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          content: {
            size: 10
          }
        }
      },
      coordsAtPos: (position: number) =>
        position >= 9
          ? {
              top: 184,
              bottom: 208,
              left: 12,
              right: 12
            }
          : {
              top: 12,
              bottom: 24,
              left: 12,
              right: 12
            },
      domAtPos: (position: number) => ({
        node: position >= 9 ? secondTextNode : firstTextNode,
        offset: 0
      })
    } as never

    expect(getDocumentContentBottom(view)).toBe(220)
  })
})

describe('calculatePageCount', () => {
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

  it('uses the document bottom for initial page counts when the caret is still near the top', () => {
    const editorDom = document.createElement('div')
    const firstParagraph = document.createElement('p')
    const secondParagraph = document.createElement('p')
    const firstTextNode = document.createTextNode('first')
    const secondTextNode = document.createTextNode('second')

    firstParagraph.appendChild(firstTextNode)
    secondParagraph.appendChild(secondTextNode)
    editorDom.append(firstParagraph, secondParagraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(firstParagraph, { top: 10, bottom: 40 })
    setRect(secondParagraph, { top: 180, bottom: 220 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(firstParagraph, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'clientHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'scrollHeight', { configurable: true, value: 30 })
    Object.defineProperty(secondParagraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          content: {
            size: 10
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: (position: number) =>
        position >= 9
          ? {
              top: 184,
              bottom: 208,
              left: 12,
              right: 12
            }
          : {
              top: 12,
              bottom: 24,
              left: 12,
              right: 12
            },
      domAtPos: (position: number) => ({
        node: position >= 9 ? secondTextNode : firstTextNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 100,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(3)
  })

  it('skips selection-bottom probing when content bottom is already known for a caret selection', () => {
    const editorDom = document.createElement('div')
    const firstParagraph = document.createElement('p')
    const secondParagraph = document.createElement('p')
    const firstTextNode = document.createTextNode('first')
    const secondTextNode = document.createTextNode('second')

    firstParagraph.appendChild(firstTextNode)
    secondParagraph.appendChild(secondTextNode)
    editorDom.append(firstParagraph, secondParagraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(firstParagraph, { top: 10, bottom: 40 })
    setRect(secondParagraph, { top: 180, bottom: 220 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(firstParagraph, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'clientHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'scrollHeight', { configurable: true, value: 30 })
    Object.defineProperty(secondParagraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'scrollHeight', { configurable: true, value: 40 })

    const coordsAtPos = jest.fn((position: number) =>
      position >= 9
        ? {
            top: 184,
            bottom: 208,
            left: 12,
            right: 12
          }
        : {
            top: 12,
            bottom: 24,
            left: 12,
            right: 12
          }
    )

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          content: {
            size: 10
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos,
      domAtPos: (position: number) => ({
        node: position >= 9 ? secondTextNode : firstTextNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 100,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(3)

    expect(coordsAtPos).not.toHaveBeenCalledWith(1)
  })

  it('measures the image figure bottom for an image node selection', () => {
    const editorDom = document.createElement('div')
    const figure = document.createElement('figure')
    const image = document.createElement('img')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('tail')

    figure.appendChild(image)
    paragraph.appendChild(textNode)
    editorDom.append(figure, paragraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(figure, { top: 120, bottom: 190 })
    setRect(paragraph, { top: 40, bottom: 60 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(figure, 'offsetHeight', { configurable: true, value: 70 })
    Object.defineProperty(figure, 'clientHeight', { configurable: true, value: 70 })
    Object.defineProperty(figure, 'scrollHeight', { configurable: true, value: 70 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 20 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 20 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 20 })

    const selection = Object.create(NodeSelection.prototype)
    Object.defineProperties(selection, {
      from: { configurable: true, value: 1 },
      to: { configurable: true, value: 1 },
      node: {
        configurable: true,
        value: {
          type: {
            name: 'image'
          }
        }
      }
    })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'tail' },
          content: {
            size: 4
          }
        },
        selection
      },
      coordsAtPos: () => ({
        top: 128,
        bottom: 176,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: image,
        offset: 0
      })
    } as never

    expect(getSelectionBottom(view)).toBe(190)
  })

  it('still probes the document tail when a last content element exists so it can catch deeper content', () => {
    const editorDom = document.createElement('div')
    const firstParagraph = document.createElement('p')
    const secondParagraph = document.createElement('p')
    const firstTextNode = document.createTextNode('first')
    const secondTextNode = document.createTextNode('second')

    firstParagraph.appendChild(firstTextNode)
    secondParagraph.appendChild(secondTextNode)
    editorDom.append(firstParagraph, secondParagraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(firstParagraph, { top: 10, bottom: 40 })
    setRect(secondParagraph, { top: 180, bottom: 220 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(firstParagraph, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'clientHeight', { configurable: true, value: 30 })
    Object.defineProperty(firstParagraph, 'scrollHeight', { configurable: true, value: 30 })
    Object.defineProperty(secondParagraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(secondParagraph, 'scrollHeight', { configurable: true, value: 40 })

    const coordsAtPos = jest.fn((position: number) =>
      position >= 9
        ? {
            top: 184,
            bottom: 208,
            left: 12,
            right: 12
          }
        : {
            top: 12,
            bottom: 24,
            left: 12,
            right: 12
          }
    )

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          content: {
            size: 10
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos,
      domAtPos: (position: number) => ({
        node: position >= 9 ? secondTextNode : firstTextNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 100,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(3)

    expect(coordsAtPos).toHaveBeenCalledWith(10)
    expect(coordsAtPos).toHaveBeenCalledWith(9)
  })

  it('measures overflow against the last page body instead of the last breaker', () => {
    const editorDom = document.createElement('div')
    const paginationElement = document.createElement('div')
    const pageBreak = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const breaker = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('body')

    paginationElement.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    breaker.className = 'breaker'
    paragraph.appendChild(textNode)
    pageBreak.append(bodyLayer, breaker)
    paginationElement.appendChild(pageBreak)
    editorDom.append(paginationElement, paragraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(bodyLayer, { top: 0, bottom: 100 })
    setRect(breaker, { top: 10, bottom: 20 })
    setRect(paragraph, { top: 60, bottom: 100 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'body' },
          content: {
            size: 8
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 64,
        bottom: 76,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 120,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(1)
  })

  it('uses the true document bottom when the visible last content element undercounts in paginated mode', () => {
    const editorDom = document.createElement('div')
    const paginationElement = document.createElement('div')
    const pageBreak = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('body')

    paginationElement.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    paragraph.appendChild(textNode)
    pageBreak.appendChild(bodyLayer)
    paginationElement.appendChild(pageBreak)
    editorDom.append(paginationElement, paragraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 320 })
    setRect(bodyLayer, { top: 0, bottom: 100 })
    setRect(paragraph, { top: 60, bottom: 100 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'body' },
          content: {
            size: 8
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 184,
        bottom: 208,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 100,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(3)
  })

  it('keeps the page count stable when the document end still fits inside the expected last page body', () => {
    const editorDom = document.createElement('div')
    const paginationElement = document.createElement('div')
    const pageBreak = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const breaker = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('body')

    paginationElement.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    breaker.className = 'breaker'
    paragraph.appendChild(textNode)
    pageBreak.append(bodyLayer, breaker)
    paginationElement.appendChild(pageBreak)
    editorDom.append(paginationElement, paragraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 320 })
    setRect(bodyLayer, { top: 0, bottom: 150 })
    setRect(breaker, { top: 150, bottom: 160 })
    setRect(paragraph, { top: 60, bottom: 100 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'body' },
          content: {
            size: 8
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 84,
        bottom: 96,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 120,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(1)
  })

  it('adds only one recovery page when a stretched last page hides document-end overflow', () => {
    const editorDom = document.createElement('div')
    const paginationElement = document.createElement('div')
    const pageBreak = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const breaker = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('body')

    paginationElement.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    breaker.className = 'breaker'
    paragraph.appendChild(textNode)
    pageBreak.append(bodyLayer, breaker)
    paginationElement.appendChild(pageBreak)
    editorDom.append(paginationElement, paragraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 420 })
    setRect(bodyLayer, { top: 0, bottom: 360 })
    setRect(breaker, { top: 360, bottom: 370 })
    setRect(paragraph, { top: 320, bottom: 360 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 40 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'body' },
          content: {
            size: 8
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 334,
        bottom: 346,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 120,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(2)
  })

  it('reads the pagination root only once during page-count calculation', () => {
    const editorDom = document.createElement('div')
    const paginationElement = document.createElement('div')
    const pageBreak = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const breaker = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('body')

    paginationElement.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    breaker.className = 'breaker'
    paragraph.appendChild(textNode)
    pageBreak.append(bodyLayer, breaker)
    paginationElement.appendChild(pageBreak)
    editorDom.append(paginationElement, paragraph)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(bodyLayer, { top: 0, bottom: 100 })
    setRect(breaker, { top: 10, bottom: 20 })
    setRect(paragraph, { top: 60, bottom: 100 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 40 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 40 })

    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'body' },
          content: {
            size: 8
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 64,
        bottom: 76,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 100,
          height: 120,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(1)

    expect(querySelectorSpy.mock.calls.filter(([selector]) => selector === '[data-rm-pagination]')).toHaveLength(0)
    expect(querySelectorSpy).not.toHaveBeenCalledWith('.rm-page-body-layer[data-rm-page-number="1"]')
  })

  it('reduces effective page capacity when floating image exclusions narrow the usable lane', () => {
    const editorDom = document.createElement('div')
    const paginationElement = document.createElement('div')
    const pageBreak = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const imageAnchor = document.createElement('div')
    const paragraph = document.createElement('p')
    const textNode = document.createTextNode('body')

    paginationElement.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    imageAnchor.dataset.imageExclusionMode = 'square'
    imageAnchor.dataset.imageWrapTextSide = 'left'
    paragraph.appendChild(textNode)
    pageBreak.appendChild(bodyLayer)
    paginationElement.appendChild(pageBreak)
    editorDom.append(paginationElement, imageAnchor, paragraph)
    document.body.appendChild(editorDom)

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(editorDom, 'scrollLeft', { configurable: true, value: 0 })
    setRect(editorDom, { top: 0, bottom: 320, left: 0, right: 120 })
    setRect(bodyLayer, { top: 0, bottom: 120, left: 0, right: 120 })
    setRect(imageAnchor, { top: 0, bottom: 120, left: 60, right: 120 })
    setRect(paragraph, { top: 200, bottom: 260, left: 0, right: 120 })
    Object.defineProperty(paragraph, 'offsetHeight', { configurable: true, value: 60 })
    Object.defineProperty(paragraph, 'clientHeight', { configurable: true, value: 60 })
    Object.defineProperty(paragraph, 'scrollHeight', { configurable: true, value: 60 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 2,
          firstChild: { type: { name: 'paragraph' }, childCount: 1, textContent: 'body' },
          content: {
            size: 8
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 24,
        bottom: 36,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: textNode,
        offset: 0
      })
    } as never

    expect(
      calculatePageCount(
        view,
        {
          width: 120,
          height: 120,
          margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        0
      )
    ).toBe(4)
  })
})

describe('measureHeaderFooterContentHeights', () => {
  function setMeasuredHeight(element: HTMLElement, height: number) {
    Object.defineProperty(element, 'offsetHeight', { configurable: true, value: height })
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: height })
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: height })
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

  it('measures the inner region layout without double-counting shell padding', () => {
    const editorDom = document.createElement('div')
    const headerRegion = document.createElement('div')
    const footerRegion = document.createElement('div')
    const headerShell = document.createElement('div')
    const footerShell = document.createElement('div')
    const headerLayout = document.createElement('div')
    const footerLayout = document.createElement('div')

    headerRegion.dataset.rmEditorType = 'header'
    headerRegion.dataset.rmPageNumber = '1'
    footerRegion.dataset.rmEditorType = 'footer'
    footerRegion.dataset.rmPageNumber = '1'
    headerShell.className = 'rm-page-header'
    footerShell.className = 'rm-page-footer'
    headerLayout.className = 'rm-page-region-layout'
    footerLayout.className = 'rm-page-region-layout'

    setMeasuredHeight(headerShell, 116)
    setMeasuredHeight(footerShell, 108)
    setMeasuredHeight(headerLayout, 20)
    setMeasuredHeight(footerLayout, 24)

    headerShell.appendChild(headerLayout)
    footerShell.appendChild(footerLayout)
    headerRegion.appendChild(headerShell)
    footerRegion.appendChild(footerShell)
    editorDom.append(headerRegion, footerRegion)
    document.body.appendChild(editorDom)

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      1,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      }
    )

    expect(measured.headerHeights.get(1)).toBe(20)
    expect(measured.footerHeights.get(1)).toBe(24)
  })

  it('falls back to placeholder breaker height hints when off-window regions are not mounted', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const page = document.createElement('div')
    const breaker = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    page.className = 'page'
    page.dataset.rmPageNumber = '1'
    breaker.className = 'breaker'
    breaker.dataset.rmBreakerMode = 'placeholder'
    breaker.dataset.rmBreakerFooterHeight = '18'
    breaker.dataset.rmBreakerNextHeaderHeight = '27'

    pageBreak.append(page, breaker)
    paginationRoot.append(pageBreak)
    editorDom.appendChild(paginationRoot)
    document.body.appendChild(editorDom)

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      2,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      }
    )

    expect(measured.footerHeights.get(1)).toBe(18)
    expect(measured.headerHeights.get(2)).toBe(27)
  })

  it('indexes visible region layouts once when measuring many pages', () => {
    const editorDom = document.createElement('div')

    for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
      const headerRegion = document.createElement('div')
      const footerRegion = document.createElement('div')
      const headerShell = document.createElement('div')
      const footerShell = document.createElement('div')
      const headerLayout = document.createElement('div')
      const footerLayout = document.createElement('div')

      headerRegion.dataset.rmEditorType = 'header'
      headerRegion.dataset.rmPageNumber = String(pageNumber)
      footerRegion.dataset.rmEditorType = 'footer'
      footerRegion.dataset.rmPageNumber = String(pageNumber)
      headerShell.className = 'rm-page-header'
      footerShell.className = 'rm-page-footer'
      headerLayout.className = 'rm-page-region-layout'
      footerLayout.className = 'rm-page-region-layout'

      setMeasuredHeight(headerLayout, 10 + pageNumber)
      setMeasuredHeight(footerLayout, 20 + pageNumber)

      headerShell.appendChild(headerLayout)
      footerShell.appendChild(footerLayout)
      headerRegion.appendChild(headerShell)
      footerRegion.appendChild(footerShell)
      editorDom.append(headerRegion, footerRegion)
    }

    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      5,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      },
      [1, 2, 3, 4, 5]
    )

    expect(querySelectorSpy).not.toHaveBeenCalled()
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type="header"][data-rm-page-number]')
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type="footer"][data-rm-page-number]')
    expect(measured.headerHeights.get(5)).toBe(15)
    expect(measured.footerHeights.get(5)).toBe(25)
  })

  it('uses page-break chrome when indexing visible region layouts', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageHeader = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '2'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '2'
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'
    firstPageHeader.dataset.rmEditorType = 'header'

    const firstPageHeaderShell = document.createElement('div')
    const firstPageHeaderLayout = document.createElement('div')
    firstPageHeaderShell.className = 'rm-page-header'
    firstPageHeaderLayout.className = 'rm-page-region-layout'
    setMeasuredHeight(firstPageHeaderLayout, 11)
    firstPageHeaderShell.appendChild(firstPageHeaderLayout)
    firstPageHeader.appendChild(firstPageHeaderShell)

    for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const breaker = document.createElement('div')
      const footerRegion = document.createElement('div')
      const footerShell = document.createElement('div')
      const footerLayout = document.createElement('div')
      const nextHeaderRegion = document.createElement('div')
      const nextHeaderShell = document.createElement('div')
      const nextHeaderLayout = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      pageBreak.dataset.rmPageNumber = String(pageNumber)
      breaker.className = 'breaker'
      footerRegion.className = 'rm-page-footer-region'
      footerRegion.dataset.rmPageNumber = String(pageNumber)
      footerRegion.dataset.rmEditorType = 'footer'
      footerShell.className = 'rm-page-footer'
      footerLayout.className = 'rm-page-region-layout'
      nextHeaderRegion.className = 'rm-page-header-region'
      nextHeaderRegion.dataset.rmPageNumber = String(pageNumber + 1)
      nextHeaderRegion.dataset.rmEditorType = 'header'
      nextHeaderShell.className = 'rm-page-header'
      nextHeaderLayout.className = 'rm-page-region-layout'

      setMeasuredHeight(footerLayout, 20 + pageNumber)
      setMeasuredHeight(nextHeaderLayout, 30 + pageNumber)

      footerShell.appendChild(footerLayout)
      footerRegion.appendChild(footerShell)
      nextHeaderShell.appendChild(nextHeaderLayout)
      nextHeaderRegion.appendChild(nextHeaderShell)
      breaker.append(footerRegion, nextHeaderRegion)
      pageBreak.appendChild(breaker)
      paginationRoot.appendChild(pageBreak)
    }

    editorDom.append(firstPageHeader, paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      2,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      },
      [1, 2]
    )

    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type="header"][data-rm-page-number]')
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type="footer"][data-rm-page-number]')
    expect(measured.headerHeights.get(1)).toBe(11)
    expect(measured.headerHeights.get(2)).toBe(31)
    expect(measured.footerHeights.get(2)).toBe(22)
  })

  it('uses page-break chrome for small visible region lookups', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageHeader = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'
    firstPageHeader.dataset.rmEditorType = 'header'

    const firstPageHeaderShell = document.createElement('div')
    const firstPageHeaderLayout = document.createElement('div')
    firstPageHeaderShell.className = 'rm-page-header'
    firstPageHeaderLayout.className = 'rm-page-region-layout'
    setMeasuredHeight(firstPageHeaderLayout, 11)
    firstPageHeaderShell.appendChild(firstPageHeaderLayout)
    firstPageHeader.appendChild(firstPageHeaderShell)

    for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const breaker = document.createElement('div')
      const footerRegion = document.createElement('div')
      const footerShell = document.createElement('div')
      const footerLayout = document.createElement('div')
      const nextHeaderRegion = document.createElement('div')
      const nextHeaderShell = document.createElement('div')
      const nextHeaderLayout = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      pageBreak.dataset.rmPageNumber = String(pageNumber)
      breaker.className = 'breaker'
      footerRegion.className = 'rm-page-footer-region'
      footerRegion.dataset.rmPageNumber = String(pageNumber)
      footerRegion.dataset.rmEditorType = 'footer'
      footerShell.className = 'rm-page-footer'
      footerLayout.className = 'rm-page-region-layout'
      nextHeaderRegion.className = 'rm-page-header-region'
      nextHeaderRegion.dataset.rmPageNumber = String(pageNumber + 1)
      nextHeaderRegion.dataset.rmEditorType = 'header'
      nextHeaderShell.className = 'rm-page-header'
      nextHeaderLayout.className = 'rm-page-region-layout'

      setMeasuredHeight(footerLayout, 20 + pageNumber)
      setMeasuredHeight(nextHeaderLayout, 30 + pageNumber)

      footerShell.appendChild(footerLayout)
      footerRegion.appendChild(footerShell)
      nextHeaderShell.appendChild(nextHeaderLayout)
      nextHeaderRegion.appendChild(nextHeaderShell)
      breaker.append(footerRegion, nextHeaderRegion)
      pageBreak.appendChild(breaker)
      paginationRoot.appendChild(pageBreak)
    }

    editorDom.append(firstPageHeader, paginationRoot)

    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      2,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      },
      [1, 2]
    )

    expect(querySelectorSpy).not.toHaveBeenCalledWith(
      '[data-rm-editor-type="header"][data-rm-page-number="1"] .rm-page-region-layout'
    )
    expect(querySelectorSpy).not.toHaveBeenCalledWith(
      '[data-rm-editor-type="footer"][data-rm-page-number="2"] .rm-page-region-layout'
    )
    expect(measured.headerHeights.get(1)).toBe(11)
    expect(measured.headerHeights.get(2)).toBe(31)
    expect(measured.footerHeights.get(2)).toBe(22)
  })

  it('indexes placeholder page breaks once when measuring many off-window pages', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '6'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '5'

    for (let pageNumber = 1; pageNumber <= 6; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const page = document.createElement('div')
      const breaker = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      page.className = 'page'
      page.dataset.rmPageNumber = String(pageNumber)
      breaker.className = 'breaker'
      breaker.dataset.rmBreakerFooterHeight = String(10 + pageNumber)
      breaker.dataset.rmBreakerNextHeaderHeight = String(20 + pageNumber)

      pageBreak.append(page, breaker)
      paginationRoot.appendChild(pageBreak)
    }

    editorDom.appendChild(paginationRoot)

    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      6,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      },
      [1, 2, 3, 4, 5, 6]
    )

    expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-rm-pagination]')
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-pagination] > .rm-page-break')
    expect(measured.footerHeights.get(5)).toBe(15)
    expect(measured.headerHeights.get(6)).toBe(25)
  })

  it('uses mounted-range child offsets for small placeholder page lookups', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '4'

    for (let pageNumber = 2; pageNumber <= 4; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const page = document.createElement('div')
      const breaker = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      page.className = 'page'
      page.dataset.rmPageNumber = String(pageNumber)
      breaker.className = 'breaker'
      breaker.dataset.rmBreakerFooterHeight = String(10 + pageNumber)
      breaker.dataset.rmBreakerNextHeaderHeight = String(20 + pageNumber)

      pageBreak.append(page, breaker)
      paginationRoot.appendChild(pageBreak)
    }

    editorDom.appendChild(paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      4,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      },
      [3, 4]
    )

    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-pagination] > .rm-page-break')
    expect(measured.headerHeights.get(3)).toBe(22)
    expect(measured.footerHeights.get(4)).toBe(14)
  })

  it('uses pagination children for small placeholder lookups without range metadata', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'

    for (let pageNumber = 2; pageNumber <= 4; pageNumber += 1) {
      const pageBreak = document.createElement('div')
      const breaker = document.createElement('div')

      pageBreak.className = 'rm-page-break'
      pageBreak.dataset.rmPageNumber = String(pageNumber)
      breaker.className = 'breaker'
      breaker.dataset.rmBreakerFooterHeight = String(10 + pageNumber)
      breaker.dataset.rmBreakerNextHeaderHeight = String(20 + pageNumber)

      pageBreak.appendChild(breaker)
      paginationRoot.appendChild(pageBreak)
    }

    editorDom.appendChild(paginationRoot)

    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      4,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      },
      [3, 4]
    )

    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-pagination] > .rm-page-break')
    expect(measured.headerHeights.get(3)).toBe(22)
    expect(measured.footerHeights.get(4)).toBe(14)
  })

  it('counts a trailing empty paragraph inside an active inline editor', () => {
    const editorDom = document.createElement('div')
    const headerRegion = document.createElement('div')
    const headerShell = document.createElement('div')
    const headerLayout = document.createElement('div')
    const contentHost = document.createElement('div')
    const proseMirror = document.createElement('div')
    const paragraph = document.createElement('p')
    const trailingBreak = document.createElement('br')

    headerRegion.dataset.rmEditorType = 'header'
    headerRegion.dataset.rmPageNumber = '1'
    headerShell.className = 'rm-page-header'
    headerLayout.className = 'rm-page-region-layout'
    contentHost.className = 'rm-page-header-content rm-page-inline-editor'
    contentHost.dataset.rmPageNumberBody = 'true'
    proseMirror.className = 'tiptap ProseMirror'
    trailingBreak.className = 'ProseMirror-trailingBreak'

    paragraph.appendChild(trailingBreak)
    proseMirror.appendChild(paragraph)
    contentHost.appendChild(proseMirror)
    headerLayout.appendChild(contentHost)
    headerShell.appendChild(headerLayout)
    headerRegion.appendChild(headerShell)
    editorDom.appendChild(headerRegion)
    document.body.appendChild(editorDom)

    setMeasuredHeight(headerLayout, 0)
    setMeasuredHeight(contentHost, 0)
    setMeasuredHeight(proseMirror, 0)
    setMeasuredHeight(paragraph, 0)

    setRect(headerLayout, { top: 0, bottom: 0 })
    setRect(contentHost, { top: 0, bottom: 0 })
    setRect(proseMirror, { top: 0, bottom: 0 })
    setRect(paragraph, { top: 0, bottom: 0 })

    const computedStyleSpy = jest.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          lineHeight: '18px',
          fontSize: '16px'
        }) as CSSStyleDeclaration
    )

    const measured = measureHeaderFooterContentHeights(
      editorDom,
      1,
      {
        width: 800,
        height: 1000,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      {
        headerTopMargin: 48,
        footerBottomMargin: 48
      }
    )

    computedStyleSpy.mockRestore()

    expect(measured.headerHeights.get(1)).toBe(18)
  })
})

describe('image runtime layout metrics', () => {
  function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: rect.left ?? 0,
        y: rect.top,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left ?? 0,
        right: rect.right ?? 0,
        width: (rect.right ?? 0) - (rect.left ?? 0),
        height: rect.bottom - rect.top,
        toJSON: () => ({})
      })
    })
  }

  it('uses custom image layout metrics for image selections', () => {
    const editorDom = document.createElement('div')
    const anchor = document.createElement('div')
    const figure = document.createElement('figure')
    const image = document.createElement('img')

    anchor.dataset.imageLayoutHeight = '130'
    anchor.dataset.imageVisualBottom = '90'
    anchor.appendChild(figure)
    figure.appendChild(image)
    editorDom.appendChild(anchor)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 240 })
    setRect(anchor, { top: 20, bottom: 20 })
    setRect(figure, { top: 20, bottom: 20 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })

    const selection = Object.create(NodeSelection.prototype)
    Object.defineProperties(selection, {
      from: { configurable: true, value: 1 },
      to: { configurable: true, value: 1 },
      node: {
        configurable: true,
        value: {
          type: {
            name: 'image'
          }
        }
      }
    })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 1,
          content: {
            size: 2
          }
        },
        selection
      },
      coordsAtPos: () => ({
        top: 24,
        bottom: 32,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: image,
        offset: 0
      })
    } as never

    expect(getSelectionBottom(view)).toBe(110)
  })

  it('ignores overlay image runtime metrics for image selections', () => {
    const editorDom = document.createElement('div')
    const anchor = document.createElement('div')
    const figure = document.createElement('figure')
    const image = document.createElement('img')

    anchor.dataset.imageLayoutHeight = '130'
    anchor.dataset.imageVisualBottom = '90'
    anchor.dataset.imageMeasurementMode = 'overlay'
    anchor.appendChild(figure)
    figure.appendChild(image)
    editorDom.appendChild(anchor)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 240 })
    setRect(anchor, { top: 20, bottom: 20 })
    setRect(figure, { top: 20, bottom: 20 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })

    const selection = Object.create(NodeSelection.prototype)
    Object.defineProperties(selection, {
      from: { configurable: true, value: 1 },
      to: { configurable: true, value: 1 },
      node: {
        configurable: true,
        value: {
          type: {
            name: 'image'
          }
        }
      }
    })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 1,
          content: {
            size: 2
          }
        },
        selection
      },
      coordsAtPos: () => ({
        top: 24,
        bottom: 32,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: image,
        offset: 0
      })
    } as never

    expect(getSelectionBottom(view)).toBe(32)
  })

  it('uses custom image layout metrics for document end measurement', () => {
    const editorDom = document.createElement('div')
    const anchor = document.createElement('div')
    const figure = document.createElement('figure')
    const image = document.createElement('img')

    anchor.dataset.imageLayoutHeight = '140'
    anchor.dataset.imageVisualBottom = '95'
    anchor.appendChild(figure)
    figure.appendChild(image)
    editorDom.appendChild(anchor)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 260 })
    setRect(anchor, { top: 30, bottom: 30 })
    setRect(figure, { top: 30, bottom: 30 })

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })

    const view = {
      dom: editorDom,
      state: {
        doc: {
          childCount: 1,
          content: {
            size: 2
          }
        },
        selection: {
          from: 1,
          to: 1
        }
      },
      coordsAtPos: () => ({
        top: 36,
        bottom: 40,
        left: 12,
        right: 12
      }),
      domAtPos: () => ({
        node: image,
        offset: 0
      })
    } as never

    expect(getDocumentContentBottom(view)).toBe(125)
  })
})
