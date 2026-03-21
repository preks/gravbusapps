import {
  PAGE_COUNT_ADD_HYSTERESIS_PX,
  PAGE_COUNT_REMOVE_HYSTERESIS_PX,
  getSelectionBottom,
  measureHeaderFooterContentHeights,
  resolvePageCountFromLastPageGap
} from '../utils'

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
