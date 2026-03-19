import { Editor, type Extension } from '@tiptap/core'
import { handleTiptapTabKey } from '../tiptapTabKeyHandler'
import type { HeaderFooterEditorType, PagesHeaderFooter, PagesOptions, PagesStorage, PageVariantKey } from './types'
import { renderHeaderFooterDisplayContent } from './dom'
import { layoutPageNumberSlots } from './pageNumberSlotLayout'
import {
  getHeaderFooterExtensions,
  replaceTemplateTokens,
  resolveVariantForPage,
  setStoredVariantContent
} from './utils'

interface OpenOverlayParams {
  type: HeaderFooterEditorType
  pageNumber: number
  target: HTMLElement
  clickPosition?: { clientX: number; clientY: number }
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
  private suppressNextCloseNotification = false

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
    const hint = target.querySelector('.rm-page-region-hint') as HTMLElement | null
    const variant = resolveVariantForPage(pageNumber, options)
    const accentColor =
      type === 'header'
        ? (options.headerAccentColor ?? options.accentColor ?? '#6366f1')
        : (options.footerAccentColor ?? options.accentColor ?? '#6366f1')
    const inactiveHint = options.uiLabels?.doubleClickHint ?? 'Double-click to edit'
    const activeHint = options.uiLabels?.doubleClickExitHint ?? 'Double-click outside to exit'
    const placeholderLabel =
      type === 'header' ? (options.uiLabels?.headerLabel ?? 'Header') : (options.uiLabels?.footerLabel ?? 'Footer')

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
      const bottomInset = Math.max(0, targetRect.bottom - contentRect.bottom)

