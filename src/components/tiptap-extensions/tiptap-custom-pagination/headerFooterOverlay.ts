import { Editor, type Extension } from '@tiptap/core'
import { handleTiptapTabKey } from '../tiptapTabKeyHandler'
import type { HeaderFooterEditorType, PagesHeaderFooter, PagesOptions, PagesStorage, PageVariantKey } from './types'
import { renderHeaderFooterDisplayContent } from './dom'
import { layoutPageNumberSlots } from './pageNumberSlotLayout'
import {
  getHeaderFooterExtensions,
  isEmptyHeaderFooterHtml,
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
  editor: Editor
  pageNumber: number
  type: HeaderFooterEditorType
  variant: PageVariantKey
  cleanup: (runOnClose?: boolean) => void
  /** Same as open params onClose; used when recoverStaleOverlayState runs cleanup(false) to still refresh host layout. */
  onCloseHandler: () => void
  previousEditable: boolean
  target: HTMLElement
  contentHost: HTMLElement
  shellEditableSnapshot: Array<{ element: HTMLElement; contentEditable: string | null }>
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

    const { target, type, pageNumber, clickPosition, initialContent, storage, options } = params
    const contentSelector = type === 'header' ? '.rm-page-header-content' : '.rm-page-footer-content'
    const contentHost = target.querySelector(contentSelector) as HTMLElement | null
    const hint = target.querySelector('.rm-page-region-hint') as HTMLElement | null
    const pageNumberSlot = target.querySelector('[data-rm-page-number-slot="true"]') as HTMLElement | null
    const variant = resolveVariantForPage(pageNumber, options)
    const accentColor =
      type === 'header'
        ? (options.headerAccentColor ?? options.accentColor ?? '#6366f1')
        : (options.footerAccentColor ?? options.accentColor ?? '#6366f1')
    const inactiveHint = options.uiLabels?.doubleClickHint ?? 'Double-click to edit'
    const activeHint = options.uiLabels?.doubleClickExitHint ?? 'Double-click outside to exit'
    const placeholderLabel =
      type === 'header' ? (options.uiLabels?.headerLabel ?? 'Header') : (options.uiLabels?.footerLabel ?? 'Footer')

    if (!(contentHost instanceof HTMLElement)) {
      return
    }

    const previousEditable = this.hostEditor.isEditable
    this.hostEditor.setEditable(false, false)
    const shellEditableSnapshot: Array<{ element: HTMLElement; contentEditable: string | null }> = []

    target.dataset.rmOverlayActive = 'true'
    target.dataset.rmHasVisibleContent = 'true'
    contentHost.classList.add('rm-page-inline-editor')
    contentHost.style.setProperty('--rm-overlay-accent', accentColor)
    contentHost.setAttribute('contenteditable', 'true')
    contentHost.replaceChildren()
    if (hint) {
      hint.textContent = activeHint
    }

    const overlayEditorRef: { current: Editor | null } = { current: null }
    const inlineEditor = new Editor({
      element: contentHost,
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
    overlayEditorRef.current = inlineEditor

    const htmlForVisibleRegion = (rawHtml: string) => {
      const total = Math.max(1, storage.pageCount)
      const documentTitle = this.getOptions().documentTitle ?? ''
      return replaceTemplateTokens(rawHtml, pageNumber, total, documentTitle, {
        style: this.getOptions().pageNumberNumeralStyle ?? 'decimal',
        startAt: this.getOptions().pageNumberStartAt ?? 1
      })
    }

    const syncStoredContent = () => {
      const html = inlineEditor.getHTML()
      const json = inlineEditor.getJSON()

      setStoredVariantContent(storage, type, variant, {
        html,
        json
      })

      target.dataset.rmHasVisibleContent = 'true'
      layoutPageNumberSlots(target)
      params.onUpdate?.()
    }

    const notifyActiveEditorChange = () => {
      options.onActiveEditorChange?.({
        activeEditor: storage.activeEditor,
        activeEditorType: storage.activeEditorType,
        activePageNumber: storage.activePageNumber
      })
    }

    const switchToRegion = (
      nextRegion: { element: HTMLElement; type: HeaderFooterEditorType; pageNumber: number },
      nextClickPosition?: { clientX: number; clientY: number }
    ) => {
      const commands = this.hostEditor.commands as {
        closeHeaderFooterEditors?: () => boolean
        openHeaderEditor?: (params: {
          pageNumber: number
          clickPosition?: { clientX: number; clientY: number }
        }) => boolean
        openFooterEditor?: (params: {
          pageNumber: number
          clickPosition?: { clientX: number; clientY: number }
        }) => boolean
      }

      this.suppressNextCloseNotification = true
      const closed = commands.closeHeaderFooterEditors?.() ?? false
      if (!closed) {
        this.suppressNextCloseNotification = false
      }

      requestAnimationFrame(() => {
        if (nextRegion.type === 'header') {
          commands.openHeaderEditor?.({ pageNumber: nextRegion.pageNumber, clickPosition: nextClickPosition })
        } else {
          commands.openFooterEditor?.({ pageNumber: nextRegion.pageNumber, clickPosition: nextClickPosition })
        }
      })
    }

    inlineEditor.on('update', syncStoredContent)

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node | null
      if (targetNode && target.contains(targetNode)) return

      const targetElement = event.target instanceof Element ? event.target : null
      if (targetElement?.closest('[data-testid^="document-header-footer-settings-sidebar"]')) return
      if (targetElement?.closest('[data-testid^="document-page-numbers-dialog"]')) return
      if (resolveHeaderFooterRegionTarget(event.target)) return

      event.preventDefault()
      event.stopPropagation()
    }

    const handleDocumentDoubleClick = (event: MouseEvent) => {
      if (target.contains(event.target as Node)) return

      const nextRegion = resolveHeaderFooterRegionTarget(event.target)
      if (nextRegion && nextRegion.element !== target) {
        event.preventDefault()
        event.stopPropagation()
        switchToRegion(nextRegion, {
          clientX: event.clientX,
          clientY: event.clientY
        })
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

    const cleanup = (runOnClose = true) => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true)
      document.removeEventListener('dblclick', handleDocumentDoubleClick, true)
      document.removeEventListener('keydown', handleEscape, true)
      inlineEditor.off('update', syncStoredContent)

      const finalHtml = inlineEditor.getHTML()
      inlineEditor.destroy()

      contentHost.classList.remove('rm-page-inline-editor')
      contentHost.style.removeProperty('--rm-overlay-accent')
      contentHost.setAttribute('contenteditable', 'false')
      shellEditableSnapshot.forEach(({ element, contentEditable }) => {
        if (contentEditable === null) {
          element.removeAttribute('contenteditable')
        } else {
          element.setAttribute('contenteditable', contentEditable)
        }
      })
      renderHeaderFooterDisplayContent(contentHost, htmlForVisibleRegion(finalHtml), placeholderLabel)

      const hasVisibleRegionContent =
        !isEmptyHeaderFooterHtml(htmlForVisibleRegion(finalHtml)) || pageNumberSlot !== null
      target.dataset.rmHasVisibleContent = hasVisibleRegionContent ? 'true' : 'false'
      delete target.dataset.rmOverlayActive

      if (hint) {
        hint.textContent = inactiveHint
      }

      requestAnimationFrame(() => layoutPageNumberSlots(target))
      this.hostEditor.setEditable(previousEditable, false)
      if (runOnClose) {
        params.onClose()
      }
    }

    this.activeOverlay = {
      editor: inlineEditor,
      pageNumber,
      type,
      variant,
      cleanup,
      onCloseHandler: params.onClose,
      previousEditable,
      target,
      contentHost,
      shellEditableSnapshot
    }

    storage.activeEditor = inlineEditor
    storage.activeEditorType = type
    storage.activePageNumber = pageNumber
    notifyActiveEditorChange()
    requestAnimationFrame(() => {
      if (this.activeOverlay?.editor !== inlineEditor) return
      layoutPageNumberSlots(target)
      focusEditor(inlineEditor, clickPosition)
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

  recoverStaleOverlayState(editorDom: HTMLElement) {
    const storage = this.getStorage()
    const hasStoredActiveEditor =
      (storage.activeEditorType === 'header' || storage.activeEditorType === 'footer') &&
      storage.activePageNumber != null

    if (!this.activeOverlay) {
      if (!hasStoredActiveEditor) {
        return false
      }

      storage.activeEditor = null
      storage.activeEditorType = null
      storage.activePageNumber = null
      this.suppressNextCloseNotification = false
      this.getOptions().onActiveEditorChange?.({
        activeEditor: null,
        activeEditorType: null,
        activePageNumber: null
      })
      return true
    }

    const { target, contentHost } = this.activeOverlay
    const isOverlayStillMounted =
      target.isConnected &&
      contentHost.isConnected &&
      editorDom.contains(target) &&
      target.dataset.rmOverlayActive === 'true' &&
      contentHost.classList.contains('rm-page-inline-editor')

    if (isOverlayStillMounted) {
      return false
    }

    const activeOverlay = this.activeOverlay
    storage.activeEditor = null
    storage.activeEditorType = null
    storage.activePageNumber = null
    this.suppressNextCloseNotification = false
    this.activeOverlay = null
    activeOverlay.cleanup(false)
    activeOverlay.onCloseHandler()
    this.getOptions().onActiveEditorChange?.({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })
    return true
  }

  updateAccentColor() {
    if (!this.activeOverlay) return

    const options = this.getOptions()
    const color =
      this.activeOverlay.type === 'header'
        ? (options.headerAccentColor ?? options.accentColor ?? '#6366f1')
        : (options.footerAccentColor ?? options.accentColor ?? '#6366f1')

    this.activeOverlay.contentHost.style.setProperty('--rm-overlay-accent', color)
  }

  suppressNextCloseNotificationOnce() {
    if (!this.activeOverlay) return
    this.suppressNextCloseNotification = true
  }
}

function focusEditor(editor: Editor, clickPosition?: { clientX: number; clientY: number }) {
  const position = resolveEditorPositionFromClick(editor, clickPosition)
  editor.commands.focus(position ?? 'end')
}

function resolveEditorPositionFromClick(editor: Editor, clickPosition?: { clientX: number; clientY: number }) {
  if (!clickPosition) return null

  let resolvedLeft = clickPosition.clientX
  let resolvedTop = clickPosition.clientY
  const editorRect = editor.view.dom.getBoundingClientRect()

  if (editorRect.width > 0 && editorRect.height > 0) {
    resolvedLeft = Math.min(
      Math.max(resolvedLeft, editorRect.left + 1),
      Math.max(editorRect.left + 1, editorRect.right - 1)
    )
    resolvedTop = Math.min(
      Math.max(resolvedTop, editorRect.top + 1),
      Math.max(editorRect.top + 1, editorRect.bottom - 1)
    )
  }

  try {
    const positionAtCoords = editor.view.posAtCoords({
      left: resolvedLeft,
      top: resolvedTop
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
    const caretPosition = ownerDocument.caretPositionFromPoint?.(resolvedLeft, resolvedTop)
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
