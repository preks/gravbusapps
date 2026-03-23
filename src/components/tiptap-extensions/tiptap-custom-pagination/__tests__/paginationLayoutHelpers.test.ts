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

describe('applyMeasuredPageHeightsToView', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('writes per-page body and spacer CSS variables from measured chrome heights', () => {
    const editorDom = document.createElement('div')
    document.body.appendChild(editorDom)
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