      overlay.style.top = `${topInset}px`
      overlay.style.left = `${leftInset}px`
      overlay.style.right = `${rightInset}px`
      overlay.style.bottom = `${bottomInset}px`
    }

    const stopPointerPropagation = (event: MouseEvent) => {
      event.stopPropagation()
    }
    overlay.addEventListener('mousedown', stopPointerPropagation, true)
    overlay.addEventListener('mouseup', stopPointerPropagation, true)
    overlay.addEventListener('click', stopPointerPropagation, true)
    overlay.addEventListener('dblclick', stopPointerPropagation)

    target.dataset.rmOverlayActive = 'true'
    overlay.append(editorHost)
    target.appendChild(overlay)
    if (hint) {
      hint.textContent = activeHint
    }

    const previousEditable = this.hostEditor.isEditable
    this.hostEditor.setEditable(false, false)

    const overlayEditorRef: { current: Editor | null } = { current: null }
    const overlayEditor = new Editor({
      element: editorHost,
      extensions: getHeaderFooterExtensions(params.extensions),
      content: initialContent,
      editable: true,
      parseOptions: {
        preserveWhitespace: 'full'
      },
      editorProps: {
        handleKeyDown(_view, event) {
          return handleTiptapTabKey(event, overlayEditorRef.current)
        }
      }
    })
    overlayEditorRef.current = overlayEditor

    const htmlForVisibleRegion = (rawHtml: string) => {
      const total = Math.max(1, storage.pageCount)
      const documentTitle = this.getOptions().documentTitle ?? ''
      return replaceTemplateTokens(rawHtml, pageNumber, total, documentTitle, {
        style: this.getOptions().pageNumberNumeralStyle ?? 'decimal',
        startAt: this.getOptions().pageNumberStartAt ?? 1
      })
    }

    const syncOverlayContentToStorage = () => {
      const html = overlayEditor.getHTML()
      const json = overlayEditor.getJSON()

      setStoredVariantContent(storage, type, variant, {
        html,
        json
      })

      if (visibleContent) {
        renderHeaderFooterDisplayContent(visibleContent, htmlForVisibleRegion(html), placeholderLabel)
        requestAnimationFrame(() => layoutPageNumberSlots(target))
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

    const switchToRegion = (nextRegion: { element: HTMLElement; type: HeaderFooterEditorType; pageNumber: number }) => {
      const commands = this.hostEditor.commands as {
        closeHeaderFooterEditors?: () => boolean
        openHeaderEditor?: (params: { pageNumber: number }) => boolean
        openFooterEditor?: (params: { pageNumber: number }) => boolean
      }

      this.suppressNextCloseNotification = true
      const closed = commands.closeHeaderFooterEditors?.() ?? false
      if (!closed) {
        this.suppressNextCloseNotification = false
      }

      requestAnimationFrame(() => {
        if (nextRegion.type === 'header') {
          commands.openHeaderEditor?.({ pageNumber: nextRegion.pageNumber })
        } else {
          commands.openFooterEditor?.({ pageNumber: nextRegion.pageNumber })
        }
      })
    }

    overlayEditor.on('update', syncOverlayContentToStorage)

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node | null
      if (targetNode && overlay.contains(targetNode)) return

      const targetElement = event.target instanceof Element ? event.target : null
      if (targetElement?.closest('[data-testid="document-header-footer-settings-sidebar"]')) return
      if (resolveHeaderFooterRegionTarget(event.target)) return

      event.preventDefault()
      event.stopPropagation()
    }

    const handleDocumentDoubleClick = (event: MouseEvent) => {
      if (overlay.contains(event.target as Node)) return

      const nextRegion = resolveHeaderFooterRegionTarget(event.target)
      if (nextRegion && nextRegion.element !== target) {
        event.preventDefault()
        event.stopPropagation()
        switchToRegion(nextRegion)
        return
      }

      const shouldPreventClose =
        (type === 'header' ? options.onDblClickHeaderPreventClose : options.onDblClickFooterPreventClose)?.(event) ??
        options.onDblClickHeaderFooterPreventClose?.(event) ??
        false

      if (!shouldPreventClose) {
        event.preventDefault()
        event.stopPropagation()
        ;(this.hostEditor.commands as { closeHeaderFooterEditors?: () => boolean }).closeHeaderFooterEditors?.()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown, true)
    document.addEventListener('dblclick', handleDocumentDoubleClick, true)
    document.addEventListener('keydown', handleEscape, true)

    const cleanup = () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true)
      document.removeEventListener('dblclick', handleDocumentDoubleClick, true)
      document.removeEventListener('keydown', handleEscape, true)
      overlay.removeEventListener('mousedown', stopPointerPropagation, true)
      overlay.removeEventListener('mouseup', stopPointerPropagation, true)
      overlay.removeEventListener('click', stopPointerPropagation, true)
      overlay.removeEventListener('dblclick', stopPointerPropagation)
      overlayEditor.off('update', syncOverlayContentToStorage)
      const finalHtml = overlayEditor.getHTML()
      overlayEditor.destroy()
      if (visibleContent) {
        renderHeaderFooterDisplayContent(visibleContent, htmlForVisibleRegion(finalHtml), placeholderLabel)
        requestAnimationFrame(() => layoutPageNumberSlots(target))
      }
      overlay.remove()
      delete target.dataset.rmOverlayActive
      if (hint) {
        hint.textContent = inactiveHint
      }
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
    requestAnimationFrame(() => {
      if (this.activeOverlay?.editor !== overlayEditor) return
      focusOverlayEditor(overlayEditor)
    })
  }

  close() {
    if (!this.activeOverlay) return

    const activeOverlay = this.activeOverlay
    const storage = this.getStorage()
    const suppressNotification = this.suppressNextCloseNotification
    this.suppressNextCloseNotification = false
    setStoredVariantContent(storage, activeOverlay.type, activeOverlay.variant, {
      html: activeOverlay.editor.getHTML(),
      json: activeOverlay.editor.getJSON()
    })
    storage.activeEditor = null
    storage.activeEditorType = null
    storage.activePageNumber = null
    if (!suppressNotification) {
      this.getOptions().onActiveEditorChange?.({
        activeEditor: null,
        activeEditorType: null,
        activePageNumber: null
      })
    }

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

function focusOverlayEditor(editor: Editor, clickPosition?: { clientX: number; clientY: number }) {
  const position = resolveEditorPositionFromClick(editor, clickPosition)
  editor.commands.focus(position ?? 'end')
}

function resolveEditorPositionFromClick(editor: Editor, clickPosition?: { clientX: number; clientY: number }) {
  if (!clickPosition) return null

  try {
    const positionAtCoords = editor.view.posAtCoords({
      left: clickPosition.clientX,
      top: clickPosition.clientY
    })
    if (positionAtCoords?.pos != null) {
      return positionAtCoords.pos
    }
  } catch {
    // Fall through to DOM-based caret resolution when ProseMirror cannot map the coordinates.
  }

  const ownerDocument = editor.view.dom.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }

  try {
    const caretPosition = ownerDocument.caretPositionFromPoint?.(clickPosition.clientX, clickPosition.clientY)
    if (caretPosition?.offsetNode) {
      return editor.view.posAtDOM(caretPosition.offsetNode, caretPosition.offset)
    }
  } catch {
    // Ignore and continue to the Range fallback.
  }

  return null
}

function resolveHeaderFooterRegionTarget(target: EventTarget | null): {
  element: HTMLElement
  type: HeaderFooterEditorType
  pageNumber: number
} | null {
  if (!(target instanceof Element)) return null

  const region = target.closest('[data-rm-editor-type][data-rm-page-number]') as HTMLElement | null
  if (!(region instanceof HTMLElement)) return null

  const type = region.dataset.rmEditorType
  const pageNumber = Number.parseInt(region.dataset.rmPageNumber ?? '', 10)
  if ((type !== 'header' && type !== 'footer') || !Number.isFinite(pageNumber) || pageNumber < 1) {
    return null
  }

  return {
    element: region,
    type,
    pageNumber
  }
}
