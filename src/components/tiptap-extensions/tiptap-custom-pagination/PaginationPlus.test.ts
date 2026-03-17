import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorView } from '@tiptap/pm/view'
import {
  createFirstPageHeader,
  createHeaderFooterRegion,
  createPageBreakElement,
  createPaginationWrapper,
  ensurePagesStyles
} from './dom'
import { PAGE_FORMATS } from './constants'
import { getPageBodyBands, Pages, resolvePaginationBodyClick } from './PaginationPlus'
import type { PagesOptions } from './types'
import {
  calculatePageCount,
  createStorageFromOptions,
  findOverflowingTableSplit,
  getPageLayoutHeights,
  getPageSpacerHeight,
  measureHeaderFooterContentHeights,
  resolveDisplayContent
} from './utils'

const TEST_PAGE_FORMAT = {
  name: 'Test',
  width: 500,
  height: 700,
  margins: {
    top: 80,
    right: 40,
    bottom: 80,
    left: 40
  }
} as const

function createOptions(overrides: Partial<PagesOptions> = {}): PagesOptions {
  return {
    pageFormat: TEST_PAGE_FORMAT,
    headerHeight: 50,
    footerHeight: 40,
    pageGap: 32,
    pageBreakBackground: '#f5f5f5',
    header: 'Header {page}/{total}',
    footer: 'Footer {page}/{total}',
    differentFirstPage: false,
    differentOddEven: false,
    ...overrides
  }
}

function mockRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
  element.getBoundingClientRect = jest.fn(() => ({
    x: rect.left ?? 0,
    y: rect.top,
    top: rect.top,
    right: rect.right ?? 500,
    bottom: rect.bottom,
    left: rect.left ?? 0,
    width: (rect.right ?? 500) - (rect.left ?? 0),
    height: rect.bottom - rect.top,
    toJSON: () => ({})
  })) as any
}

