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

    const { target, type, pageNumber, clickPosition, initialContent, storage, options } = params
    const overlay = document.createElement('div')
    const overlayLayout = document.createElement('div')
    const editorHost = document.createElement('div')
    const contentSelector = type === 'header' ? '.rm-page-header-content' : '.rm-page-footer-content'
    const contentClass = type === 'header' ? 'rm-page-header-content' : 'rm-page-footer-content'
    const visibleContent = target.querySelector(contentSelector) as HTMLElement | null
    const layoutRoot = target.querySelector('[data-rm-page-number-layout="true"]') as HTMLElement | null
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
    editorHost.className = `rm-page-overlay-editor ${contentClass}`
    overlayLayout.className = 'rm-page-region-layout rm-page-overlay-layout'

    let geometrySyncFrame: number | null = null

    const syncOverlayLayoutMetadata = (sourceLayoutRoot: HTMLElement | null) => {
      delete overlayLayout.dataset.rmPageNumberActive
      delete overlayLayout.dataset.rmPageNumberAlign
      delete overlayLayout.dataset.rmPageNumberRegion
      delete overlayLayout.dataset.rmPageNumberOdd
      delete overlayLayout.dataset.rmPageNumberBelow

      if (!sourceLayoutRoot) return

      if (sourceLayoutRoot.dataset.rmPageNumberActive) {
        overlayLayout.dataset.rmPageNumberActive = sourceLayoutRoot.dataset.rmPageNumberActive
      }
      if (sourceLayoutRoot.dataset.rmPageNumberAlign) {
        overlayLayout.dataset.rmPageNumberAlign = sourceLayoutRoot.dataset.rmPageNumberAlign
      }
      if (sourceLayoutRoot.dataset.rmPageNumberRegion) {
        overlayLayout.dataset.rmPageNumberRegion = sourceLayoutRoot.dataset.rmPageNumberRegion
      }
      if (sourceLayoutRoot.dataset.rmPageNumberOdd) {
        overlayLayout.dataset.rmPageNumberOdd = sourceLayoutRoot.dataset.rmPageNumberOdd
      }
      if (sourceLayoutRoot.dataset.rmPageNumberBelow) {
        overlayLayout.dataset.rmPageNumberBelow = sourceLayoutRoot.dataset.rmPageNumberBelow
      }
    }

    const syncOverlayGeometry = () => {
      const liveLayoutRoot = target.querySelector('[data-rm-page-number-layout="true"]') as HTMLElement | null
      const liveVisibleContent = target.querySelector(contentSelector) as HTMLElement | null
      syncOverlayLayoutMetadata(liveLayoutRoot)

      if (liveLayoutRoot) {
        const targetRect = target.getBoundingClientRect()
        const layoutRect = liveLayoutRoot.getBoundingClientRect()
        overlayLayout.style.position = 'absolute'
        overlayLayout.style.top = `${Math.max(0, layoutRect.top - targetRect.top)}px`
        overlayLayout.style.left = `${Math.max(0, layoutRect.left - targetRect.left)}px`
        overlayLayout.style.right = `${Math.max(0, targetRect.right - layoutRect.right)}px`
        overlayLayout.style.bottom = `${Math.max(0, targetRect.bottom - layoutRect.bottom)}px`
        overlayLayout.style.display = 'flex'
        overlayLayout.style.flexDirection = 'column'
        overlayLayout.style.minHeight = '0'
        editorHost.style.position = 'relative'
        editorHost.style.top = ''
        editorHost.style.left = ''
        editorHost.style.right = ''
        editorHost.style.bottom = ''

        if (!overlay.contains(overlayLayout)) {
          overlay.append(overlayLayout)
        }
        if (!overlayLayout.contains(editorHost)) {
          overlayLayout.append(editorHost)
        }
        return
      }

      if (!liveVisibleContent) return

      const targetRect = target.getBoundingClientRect()
      const contentRect = liveVisibleContent.getBoundingClientRect()
      const topInset = Math.max(0, contentRect.top - targetRect.top)
      const leftInset = Math.max(0, contentRect.left - targetRect.left)
      const rightInset = Math.max(0, targetRect.right - contentRect.right)
      const bottomInset = Math.max(0, targetRect.bottom - contentRect.bottom)

      if (overlayLayout.parentElement === overlay) {
        overlayLayout.remove()
      }

      if (!overlay.contains(editorHost)) {
        overlay.append(editorHost)
      }

      editorHost.style.position = 'absolute'
      editorHost.style.top = `${topInset}px`
      editorHost.style.left = `${leftInset}px`
      editorHost.style.right = `${rightInset}px`
      editorHost.style.bottom = `${bottomInset}px`
    }

    const scheduleOverlayGeometrySync = () => {
      if (geometrySyncFrame !== null) {
        cancelAnimationFrame(geometrySyncFrame)
      }

      geometrySyncFrame = requestAnimationFrame(() => {
        geometrySyncFrame = null
        if (!overlay.isConnected || !target.isConnected) return
        layoutPageNumberSlots(target)
        syncOverlayGeometry()
      })
    }

    syncOverlayLayoutMetadata(layoutRoot)

    const stopPointerPropagation = (event: MouseEvent) => {
      event.stopPropagation()
    }
    overlay.addEventListener('mousedown', stopPointerPropagation, true)
    overlay.addEventListener('mouseup', stopPointerPropagation, true)
    overlay.addEventListener('click', stopPointerPropagation, true)
    overlay.addEventListener('dblclick', stopPointerPropagation)

    target.dataset.rmOverlayActive = 'true'
    if (layoutRoot) {
      overlayLayout.append(editorHost)
      overlay.append(overlayLayout)
    } else {
      overlay.append(editorHost)
    }
    target.appendChild(overlay)
    syncOverlayGeometry()
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
        layoutPageNumberSlots(target)
        syncOverlayGeometry()
      }

      params.onUpdate?.()
      scheduleOverlayGeometrySync()
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

    overlayEditor.on('update', syncOverlayContentToStorage)

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node | null
      if (targetNode && overlay.contains(targetNode)) return

      const targetElement = event.target instanceof Element ? event.target : null
      if (targetElement?.closest('[data-testid^="document-header-footer-settings-sidebar"]')) return
      if (targetElement?.closest('[data-testid^="document-page-numbers-dialog"]')) return
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

    const cleanup = () => {
      if (geometrySyncFrame !== null) {
        cancelAnimationFrame(geometrySyncFrame)
        geometrySyncFrame = null
      }
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
      scheduleOverlayGeometrySync()
      focusOverlayEditor(overlayEditor, clickPosition)
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

  suppressNextCloseNotificationOnce() {
    if (!this.activeOverlay) return
    this.suppressNextCloseNotification = true
  }
}

function focusOverlayEditor(editor: Editor, clickPosition?: { clientX: number; clientY: number }) {
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
