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

  it('renders header and footer reserved spacing in the shell styles', () => {
    ensurePagesStyles(document)

    const style = document.head.querySelector('[data-rm-pages-style]') as HTMLStyleElement | null

    expect(style?.textContent).toContain('user-select: none;')
    expect(style?.textContent).toContain('pointer-events: none;')
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