describe('Pages extension helpers', () => {
  it('resolves header variants with first-page and odd/even precedence', () => {
    const options = createOptions({
      differentFirstPage: true,
      headerFirstPage: 'First {page}/{total}',
      differentOddEven: true,
      headerOdd: 'Odd {page}',
      headerEven: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Even {page} of {total}' }]
          }
        ]
      }
    })
    const storage = createStorageFromOptions(options)

    expect(resolveDisplayContent(storage, options, 'header', 1, 4, [StarterKit]).html).toContain('First 1/4')
    expect(resolveDisplayContent(storage, options, 'header', 2, 4, [StarterKit]).html).toContain('Even 2 of 4')
    expect(resolveDisplayContent(storage, options, 'header', 3, 4, [StarterKit]).html).toContain('Odd 3')

    storage.headerOddHTML = 'Stored odd {page}'
    expect(resolveDisplayContent(storage, options, 'header', 3, 4, [StarterKit]).html).toContain('Stored odd 3')
  })

  it('calculates page count and renders one boundary per page', () => {
    const root = document.createElement('div')
    const paragraph = document.createElement('p')
    root.appendChild(paragraph)

    Object.defineProperty(paragraph, 'offsetTop', {
      value: 1500,
      configurable: true
    })
    Object.defineProperty(paragraph, 'offsetHeight', {
      value: 120,
      configurable: true
    })
    Object.defineProperty(paragraph, 'clientHeight', {
      value: 120,
      configurable: true
    })
    Object.defineProperty(paragraph, 'scrollHeight', {
      value: 120,
      configurable: true
    })

    const pageCount = calculatePageCount({ dom: root } as any, PAGE_FORMATS.A4, 40)
    expect(pageCount).toBe(2)

    const options = createOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = pageCount

    const wrapper = createPaginationWrapper({
      totalPages: pageCount,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })

    expect(wrapper.children).toHaveLength(2)
    expect(wrapper.querySelectorAll('.breaker')).toHaveLength(2)
    expect(wrapper.querySelector('.rm-page-break:nth-child(1) > .page')).not.toBeNull()
    expect(wrapper.querySelector('.rm-page-break:nth-child(2) > .page')).not.toBeNull()
  })

  it('counts a trailing empty paragraph using its rendered line box', () => {
    const root = document.createElement('div')
    const paragraph = document.createElement('p')
    const trailingBreak = document.createElement('br')
    trailingBreak.className = 'ProseMirror-trailingBreak'
    paragraph.appendChild(trailingBreak)
    root.appendChild(paragraph)

    Object.defineProperty(paragraph, 'offsetTop', {
      value: 520,
      configurable: true
    })
    Object.defineProperty(paragraph, 'offsetHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(paragraph, 'clientHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(paragraph, 'scrollHeight', {
      value: 0,
      configurable: true
    })
    paragraph.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 520,
      top: 520,
      right: 0,
      bottom: 548,
      left: 0,
      width: 0,
      height: 28,
      toJSON: () => ({})
    })) as any

    expect(calculatePageCount({ dom: root } as any, TEST_PAGE_FORMAT, 32)).toBe(2)
  })

  it('uses the caret line box when it extends below the last content element', () => {
    const root = document.createElement('div')
    const paragraph = document.createElement('p')
    const wrapper = document.createElement('div')
    const pageBreak = document.createElement('div')
    const breaker = document.createElement('div')

    wrapper.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    breaker.className = 'breaker'
    pageBreak.appendChild(breaker)
    wrapper.appendChild(pageBreak)
    root.append(paragraph, wrapper)

    root.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      toJSON: () => ({})
    })) as any

    Object.defineProperty(paragraph, 'offsetTop', {
      value: 520,
      configurable: true
    })
    Object.defineProperty(paragraph, 'offsetHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(paragraph, 'clientHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(paragraph, 'scrollHeight', {
      value: 0,
      configurable: true
    })

    Object.defineProperty(breaker, 'offsetTop', {
      value: 540,
      configurable: true
    })
    Object.defineProperty(breaker, 'offsetHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(breaker, 'clientHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(breaker, 'scrollHeight', {
      value: 0,
      configurable: true
    })

    const view = {
      dom: root,
      scrollDOM: root,
      state: {
        selection: {
          from: 1,
          to: 1
        },
        doc: {
          childCount: 2
        }
      },
      coordsAtPos: jest.fn(() => ({
        left: 0,
        right: 0,
        top: 548,
        bottom: 580
      }))
    } as any

    expect(calculatePageCount(view, TEST_PAGE_FORMAT, 32)).toBe(2)
  })

  it('finds the first overflowing table split candidate', () => {
    const root = document.createElement('div')
    root.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      right: 500,
      bottom: 400,
      left: 0,
      width: 500,
      height: 400,
      toJSON: () => ({})
    })) as any

    const firstBand = document.createElement('div')
    firstBand.className = 'rm-page-body-layer'
    firstBand.dataset.rmPageNumber = '1'
    mockRect(firstBand, { top: 0, bottom: 100 })

    const secondBand = document.createElement('div')
    secondBand.className = 'rm-page-body-layer'
    secondBand.dataset.rmPageNumber = '2'
    mockRect(secondBand, { top: 120, bottom: 220 })

    root.append(firstBand, secondBand)

    const firstRow = document.createElement('tr')
    mockRect(firstRow, { top: 20, bottom: 50 })

    const secondRow = document.createElement('tr')
    mockRect(secondRow, { top: 50, bottom: 80 })

    const thirdRow = document.createElement('tr')
    mockRect(thirdRow, { top: 80, bottom: 110 })

    const rowPositions = new Map<number, HTMLTableRowElement>([
      [2, firstRow],
      [7, secondRow],
      [12, thirdRow]
    ])

    const rowCell = { attrs: { colspan: 1 } } as any
    const rowNode = {
      attrs: {},
      forEach: (callback: (node: typeof rowCell, offset: number, index: number) => void) => {
        callback(rowCell, 0, 0)
        callback(rowCell, 1, 1)
      }
    } as any
    const tableNode = {
      type: { name: 'table' },
      firstChild: rowNode,
      forEach: (callback: (node: typeof rowNode, offset: number, index: number) => void) => {
        callback(rowNode, 0, 0)
        callback(rowNode, 5, 1)
        callback(rowNode, 10, 2)
      }
    } as any

    const view = {
      dom: root,
      state: {
        doc: {
          descendants: (callback: (node: typeof tableNode, pos: number) => void) => {
            callback(tableNode, 1)
          }
        }
      },
      nodeDOM: jest.fn((pos: number) => rowPositions.get(pos) ?? null)
    } as any

    expect(findOverflowingTableSplit(view)).toEqual({
      tablePos: 1,
      splitRowIndex: 2
    })
  })

  it('finds a split candidate when a whole table is pushed to the next page', () => {
    const root = document.createElement('div')
    root.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      right: 500,
      bottom: 500,
      left: 0,
      width: 500,
      height: 500,
      toJSON: () => ({})
    })) as any

    const firstBand = document.createElement('div')
    firstBand.className = 'rm-page-body-layer'
    firstBand.dataset.rmPageNumber = '1'
    mockRect(firstBand, { top: 0, bottom: 100 })

    const secondBand = document.createElement('div')
    secondBand.className = 'rm-page-body-layer'
    secondBand.dataset.rmPageNumber = '2'
    mockRect(secondBand, { top: 120, bottom: 220 })

    const paragraph = document.createElement('p')
    mockRect(paragraph, { top: 0, bottom: 20 })

    const table = document.createElement('table')
    mockRect(table, { top: 120, bottom: 210 })

    const firstRow = document.createElement('tr')
    mockRect(firstRow, { top: 120, bottom: 150 })

    const secondRow = document.createElement('tr')
    mockRect(secondRow, { top: 150, bottom: 180 })

    const thirdRow = document.createElement('tr')
    mockRect(thirdRow, { top: 180, bottom: 210 })

    root.append(firstBand, secondBand, paragraph, table)

    const rowPositions = new Map<number, HTMLElement>([
      [1, table],
      [2, firstRow],
      [7, secondRow],
      [12, thirdRow]
    ])

    const rowCell = { attrs: { colspan: 1, rowspan: 1 } } as any
    const rowNode = {
      attrs: {},
      forEach: (callback: (node: typeof rowCell, offset: number, index: number) => void) => {
        callback(rowCell, 0, 0)
        callback(rowCell, 1, 1)
      }
    } as any
    const tableNode = {
      type: { name: 'table' },
      childCount: 3,
      firstChild: rowNode,
      forEach: (callback: (node: typeof rowNode, offset: number, index: number) => void) => {
        callback(rowNode, 0, 0)
        callback(rowNode, 5, 1)
        callback(rowNode, 10, 2)
      }
    } as any

    const view = {
      dom: root,
      state: {
        doc: {
          descendants: (callback: (node: typeof tableNode, pos: number) => void) => {
            callback(tableNode, 1)
          }
        }
      },
      nodeDOM: jest.fn((pos: number) => rowPositions.get(pos) ?? null)
    } as any

    expect(findOverflowingTableSplit(view)).toEqual({
      tablePos: 1,
      splitRowIndex: 1
    })
  })

  it('skips split candidates for rows taller than the page body', () => {
    const root = document.createElement('div')
    root.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      right: 500,
      bottom: 400,
      left: 0,
      width: 500,
      height: 400,
      toJSON: () => ({})
    })) as any

    const firstBand = document.createElement('div')
    firstBand.className = 'rm-page-body-layer'
    firstBand.dataset.rmPageNumber = '1'
    mockRect(firstBand, { top: 0, bottom: 100 })

    const secondBand = document.createElement('div')
    secondBand.className = 'rm-page-body-layer'
    secondBand.dataset.rmPageNumber = '2'
    mockRect(secondBand, { top: 120, bottom: 220 })

    root.append(firstBand, secondBand)

    const oversizedRow = document.createElement('tr')
    mockRect(oversizedRow, { top: 20, bottom: 140 })

    const rowCell = { attrs: { colspan: 1 } } as any
    const rowNode = {
      attrs: {},
      forEach: (callback: (node: typeof rowCell, offset: number, index: number) => void) => {
        callback(rowCell, 0, 0)
      }
    } as any
    const tableNode = {
      type: { name: 'table' },
      firstChild: rowNode,
      forEach: (callback: (node: typeof rowNode, offset: number, index: number) => void) => {
        callback(rowNode, 0, 0)
      }
    } as any

    const view = {
      dom: root,
      state: {
        doc: {
          descendants: (callback: (node: typeof tableNode, pos: number) => void) => {
            callback(tableNode, 1)
          }
        }
      },
      nodeDOM: jest.fn(() => oversizedRow)
    } as any

    expect(findOverflowingTableSplit(view)).toBeNull()
  })

  it('renders header and footer reserved spacing in the shell styles', () => {
    ensurePagesStyles(document)

    const style = document.head.querySelector('[data-rm-pages-style]') as HTMLStyleElement | null

    expect(style?.textContent).toContain('user-select: none;')
    expect(style?.textContent).toContain('pointer-events: none;')
    expect(style?.textContent).toContain('background: inherit;')
  })

  it('prevents inactive header regions from falling through to body selection', () => {
    const options = createOptions()
    const storage = createStorageFromOptions(options)

    const region = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 2,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })

    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    region.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('prevents selectstart inside inactive header regions', () => {
    const options = createOptions()
    const storage = createStorageFromOptions(options)

    const region = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 2,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })

    const event = new Event('selectstart', { bubbles: true, cancelable: true })
    region.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(region.getAttribute('contenteditable')).toBe('false')
  })

  it('prevents page gaps from placing the body cursor', () => {
    const options = createOptions()
    const storage = createStorageFromOptions(options)

    const pageBreak = createPageBreakElement({
      pageNumber: 1,
      totalPages: 2,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })

    const pageGap = pageBreak.querySelector('.rm-page-gap') as HTMLElement | null
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

    expect(pageGap).not.toBeNull()
    pageGap?.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('forwards double-click coordinates when opening a header region', () => {
    const options = createOptions()
    const storage = createStorageFromOptions(options)
    const onOpenEditor = jest.fn()

    const region = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 2,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit],
      onOpenEditor
    })

    const event = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 48
    })
    region.dispatchEvent(event)

    expect(onOpenEditor).toHaveBeenCalledWith('header', 1, region, {
      clientX: 24,
      clientY: 48
    })
  })

  it('derives page body bands from the rendered pagination chrome', () => {
    const root = document.createElement('div')
    const firstBodyLayer = document.createElement('div')
    const secondBodyLayer = document.createElement('div')

    firstBodyLayer.className = 'rm-page-body-layer'
    firstBodyLayer.dataset.rmPageNumber = '1'
    secondBodyLayer.className = 'rm-page-body-layer'
    secondBodyLayer.dataset.rmPageNumber = '2'
    root.append(firstBodyLayer, secondBodyLayer)

    mockRect(firstBodyLayer, { top: 80, bottom: 520 })
    mockRect(secondBodyLayer, { top: 640, bottom: 1080 })

    expect(getPageBodyBands(root)).toEqual([
      { pageNumber: 1, left: 0, right: 500, top: 80, bottom: 520 },
      { pageNumber: 2, left: 0, right: 500, top: 640, bottom: 1080 }
    ])
  })

  it('clamps empty body clicks to a valid same-page caret position', () => {
    const root = document.createElement('div')
    const bodyLayer = document.createElement('div')
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    root.append(bodyLayer)

    mockRect(root, { top: 0, bottom: 900 })
    mockRect(bodyLayer, { top: 80, bottom: 520 })

    const view = {
      dom: root,
      posAtCoords: jest.fn(({ top }: { left: number; top: number }) => {
        if (top <= 200) return { pos: 5, inside: -1 }
        return { pos: 20, inside: -1 }
      }),
      coordsAtPos: jest.fn((pos: number) => {
        if (pos === 5) return { left: 0, right: 0, top: 120, bottom: 140 }
        return { left: 0, right: 0, top: 560, bottom: 590 }
      }),
      state: {
        doc: {
          resolve: jest.fn((position: number) => {
            if (position === 5) {
              return {
                parent: {
                  type: { name: 'paragraph' },
                  content: { size: 4 }
                },
                parentOffset: 2,
                nodeBefore: {
                  type: { name: 'text' },
                  content: { size: 0 }
                },
                nodeAfter: {
                  type: { name: 'text' },
                  content: { size: 0 }
                }
              }
            }

            return {
              parent: {
                type: { name: 'paragraph' },
                content: { size: 0 }
              },
              parentOffset: 0,
              nodeBefore: null,
              nodeAfter: null
            }
          })
        }
      }
    } as any

    expect(resolvePaginationBodyClick(view, 120, 500)).toEqual({
      action: 'set',
      position: 5
    })
  })

  it('allows clicks that resolve inside paragraph text', () => {
    const root = document.createElement('div')
    const bodyLayer = document.createElement('div')
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    root.append(bodyLayer)

    mockRect(bodyLayer, { top: 80, bottom: 520 })

    const view = {
      dom: root,
      posAtCoords: jest.fn(() => ({ pos: 15, inside: -1 })),
      coordsAtPos: jest.fn(() => ({ left: 140, right: 140, top: 200, bottom: 220 })),
      state: {
        doc: {
          resolve: jest.fn(() => ({
            parent: {
              type: { name: 'paragraph' },
              content: { size: 6 }
            },
            parentOffset: 3,
            nodeBefore: { type: { name: 'text' }, content: { size: 0 } },
            nodeAfter: { type: { name: 'text' }, content: { size: 0 } }
          }))
        }
      }
    } as any

    expect(resolvePaginationBodyClick(view, 140, 210)).toEqual({
      action: 'allow'
    })
  })

  it('re-anchors clicks at paragraph boundaries next to empty paragraphs', () => {
    const root = document.createElement('div')
    const bodyLayer = document.createElement('div')
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    root.append(bodyLayer)

    mockRect(bodyLayer, { top: 80, bottom: 520 })

    const resolve = jest.fn((position: number) => {
      if (position === 10) {
        return {
          parent: {
            type: { name: 'paragraph' },
            content: { size: 4 }
          },
          parentOffset: 0,
          nodeBefore: {
            type: { name: 'paragraph' },
            content: { size: 0 }
          },
          nodeAfter: {
            type: { name: 'text' },
            content: { size: 0 }
          }
        }
      }

      return {
        parent: {
          type: { name: 'paragraph' },
          content: { size: 4 }
        },
        parentOffset: 2,
        nodeBefore: {
          type: { name: 'text' },
          content: { size: 0 }
        },
        nodeAfter: {
          type: { name: 'text' },
          content: { size: 0 }
        }
      }
    })

    const view = {
      dom: root,
      posAtCoords: jest.fn(({ top }: { left: number; top: number }) => {
        if (top === 200) return { pos: 10, inside: -1 }
        return { pos: 12, inside: -1 }
      }),
      coordsAtPos: jest.fn((position: number) => {
        if (position === 10) return { left: 100, right: 100, top: 200, bottom: 220 }
        return { left: 145, right: 145, top: 202, bottom: 222 }
      }),
      state: {
        doc: {
          resolve
        }
      }
    } as any

    expect(resolvePaginationBodyClick(view, 140, 200)).toEqual({
      action: 'set',
      position: 12
    })
  })

  it('re-anchors clicks that resolve into empty paragraph runs', () => {
    const root = document.createElement('div')
    const bodyLayer = document.createElement('div')
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    root.append(bodyLayer)

    mockRect(bodyLayer, { top: 80, bottom: 520 })

    const resolve = jest.fn((position: number) => {
      if (position === 20) {
        return {
          parent: {
            type: { name: 'paragraph' },
            content: { size: 0 }
          },
          parentOffset: 0,
          nodeBefore: null,
          nodeAfter: null
        }
      }

      return {
        parent: {
          type: { name: 'paragraph' },
          content: { size: 4 }
        },
        parentOffset: 2,
        nodeBefore: {
          type: { name: 'text' },
          content: { size: 0 }
        },
        nodeAfter: {
          type: { name: 'text' },
          content: { size: 0 }
        }
      }
    })

    const view = {
      dom: root,
      posAtCoords: jest.fn(({ top }: { left: number; top: number }) => {
        if (top === 210) return { pos: 20, inside: -1 }
        return { pos: 22, inside: -1 }
      }),
      coordsAtPos: jest.fn((position: number) => {
        if (position === 20) return { left: 90, right: 90, top: 210, bottom: 230 }
        return { left: 145, right: 145, top: 212, bottom: 232 }
      }),
      state: {
        doc: {
          resolve
        }
      }
    } as any

    expect(resolvePaginationBodyClick(view, 140, 210)).toEqual({
      action: 'set',
      position: 22
    })
  })

  it('blocks clicks that land outside all page body bands', () => {
    const root = document.createElement('div')
    const bodyLayer = document.createElement('div')
    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    root.append(bodyLayer)

    mockRect(root, { top: 0, bottom: 900 })
    mockRect(bodyLayer, { top: 80, bottom: 520 })

    const view = {
      dom: root,
      posAtCoords: jest.fn(),
      coordsAtPos: jest.fn()
    } as any

    expect(resolvePaginationBodyClick(view, 120, 600)).toEqual({
      action: 'block'
    })
  })

  it('renders a real page body layer for each page break', () => {
    const options = createOptions({
      headerTopMargin: 12,
      footerBottomMargin: 16
    })
    const storage = createStorageFromOptions(options)
    const expectedBodyHeight = getPageLayoutHeights(
      storage.pageFormat,
      storage,
      options.headerHeight,
      options.footerHeight
    ).bodyHeight

    const pageBreak = createPageBreakElement({
      pageNumber: 1,
      totalPages: 2,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })

    const page = pageBreak.querySelector('.page') as HTMLElement | null
    const bodyLayer = pageBreak.querySelector('.rm-page-body-layer[data-rm-page-number="1"]') as HTMLElement | null

    expect(page?.dataset.rmPageNumber).toBe('1')
    expect(bodyLayer).not.toBeNull()
    expect(bodyLayer?.dataset.rmPageBody).toBe('true')
    expect(expectedBodyHeight).toBeGreaterThan(0)
  })

  it('ignores pagination helper widgets when measuring blank content', () => {
    const root = document.createElement('div')
    const paragraph = document.createElement('p')
    const wrapper = document.createElement('div')
    wrapper.dataset.rmPagination = 'true'

    const pageBreak = document.createElement('div')
    pageBreak.className = 'rm-page-break'
    const breaker = document.createElement('div')
    breaker.className = 'breaker'
    pageBreak.appendChild(breaker)
    wrapper.appendChild(pageBreak)

    const firstPageHeader = document.createElement('div')
    firstPageHeader.className = 'rm-first-page-header'

    root.append(paragraph, wrapper, firstPageHeader)

    Object.defineProperty(paragraph, 'offsetTop', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(paragraph, 'offsetHeight', {
      value: 24,
      configurable: true
    })
    Object.defineProperty(paragraph, 'clientHeight', {
      value: 24,
      configurable: true
    })
    Object.defineProperty(paragraph, 'scrollHeight', {
      value: 24,
      configurable: true
    })

    Object.defineProperty(breaker, 'offsetTop', {
      value: 900,
      configurable: true
    })
    Object.defineProperty(breaker, 'offsetHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(breaker, 'clientHeight', {
      value: 0,
      configurable: true
    })
    Object.defineProperty(breaker, 'scrollHeight', {
      value: 0,
      configurable: true
    })

    expect(calculatePageCount({ dom: root } as any, PAGE_FORMATS.A4, 40)).toBe(1)
  })

  it('clamps an effectively empty prose mirror document to a single page', () => {
    const root = document.createElement('div')

    const pageBreak = document.createElement('div')
    pageBreak.className = 'rm-page-break'
    const breaker = document.createElement('div')
    breaker.className = 'breaker'
    pageBreak.appendChild(breaker)

    const wrapper = document.createElement('div')
    wrapper.dataset.rmPagination = 'true'
    wrapper.appendChild(pageBreak)

    root.appendChild(wrapper)

    expect(
      calculatePageCount(
        {
          dom: root,
          state: {
            doc: {
              childCount: 1,
              firstChild: {
                type: { name: 'paragraph' },
                childCount: 0,
                textContent: ''
              }
            }
          }
        } as any,
        PAGE_FORMATS.A4,
        40
      )
    ).toBe(1)
  })

  it('shrinks body height as header and footer content grow', () => {
    const storage = createStorageFromOptions(
      createOptions({
        headerTopMargin: 12,
        footerBottomMargin: 18
      })
    )

    const compactLayout = getPageLayoutHeights(storage.pageFormat, storage, 20, 12)
    const expandedLayout = getPageLayoutHeights(storage.pageFormat, storage, 84, 46)

    expect(expandedLayout.bodyHeight).toBeLessThan(compactLayout.bodyHeight)
    expect(getPageSpacerHeight(storage.pageFormat, storage, 2, 84, 46)).toBe(expandedLayout.bodyHeight)
    expect(getPageSpacerHeight(storage.pageFormat, storage, 1, 84, 46)).toBe(
      expandedLayout.headerReserved + expandedLayout.bodyHeight
    )
  })

  it('reserves the larger of page margins or header and footer occupied space', () => {
    const storage = createStorageFromOptions(
      createOptions({
        headerTopMargin: 12,
        footerBottomMargin: 18
      })
    )

    const compactLayout = getPageLayoutHeights(storage.pageFormat, storage, 20, 12)
    const expandedLayout = getPageLayoutHeights(storage.pageFormat, storage, 84, 90)

    expect(compactLayout.headerReserved).toBe(80)
    expect(compactLayout.footerReserved).toBe(80)
    expect(expandedLayout.headerReserved).toBe(96)
    expect(expandedLayout.footerReserved).toBe(108)
  })

  it('increases page count when measured header and footer heights reduce usable body space', () => {
    const root = document.createElement('div')
    const paragraph = document.createElement('p')
    root.appendChild(paragraph)

    Object.defineProperty(paragraph, 'offsetTop', {
      value: 1500,
      configurable: true
    })
    Object.defineProperty(paragraph, 'offsetHeight', {
      value: 120,
      configurable: true
    })
    Object.defineProperty(paragraph, 'clientHeight', {
      value: 120,
      configurable: true
    })
    Object.defineProperty(paragraph, 'scrollHeight', {
      value: 120,
      configurable: true
    })

    const options = createOptions({
      headerTopMargin: 12,
      footerBottomMargin: 16
    })
    const storage = createStorageFromOptions(options)

    const baselinePageCount = calculatePageCount({ dom: root } as any, storage.pageFormat, options.pageGap)
    const reducedBodyPageCount = calculatePageCount({ dom: root } as any, storage.pageFormat, options.pageGap, {
      storage,
      headerHeights: new Map([[1, 84]]),
      footerHeights: new Map([[1, 54]]),
      defaultHeaderHeight: options.headerHeight,
      defaultFooterHeight: options.footerHeight
    })

    expect(reducedBodyPageCount).toBeGreaterThan(baselinePageCount)
  })

  it('does not cap measured header and footer heights', () => {
    const options = createOptions({
      headerTopMargin: 12,
      footerBottomMargin: 16
    })
    const storage = createStorageFromOptions(options)

    const layout = getPageLayoutHeights(storage.pageFormat, storage, 260, 180)

    expect(layout.measuredHeaderHeight).toBe(260)
    expect(layout.measuredFooterHeight).toBe(180)
    expect(layout.bodyHeight).toBe(232)
  })

  it('measures header and footer shell height from the rendered regions', () => {
    const root = document.createElement('div')
    const options = createOptions({
      headerTopMargin: 12,
      footerBottomMargin: 16
    })
    const storage = createStorageFromOptions(options)

    const firstPageHeader = createFirstPageHeader({
      totalPages: 1,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })
    const wrapper = createPaginationWrapper({
      totalPages: 1,
      pageFormat: storage.pageFormat,
      options,
      storage,
      extensions: [StarterKit]
    })

    root.append(firstPageHeader, wrapper)

    const headerShell = root.querySelector(
      '[data-rm-editor-type="header"][data-rm-page-number="1"] .rm-page-header'
    ) as HTMLElement | null
    const footerShell = root.querySelector(
      '[data-rm-editor-type="footer"][data-rm-page-number="1"] .rm-page-footer'
    ) as HTMLElement | null

    expect(headerShell).not.toBeNull()
    expect(footerShell).not.toBeNull()

    Object.defineProperty(headerShell as HTMLElement, 'scrollHeight', {
      value: 116,
      configurable: true
    })
    Object.defineProperty(footerShell as HTMLElement, 'scrollHeight', {
      value: 82,
      configurable: true
    })

    const measured = measureHeaderFooterContentHeights(root, 1, storage.pageFormat, storage)
    expect(measured.headerHeights.get(1)).toBe(116)
    expect(measured.footerHeights.get(1)).toBe(82)
  })

  it('measures empty footer placeholder geometry from rendered DOM content', () => {
    const root = document.createElement('div')
    const options = createOptions({
      footer: '',
      footerBottomMargin: 16
    })
    const storage = createStorageFromOptions(options)
    const originalCreateRange = document.createRange

    Object.defineProperty(document, 'createRange', {
      configurable: true,
      value: jest.fn(
        () =>
          ({
            selectNodeContents: jest.fn(),
            getBoundingClientRect: () =>
              ({
                x: 0,
                y: 0,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: 0,
                height: 0,
                toJSON: () => ({})
              }) as DOMRect
          }) as unknown as Range
      )
    })

    try {
      const wrapper = createPaginationWrapper({
        totalPages: 1,
        pageFormat: storage.pageFormat,
        options,
        storage,
        extensions: [StarterKit]
      })

      root.append(wrapper)

      const footerShell = root.querySelector(
        '[data-rm-editor-type="footer"][data-rm-page-number="1"] .rm-page-footer'
      ) as HTMLElement | null
      const footerContent = root.querySelector(
        '[data-rm-editor-type="footer"][data-rm-page-number="1"] .rm-page-footer-content'
      ) as HTMLElement | null
      const footerMeta = root.querySelector(
        '[data-rm-editor-type="footer"][data-rm-page-number="1"] .rm-page-region-meta'
      ) as HTMLElement | null
      const placeholder = footerContent?.querySelector('.rm-page-region-placeholder') as HTMLElement | null

      expect(footerShell).not.toBeNull()
      expect(footerMeta).not.toBeNull()
      expect(footerContent?.dataset.rmEmpty).toBe('true')
      expect(placeholder?.textContent).toBe('Footer')

      Object.defineProperty(footerShell as HTMLElement, 'scrollHeight', {
        value: 0,
        configurable: true
      })
      Object.defineProperty(footerShell as HTMLElement, 'clientHeight', {
        value: 0,
        configurable: true
      })
      Object.defineProperty(footerShell as HTMLElement, 'offsetHeight', {
        value: 0,
        configurable: true
      })

      mockRect(footerMeta as HTMLElement, {
        top: 20,
        bottom: 20,
        left: 0,
        right: 80
      })
      mockRect(footerContent as HTMLElement, {
        top: 20,
        bottom: 38,
        left: 0,
        right: 80
      })

      const measured = measureHeaderFooterContentHeights(root, 1, storage.pageFormat, storage)
      expect(measured.footerHeights.get(1)).toBe(18)
    } finally {
      Object.defineProperty(document, 'createRange', {
        configurable: true,
        value: originalCreateRange
      })
    }
  })
})

