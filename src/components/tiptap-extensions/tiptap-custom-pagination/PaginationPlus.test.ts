import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { createPaginationWrapper } from './dom'
import { PAGE_FORMATS } from './constants'
import { Pages } from './PaginationPlus'
import type { PagesOptions } from './types'
import { calculatePageCount, createStorageFromOptions, resolveDisplayContent } from './utils'

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
