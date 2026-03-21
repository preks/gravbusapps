import type { Editor } from '@tiptap/core'
import { renderHeaderFooterDisplayContent } from '../dom'
import { HeaderFooterOverlayManager } from '../headerFooterOverlay'
import type { PagesOptions, PagesStorage } from '../types'

function createOptions(): PagesOptions {
  return {
    pageFormat: 'A4',
    headerHeight: 48,
    footerHeight: 48,
    pageGap: 24,
    header: '',
    footer: '',
    differentFirstPage: false,
    differentOddEven: false
  }
}

function createStorage(): PagesStorage {
  return {
    pageFormat: {
      name: 'A4',
      width: 794,
      height: 1123,
      margins: {
        top: 96,
        right: 96,
        bottom: 96,
        left: 96
      }
    },
    pageCount: 1,
    headerHeight: 48,
    footerHeight: 48,
    pageGap: 24,
    headerTopMargin: 48,
    footerBottomMargin: 48,
    differentFirstPage: false,
    differentOddEven: false,
    headerHTML: null,
    headerJSON: null,
    footerHTML: null,
    footerJSON: null,
    headerFirstPageHTML: null,
    headerFirstPageJSON: null,
    footerFirstPageHTML: null,
    footerFirstPageJSON: null,
    headerOddHTML: null,
    headerOddJSON: null,
    headerEvenHTML: null,
    headerEvenJSON: null,
    footerOddHTML: null,
    footerOddJSON: null,
    footerEvenHTML: null,
    footerEvenJSON: null,
    activeEditor: null,
    activeEditorType: null,
    activePageNumber: null,
    getPageCount: () => 1
  }
}

describe('HeaderFooterOverlayManager', () => {
  it('replaces passive header markup when opening inline edit mode', () => {
    const storage = createStorage()
    const options = createOptions()
    const hostEditor = {
      isEditable: true,
      setEditable: jest.fn(),
      commands: {}
    } as unknown as Editor

    const region = document.createElement('div')
    region.dataset.rmEditorType = 'header'
    region.dataset.rmPageNumber = '1'

    const contentHost = document.createElement('div')
    contentHost.className = 'rm-page-header-content'
    renderHeaderFooterDisplayContent(contentHost, '<p>Header text</p>', 'Header')
    region.appendChild(contentHost)
    document.body.appendChild(region)

    const manager = new HeaderFooterOverlayManager(
      hostEditor,
      () => options,
      () => storage
    )

    manager.open({
      type: 'header',
      pageNumber: 1,
      target: region,
      initialContent: '<p>Header text</p>',
      storage,
      options,
      extensions: [],
      onClose: jest.fn()
    })

    expect(contentHost.querySelectorAll('p')).toHaveLength(1)
    expect(contentHost.querySelector('.ProseMirror')).not.toBeNull()

    manager.close()
  })

  it('makes the active header shell editable while inline editing is open and restores it on close', () => {
    const storage = createStorage()
    const options = createOptions()
    const hostEditor = {
      isEditable: true,
      setEditable: jest.fn(),
      commands: {}
    } as unknown as Editor

    const region = document.createElement('div')
    region.className = 'rm-page-header-region'
    region.dataset.rmEditorType = 'header'
    region.dataset.rmPageNumber = '1'
    region.setAttribute('contenteditable', 'false')

    const shell = document.createElement('div')
    shell.className = 'rm-page-header'
    shell.setAttribute('contenteditable', 'false')

    const contentHost = document.createElement('div')
    contentHost.className = 'rm-page-header-content'
    contentHost.setAttribute('contenteditable', 'false')
    renderHeaderFooterDisplayContent(
      contentHost,
      '<table><tbody><tr><td>Header table</td></tr></tbody></table>',
      'Header'
    )

    shell.appendChild(contentHost)
    region.appendChild(shell)
    document.body.appendChild(region)

    const manager = new HeaderFooterOverlayManager(
      hostEditor,
      () => options,
      () => storage
    )

    manager.open({
      type: 'header',
      pageNumber: 1,
      target: region,
      initialContent: '<table><tbody><tr><td>Header table</td></tr></tbody></table>',
      storage,
      options,
      extensions: [],
      onClose: jest.fn()
    })

    expect(region.getAttribute('contenteditable')).toBe('true')
    expect(shell.getAttribute('contenteditable')).toBe('true')
    expect(contentHost.getAttribute('contenteditable')).toBe('true')

    manager.close()

    expect(region.getAttribute('contenteditable')).toBe('false')
    expect(shell.getAttribute('contenteditable')).toBe('false')
    expect(contentHost.getAttribute('contenteditable')).toBe('false')
  })
})
