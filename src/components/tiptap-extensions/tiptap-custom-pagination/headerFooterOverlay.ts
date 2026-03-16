import { Editor, type Extension } from '@tiptap/core'
import type { HeaderFooterEditorType, PagesHeaderFooter, PagesOptions, PagesStorage, PageVariantKey } from './types'
import { getHeaderFooterExtensions, resolveVariantForPage, setStoredVariantContent } from './utils'

function isEmptyHeaderFooterHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim() === ''
}

interface OpenOverlayParams {
  type: HeaderFooterEditorType
  pageNumber: number
  target: HTMLElement
  initialContent: PagesHeaderFooter
  storage: PagesStorage
  options: PagesOptions
  extensions: Extension[]
  onClose: () => void
  onUpdate?: () => void
}

interface ActiveOverlay {
  overlay: HTMLElement
  editor: Editor
  pageNumber: number
  type: HeaderFooterEditorType
  variant: PageVariantKey
  cleanup: () => void
  previousEditable: boolean
}

export class HeaderFooterOverlayManager {
  private activeOverlay: ActiveOverlay | null = null

  constructor(
    private readonly hostEditor: Editor,
    private readonly getOptions: () => PagesOptions,
    private readonly getStorage: () => PagesStorage
  ) {}

  open(params: OpenOverlayParams) {
    this.close()

    const { target, type, pageNumber, initialContent, storage, options } = params
    const overlay = document.createElement('div')
    const editorHost = document.createElement('div')
    const contentSelector = type === 'header' ? '.rm-page-header-content' : '.rm-page-footer-content'
    const visibleContent = target.querySelector(contentSelector) as HTMLElement | null
    const variant = resolveVariantForPage(pageNumber, options)
    const accentColor =
      type === 'header'
        ? (options.headerAccentColor ?? options.accentColor ?? '#6366f1')
        : (options.footerAccentColor ?? options.accentColor ?? '#6366f1')

    overlay.className = 'rm-page-overlay'
    overlay.dataset.rmOverlayType = type
    overlay.style.setProperty('--rm-overlay-accent', accentColor)
    editorHost.className = 'rm-page-overlay-editor'
    if (visibleContent) {
      const targetRect = target.getBoundingClientRect()
      const contentRect = visibleContent.getBoundingClientRect()
      const topInset = Math.max(0, contentRect.top - targetRect.top)
      const leftInset = Math.max(0, contentRect.left - targetRect.left)
      const rightInset = Math.max(0, targetRect.right - contentRect.right)
      const bottomInset = type === 'footer' ? Math.max(0, targetRect.bottom - contentRect.bottom) : 0

      overlay.style.top = `${topInset}px`
      overlay.style.left = `${leftInset}px`
      overlay.style.right = `${rightInset}px`
      overlay.style.bottom = `${bottomInset}px`
    }
    target.dataset.rmOverlayActive = 'true'
    overlay.append(editorHost)
    target.appendChild(overlay)

    const previousEditable = this.hostEditor.isEditable
    this.hostEditor.setEditable(false, false)

    const overlayEditor = new Editor({
      element: editorHost,
      extensions: getHeaderFooterExtensions(params.extensions),
      content: initialContent,
      editable: true
    })

    const syncOverlayContentToStorage = () => {
      const html = overlayEditor.getHTML()
      const json = overlayEditor.getJSON()

      setStoredVariantContent(storage, type, variant, {
        html,
        json
      })

      if (visibleContent) {
        visibleContent.innerHTML = html
        visibleContent.dataset.rmEmpty = isEmptyHeaderFooterHtml(html) ? 'true' : 'false'
      }

      params.onUpdate?.()
    }

    const notifyActiveEditorChange = () => {
      options.onActiveEditorChange?.({
        activeEditor: storage.activeEditor,
        activeEditorType: storage.activeEditorType,
        activePageNumber: storage.activePageNumber
      })
    }

    overlayEditor.on('update', syncOverlayContentToStorage)
    syncOverlayContentToStorage()

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (overlay.contains(event.target as Node)) return

      const shouldPreventClose =
        (type === 'header' ? options.onDblClickHeaderPreventClose : options.onDblClickFooterPreventClose)?.(event) ??
        options.onDblClickHeaderFooterPreventClose?.(event) ??
        false

      if (!shouldPreventClose) {
        const targetNode = event.target as Node | null
        this.close()
        if (targetNode && this.hostEditor.view.dom.contains(targetNode)) {
          requestAnimationFrame(() => {
            this.hostEditor.commands.focus()
          })
        }
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown, true)
    document.addEventListener('keydown', handleEscape, true)

    const cleanup = () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true)
      document.removeEventListener('keydown', handleEscape, true)
      overlayEditor.off('update', syncOverlayContentToStorage)
      overlayEditor.destroy()
      overlay.remove()
      delete target.dataset.rmOverlayActive
      this.hostEditor.setEditable(previousEditable, false)
      params.onClose()
    }

    this.activeOverlay = {
      overlay,
      editor: overlayEditor,
      pageNumber,
      type,
      variant,
      cleanup,
      previousEditable
    }

    storage.activeEditor = overlayEditor
    storage.activeEditorType = type
    storage.activePageNumber = pageNumber
    notifyActiveEditorChange()
    overlayEditor.commands.focus('end')
  }

  close() {
    if (!this.activeOverlay) return

    const activeOverlay = this.activeOverlay
    const storage = this.getStorage()
    setStoredVariantContent(storage, activeOverlay.type, activeOverlay.variant, {
      html: activeOverlay.editor.getHTML(),
      json: activeOverlay.editor.getJSON()
    })
    storage.activeEditor = null
    storage.activeEditorType = null
    storage.activePageNumber = null
    this.getOptions().onActiveEditorChange?.({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })

    this.activeOverlay = null
    activeOverlay.cleanup()
  }

  updateAccentColor() {
    if (!this.activeOverlay) return

    const options = this.getOptions()
    const color =
      this.activeOverlay.type === 'header'
        ? (options.headerAccentColor ?? options.accentColor ?? '#6366f1')
        : (options.footerAccentColor ?? options.accentColor ?? '#6366f1')

    this.activeOverlay.overlay.style.setProperty('--rm-overlay-accent', color)
  }
}