describe('Pages extension commands', () => {
  function createEditor(overrides: Partial<PagesOptions> = {}) {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const editor = new Editor({
      element,
      extensions: [StarterKit, Pages.configure(createOptions(overrides))],
      content: '<p>Hello world</p>'
    })

    return { editor, element }
  }

  it('updates page format and notifies listeners', () => {
    const onPageFormatChange = jest.fn()
    const { editor, element } = createEditor({ onPageFormatChange })

    expect(editor.storage.pages.pageFormat.name).toBe('Test')
    expect(editor.commands.setPageFormat('Letter')).toBe(true)
    expect(editor.storage.pages.pageFormat.name).toBe('Letter')
    expect(onPageFormatChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Letter' }))

    editor.destroy()
    element.remove()
  })

  it('batches pages option updates in a single command', () => {
    const { editor, element } = createEditor()

    expect(
      (
        editor.commands as typeof editor.commands & { setPagesOptions?: (updates: Record<string, unknown>) => boolean }
      ).setPagesOptions?.({
        differentFirstPage: true,
        header: '<p>Header</p>',
        footer: '<p>Footer</p>',
        headerFirstPage: '<p>First header</p>'
      })
    ).toBe(true)

    expect(editor.storage.pages.differentFirstPage).toBe(true)
    expect(editor.storage.pages.getPageCount()).toBeGreaterThanOrEqual(1)

    editor.destroy()
    element.remove()
  })

  it('opens header editor overlays and stores edited content on close', () => {
    const { editor, element } = createEditor({
      differentFirstPage: true,
      headerFirstPage: 'Cover title',
      uiLabels: {
        headerLabel: 'Header',
        footerLabel: 'Footer',
        doubleClickHint: 'Double-click to edit',
        doubleClickExitHint: 'Double-click outside to exit',
        doneLabel: 'Done'
      }
    })

    expect(editor.view.dom.querySelector('[data-rm-editor-type="header"][data-rm-page-number="1"]')).not.toBeNull()
    const hint = editor.view.dom.querySelector(
      '[data-rm-editor-type="header"][data-rm-page-number="1"] .rm-page-region-hint'
    ) as HTMLElement | null

    expect(hint?.textContent).toBe('Double-click to edit')
    expect(editor.commands.openHeaderEditor({ pageNumber: 1 })).toBe(true)
    expect(editor.storage.pages.activeEditorType).toBe('header')
    expect(editor.storage.pages.activePageNumber).toBe(1)
    expect(hint?.textContent).toBe('Double-click outside to exit')

    editor.storage.pages.activeEditor?.commands.setContent('<p>Edited header</p>')
    expect(editor.commands.closeHeaderFooterEditors()).toBe(true)

    expect(editor.storage.pages.activeEditor).toBeNull()
    expect(editor.storage.pages.headerFirstPageHTML).toContain('Edited header')
    expect(hint?.textContent).toBe('Double-click to edit')

    editor.destroy()
    element.remove()
  })

  it('keeps pagination widgets visible while header editor is active', () => {
    const { editor, element } = createEditor({
      differentFirstPage: true,
      headerFirstPage: 'Cover title'
    })

    expect(editor.view.dom.querySelector('[data-rm-pagination]')).not.toBeNull()
    expect(editor.commands.openHeaderEditor({ pageNumber: 1 })).toBe(true)

    expect(editor.view.dom.querySelector('[data-rm-pagination]')).not.toBeNull()
    expect(editor.view.dom.querySelector('.rm-page-overlay')).not.toBeNull()

    editor.destroy()
    element.remove()
  })

  it('does not sync stored header content until the editor actually changes', () => {
    const { editor, element } = createEditor({
      differentFirstPage: true,
      headerFirstPage: 'Cover title'
    })

    expect(editor.storage.pages.headerFirstPageHTML).toBeNull()
    expect(editor.commands.openHeaderEditor({ pageNumber: 1 })).toBe(true)
    expect(editor.storage.pages.headerFirstPageHTML).toBeNull()

    editor.storage.pages.activeEditor?.commands.setContent('<p>Edited header</p>')

    expect(editor.storage.pages.headerFirstPageHTML).toContain('Edited header')

    editor.destroy()
    element.remove()
  })

  it('places the initial header caret from the double-click position when coordinates resolve', () => {
    const posAtCoordsSpy = jest.spyOn(EditorView.prototype, 'posAtCoords').mockReturnValue({
      pos: 1,
      inside: -1
    })
    const { editor, element } = createEditor({
      differentFirstPage: true,
      headerFirstPage: 'Cover title'
    })

    const region = editor.view.dom.querySelector(
      '[data-rm-editor-type="header"][data-rm-page-number="1"]'
    ) as HTMLElement | null

    expect(region).not.toBeNull()
    region?.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 48
      })
    )

    expect(editor.storage.pages.activeEditorType).toBe('header')
    expect(editor.storage.pages.activeEditor?.state.selection.from).toBe(1)

    posAtCoordsSpy.mockRestore()
    editor.destroy()
    element.remove()
  })

  it('keeps header editor active after content changes', () => {
    const { editor, element } = createEditor({
      differentFirstPage: true,
      headerFirstPage: 'Cover title'
    })

    expect(editor.commands.openHeaderEditor({ pageNumber: 1 })).toBe(true)
    expect(editor.storage.pages.activeEditorType).toBe('header')

    editor.storage.pages.activeEditor?.commands.setContent('<p>Edited header</p>')

    expect(editor.storage.pages.activeEditorType).toBe('header')
    expect(editor.storage.pages.activeEditor).not.toBeNull()

    editor.destroy()
    element.remove()
  })

  it('keeps header editor active on outside mousedown and closes on outside double-click', () => {
    const { editor, element } = createEditor({
      differentFirstPage: true,
      headerFirstPage: 'Cover title'
    })

    expect(editor.commands.openHeaderEditor({ pageNumber: 1 })).toBe(true)
    expect(editor.storage.pages.activeEditorType).toBe('header')

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(editor.storage.pages.activeEditorType).toBe('header')
    expect(editor.storage.pages.activeEditor).not.toBeNull()

    document.body.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))

    expect(editor.storage.pages.activeEditorType).toBeNull()

    editor.destroy()
    element.remove()
  })
})
