import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { createFirstPageHeader, createPaginationWrapper } from './dom'
import { PAGE_FORMATS } from './constants'
import { Pages } from './PaginationPlus'
import type { PagesOptions } from './types'
import {
  calculatePageCount,
  createStorageFromOptions,
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

  it('increases page count when measured header and footer heights reduce usable body space', () => {
    const root = document.createElement('div')
    const paragraph = document.createElement('p')
    root.appendChild(paragraph)

    Object.defineProperty(paragraph, 'offsetTop', {
      value: 900,
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
    expect(layout.bodyHeight).toBe(72)
  })

  it('measures header and footer content from the rendered regions', () => {
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

    const headerContent = root.querySelector(
      '[data-rm-editor-type="header"][data-rm-page-number="1"] .rm-page-header-content'
    ) as HTMLElement | null
    const footerContent = root.querySelector(
      '[data-rm-editor-type="footer"][data-rm-page-number="1"] .rm-page-footer-content'
    ) as HTMLElement | null

    expect(headerContent).not.toBeNull()
    expect(footerContent).not.toBeNull()

    Object.defineProperty(headerContent as HTMLElement, 'scrollHeight', {
      value: 88,
      configurable: true
    })
    Object.defineProperty(footerContent as HTMLElement, 'scrollHeight', {
      value: 54,
      configurable: true
    })

    const measured = measureHeaderFooterContentHeights(root, 1, storage.pageFormat, storage)
    expect(measured.headerHeights.get(1)).toBe(88)
    expect(measured.footerHeights.get(1)).toBe(54)
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
      headerFirstPage: 'Cover title'
    })

    expect(editor.view.dom.querySelector('[data-rm-editor-type="header"][data-rm-page-number="1"]')).not.toBeNull()
    expect(editor.commands.openHeaderEditor({ pageNumber: 1 })).toBe(true)
    expect(editor.storage.pages.activeEditorType).toBe('header')
    expect(editor.storage.pages.activePageNumber).toBe(1)

    editor.storage.pages.activeEditor?.commands.setContent('<p>Edited header</p>')
    expect(editor.commands.closeHeaderFooterEditors()).toBe(true)

    expect(editor.storage.pages.activeEditor).toBeNull()
    expect(editor.storage.pages.headerFirstPageHTML).toContain('Edited header')

    editor.destroy()
    element.remove()
  })
})
