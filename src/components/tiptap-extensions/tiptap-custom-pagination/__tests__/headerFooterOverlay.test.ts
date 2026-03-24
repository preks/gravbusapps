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
  afterEach(() => {
    document.body.innerHTML = ''
  })

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

  it('keeps outer header chrome non-editable and only enables the inline editor host', () => {
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

    expect(region.getAttribute('contenteditable')).toBe('false')
    expect(shell.getAttribute('contenteditable')).toBe('false')
    expect(contentHost.getAttribute('contenteditable')).toBe('true')

    manager.close()

    expect(region.getAttribute('contenteditable')).toBe('false')
    expect(shell.getAttribute('contenteditable')).toBe('false')
    expect(contentHost.getAttribute('contenteditable')).toBe('false')
  })

  it('switches to another region via host editor commands on double click', () => {
    const storage = createStorage()
    storage.pageCount = 3
    storage.getPageCount = () => 3
    const openFooterEditor = jest.fn()
    const closeHeaderFooterEditors = jest.fn(() => true)
    const hostEditor = {
      isEditable: true,
      setEditable: jest.fn(),
      commands: {
        closeHeaderFooterEditors,
        openFooterEditor
      }
    } as unknown as Editor

    const currentRegion = document.createElement('div')
    currentRegion.className = 'rm-page-header-region'
    currentRegion.dataset.rmEditorType = 'header'
    currentRegion.dataset.rmPageNumber = '1'
    const currentContentHost = document.createElement('div')
    currentContentHost.className = 'rm-page-header-content'
    renderHeaderFooterDisplayContent(currentContentHost, '<p>Header text</p>', 'Header')
    currentRegion.appendChild(currentContentHost)

    const nextRegion = document.createElement('div')
    nextRegion.className = 'rm-page-footer-region'
    nextRegion.dataset.rmEditorType = 'footer'
    nextRegion.dataset.rmPageNumber = '2'
    const nextContentHost = document.createElement('div')
    nextContentHost.className = 'rm-page-footer-content'
    renderHeaderFooterDisplayContent(nextContentHost, '<p>Footer text</p>', 'Footer')
    nextRegion.appendChild(nextContentHost)

    document.body.append(currentRegion, nextRegion)

    const manager = new HeaderFooterOverlayManager(
      hostEditor,
      () => createOptions(),
      () => storage
    )

    const animationFrames: FrameRequestCallback[] = []
    const requestAnimationFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      animationFrames.push(callback)
      return animationFrames.length
    })

    manager.open({
      type: 'header',
      pageNumber: 1,
      target: currentRegion,
      initialContent: '<p>Header text</p>',
      storage,
      options: createOptions(),
      extensions: [],
      onClose: jest.fn()
    })

    nextRegion.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 240
      })
    )

    expect(closeHeaderFooterEditors).toHaveBeenCalledTimes(1)
    expect(openFooterEditor).not.toHaveBeenCalled()

    const switchFrame = animationFrames.at(-1)
    expect(switchFrame).toBeDefined()
    switchFrame?.(0)

    expect(openFooterEditor).toHaveBeenCalledWith({
      pageNumber: 2,
      clickPosition: { clientX: 120, clientY: 240 }
    })

    requestAnimationFrameSpy.mockRestore()
    manager.close()
  })

  it('clears stale stored active editor state when no overlay is mounted', () => {
    const onActiveEditorChange = jest.fn()
    const storage = createStorage()
    storage.activeEditorType = 'header'
    storage.activePageNumber = 1
    const manager = new HeaderFooterOverlayManager(
      {
        isEditable: true,
        setEditable: jest.fn(),
        commands: {}
      } as unknown as Editor,
      () => ({
        ...createOptions(),
        onActiveEditorChange
      }),
      () => storage
    )
    const editorDom = document.createElement('div')
    document.body.appendChild(editorDom)

    expect(manager.recoverStaleOverlayState(editorDom)).toBe(true)
    expect(storage.activeEditor).toBeNull()
    expect(storage.activeEditorType).toBeNull()
    expect(storage.activePageNumber).toBeNull()
    expect(onActiveEditorChange).toHaveBeenCalledWith({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })
  })

  it('force-closes a detached overlay without triggering close refresh callbacks', () => {
    const storage = createStorage()
    const onActiveEditorChange = jest.fn()
    const onClose = jest.fn()
    const hostEditor = {
      isEditable: true,
      setEditable: jest.fn(),
      commands: {}
    } as unknown as Editor
    const root = document.createElement('div')
    const region = document.createElement('div')
    region.className = 'rm-page-header-region'
    region.dataset.rmEditorType = 'header'
    region.dataset.rmPageNumber = '1'
    const contentHost = document.createElement('div')
    contentHost.className = 'rm-page-header-content'
    renderHeaderFooterDisplayContent(contentHost, '<p>Header text</p>', 'Header')
    region.appendChild(contentHost)
    root.appendChild(region)
    document.body.appendChild(root)

    const manager = new HeaderFooterOverlayManager(
      hostEditor,
      () => ({
        ...createOptions(),
        onActiveEditorChange
      }),
      () => storage
    )

    manager.open({
      type: 'header',
      pageNumber: 1,
      target: region,
      initialContent: '<p>Header text</p>',
      storage,
      options: createOptions(),
      extensions: [],
      onClose
    })

    root.removeChild(region)

    expect(manager.recoverStaleOverlayState(root)).toBe(true)
    expect(storage.activeEditor).toBeNull()
    expect(storage.activeEditorType).toBeNull()
    expect(storage.activePageNumber).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    expect(onActiveEditorChange).toHaveBeenLastCalledWith({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })
  })
})
