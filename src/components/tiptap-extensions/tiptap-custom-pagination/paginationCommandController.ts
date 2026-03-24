import type { Editor } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'
import type { HeaderFooterOverlayManager } from './headerFooterOverlay'
import { openManagedPaginationOverlay } from './overlayOpenController'
import {
  findPaginationOverlayTarget,
  retryPaginationOverlayOpen,
  type ActivePaginationOverlayEditor
} from './overlayReopen'
import {
  measurePageCount,
  resolveCurrentKnownPageCount,
  type PaginationMeasuredHeights
} from './paginationPageCountPolicy'
import type { HeaderFooterEditorType, PagesOptions, PagesStorage } from './types'
import { getExistingPageCount, resolveDirectChildPaginationElement } from './utils'

type FrameScheduler = (callback: FrameRequestCallback) => number

interface WindowedRendererBridge {
  syncRootPresentation(options: { editorDom: HTMLElement; options: PagesOptions; storage: PagesStorage }): void
  refreshPresentation(options: { editorDom: HTMLElement; options: PagesOptions; storage: PagesStorage }): void
  hydratePageBreakShells(options: {
    editorDom: HTMLElement
    pageNumbers: number[]
    options: PagesOptions
    storage: PagesStorage
    onOpenEditor: (
      type: HeaderFooterEditorType,
      nextPageNumber: number,
      target: HTMLElement,
      clickPosition?: { clientX: number; clientY: number }
    ) => void
  }): boolean
}

interface PaginationViewportPageRange {
  startPage: number
  endPage: number
}

function resolveViewportFocusPageNumber(activeEditor: ActivePaginationOverlayEditor): number {
  if (activeEditor.type === 'header' && activeEditor.pageNumber > 1) {
    return activeEditor.pageNumber - 1
  }

  return activeEditor.pageNumber
}

function normalizeHydrationPageNumbers(pageNumbers: number[]): number[] {
  return Array.from(
    new Set(
      pageNumbers.flatMap(pageNumber => {
        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
          return []
        }

        return pageNumber > 1 ? [pageNumber - 1, pageNumber] : [pageNumber]
      })
    )
  ).sort((left, right) => left - right)
}

function resolvePaginationViewport(editorDom: HTMLElement): HTMLElement | null {
  const viewport = editorDom.closest('.document-editor-viewport')
  return viewport instanceof HTMLElement ? viewport : null
}

function resolveSnapshotPageBounds(editorDom: HTMLElement, pageNumber: number) {
  const selector = `[data-rm-page-number="${pageNumber}"][data-layout-body-top][data-layout-body-bottom]`
  const target = editorDom.querySelector(selector)
  if (!(target instanceof HTMLElement)) {
    return null
  }

  const top = Number(target.dataset.layoutBodyTop ?? '')
  const bottom = Number(target.dataset.layoutBodyBottom ?? '')
  const left = Number(target.dataset.layoutBodyLeft ?? '')
  const right = Number(target.dataset.layoutBodyRight ?? '')
  if (![top, bottom, left, right].every(Number.isFinite)) {
    return null
  }

  return {
    top,
    bottom,
    left,
    right
  }
}

function resolveFlowElementPageRange(flowEl: HTMLElement): PaginationViewportPageRange | null {
  if (flowEl.classList.contains('rm-page-break')) {
    const pageNumber = Number(flowEl.dataset.rmPageNumber ?? '')
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return null
    }

    return {
      startPage: pageNumber,
      endPage: pageNumber
    }
  }

  if (!flowEl.classList.contains('rm-page-spacer')) {
    return null
  }

  const startPage = Number(flowEl.dataset.rmPageRangeStart ?? '')
  const endPage = Number(flowEl.dataset.rmPageRangeEnd ?? '')
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
    return null
  }

  return { startPage, endPage }
}

function resolveFlowElementForPage(editorDom: HTMLElement, pageNumber: number): HTMLElement | null {
  const paginationRoot = resolveDirectChildPaginationElement(editorDom)
  if (!(paginationRoot instanceof HTMLElement)) {
    return null
  }

  for (let index = 0; index < paginationRoot.children.length; index += 1) {
    const child = paginationRoot.children.item(index)
    if (!(child instanceof HTMLElement)) {
      continue
    }

    const pageRange = resolveFlowElementPageRange(child)
    if (!pageRange) {
      continue
    }

    if (pageNumber >= pageRange.startPage && pageNumber <= pageRange.endPage) {
      return child
    }
  }

  return null
}

export function requestViewportPageFocus(editorDom: HTMLElement, pageNumber: number): boolean {
  const viewport = resolvePaginationViewport(editorDom)
  const snapshotPageBounds = resolveSnapshotPageBounds(editorDom, pageNumber)
  if (viewport instanceof HTMLElement && snapshotPageBounds) {
    const viewportRect = viewport.getBoundingClientRect()
    const pageCenter = (snapshotPageBounds.top + snapshotPageBounds.bottom) / 2
    const viewportCenter = (viewportRect.top + viewportRect.bottom) / 2
    viewport.scrollTop = Math.max(0, viewport.scrollTop + pageCenter - viewportCenter)
    viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
    return true
  }

  const flowEl = resolveFlowElementForPage(editorDom, pageNumber)
  if (!(viewport instanceof HTMLElement) || !(flowEl instanceof HTMLElement)) {
    return false
  }

  const viewportRect = viewport.getBoundingClientRect()
  const flowRect = flowEl.getBoundingClientRect()
  const pageRange = resolveFlowElementPageRange(flowEl)
  const pageCount = pageRange ? pageRange.endPage - pageRange.startPage + 1 : 1
  const pageOffsetRatio = pageRange && pageCount > 1 ? (pageNumber - pageRange.startPage + 0.5) / pageCount : 0.5
  const targetScrollTop =
    viewport.scrollTop +
    (flowRect.top - viewportRect.top) +
    flowRect.height * pageOffsetRatio -
    viewport.clientHeight / 2

  viewport.scrollTop = Math.max(0, targetScrollTop)
  viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
  return true
}

export function createPaginationCommandController(options: {
  getRuntimeOptions: (editor: Editor) => PagesOptions
  getMountedEditorView: (editor: Editor) => EditorView | null
  getOverlayManager: (editor: Editor) => HeaderFooterOverlayManager
  syncStorageFromOptions: (storage: PagesStorage, options: PagesOptions) => void
  syncEditorStorage: (editor: { storage: Record<string, unknown> }, storage: PagesStorage) => void
  clearGrowthSuppression: (editor: Editor) => void
  applyMeasuredPageHeightsToView: (
    view: EditorView,
    storage: PagesStorage,
    options: PagesOptions
  ) => PaginationMeasuredHeights
  windowedRenderer: WindowedRendererBridge
  refreshMeta: string
  refreshAndStabilizeMeta: string
  scheduleFrame?: FrameScheduler
}) {
  const scheduleFrame = options.scheduleFrame ?? requestAnimationFrame

  const dispatchRefreshCommand = (editor: Editor, shouldStabilize: boolean) => {
    const storage = editor.storage.pages
    const runtimeOptions = options.getRuntimeOptions(editor)
    options.syncStorageFromOptions(storage, runtimeOptions)
    options.syncEditorStorage(editor as unknown as { storage: Record<string, unknown> }, storage)
    const view = options.getMountedEditorView(editor)
    if (!view) return true

    options.clearGrowthSuppression(editor)
    options.windowedRenderer.syncRootPresentation({
      editorDom: view.dom,
      options: runtimeOptions,
      storage
    })

    const transaction = editor.state.tr.setMeta(options.refreshMeta, true)
    if (shouldStabilize) {
      transaction.setMeta(options.refreshAndStabilizeMeta, true)
    }

    view.dispatch(transaction)
    return true
  }

  const refresh = (editor: Editor) => dispatchRefreshCommand(editor, false)
  const refreshAndStabilize = (editor: Editor) => dispatchRefreshCommand(editor, true)

  const closeOverlay = (editor: Editor) => {
    options.getOverlayManager(editor).close()
  }

  const retryOpenEditorAfterRefresh = (
    editor: Editor,
    activeEditor: ActivePaginationOverlayEditor,
    clickPosition?: { clientX: number; clientY: number }
  ) => {
    refresh(editor)
    retryPaginationOverlayOpen({
      attemptsLeft: 1,
      scheduleFrame,
      attemptOpen: () => openEditorByType(editor, activeEditor.type, activeEditor.pageNumber, clickPosition, false)
    })
  }

  const retryOpenEditorAfterViewportShift = (
    editor: Editor,
    activeEditor: ActivePaginationOverlayEditor,
    clickPosition?: { clientX: number; clientY: number }
  ) => {
    const view = options.getMountedEditorView(editor)
    if (!view || !requestViewportPageFocus(view.dom, resolveViewportFocusPageNumber(activeEditor))) {
      return false
    }

    retryPaginationOverlayOpen({
      attemptsLeft: 1,
      scheduleFrame,
      attemptOpen: () => openEditorByType(editor, activeEditor.type, activeEditor.pageNumber, clickPosition, false)
    })

    scheduleFrame(() => {
      const mountedView = options.getMountedEditorView(editor)
      const target = mountedView
        ? findPaginationOverlayTarget(mountedView.dom, { type: activeEditor.type, pageNumber: activeEditor.pageNumber })
        : null
      if (target) {
        return
      }

      retryOpenEditorAfterRefresh(editor, activeEditor, clickPosition)
    })

    return true
  }

  const openEditorByType = (
    editor: Editor,
    type: HeaderFooterEditorType,
    pageNumber: number,
    clickPosition?: { clientX: number; clientY: number },
    allowRefreshRecovery = true
  ) => {
    const storage = editor.storage.pages
    const runtimeOptions = options.getRuntimeOptions(editor)
    const totalPages = storage.getPageCount()
    if (pageNumber < 1 || pageNumber > totalPages) return false
    const view = options.getMountedEditorView(editor)
    if (!view) return false

    const target = findPaginationOverlayTarget(view.dom, { type, pageNumber })
    if (!(target instanceof HTMLElement)) {
      if (!allowRefreshRecovery) {
        return false
      }

      if (retryOpenEditorAfterViewportShift(editor, { type, pageNumber }, clickPosition)) {
        return true
      }

      retryOpenEditorAfterRefresh(editor, { type, pageNumber }, clickPosition)
      return true
    }

    const overlayManager = options.getOverlayManager(editor)
    const activeEditor = { type, pageNumber } as const

    openManagedPaginationOverlay({
      overlayManager,
      storage,
      runtimeOptions,
      activeEditor,
      target,
      clickPosition,
      measure: () => {
        const mountedView = options.getMountedEditorView(editor)
        if (!mountedView) return null

        const measured = options.applyMeasuredPageHeightsToView(mountedView, storage, runtimeOptions)
        return {
          currentPageCount: resolveCurrentKnownPageCount(getExistingPageCount(mountedView), storage.pageCount),
          measuredPageCount: measurePageCount(mountedView, storage, runtimeOptions, measured),
          context: {
            editorDom: mountedView.dom
          }
        }
      },
      onSetStoredPageCount: pageCount => {
        storage.pageCount = pageCount
      },
      onClearGrowthSuppression: () => {
        options.clearGrowthSuppression(editor)
      },
      onCloseOverlay: () => {
        overlayManager.close()
      },
      onReopenOverlay: () => {
        scheduleFrame(() => {
          reopenActiveEditorAfterRefresh(editor, activeEditor)
        })
      },
      onRefreshPresentation: ({ editorDom }) => {
        options.windowedRenderer.refreshPresentation({
          editorDom,
          options: runtimeOptions,
          storage
        })
      },
      onClose: () => refresh(editor)
    })

    return true
  }

  const reopenActiveEditorAfterRefresh = (
    editor: Editor,
    activeEditor: ActivePaginationOverlayEditor,
    attemptsLeft = 2
  ) => {
    retryPaginationOverlayOpen({
      attemptsLeft,
      scheduleFrame,
      attemptOpen: () => openEditorByType(editor, activeEditor.type, activeEditor.pageNumber)
    })
  }

  const hydratePageBreakShells = (editor: Editor, pageNumbers: number[]) => {
    const view = options.getMountedEditorView(editor)
    if (!view) return false

    const storage = editor.storage.pages
    const runtimeOptions = options.getRuntimeOptions(editor)
    options.syncStorageFromOptions(storage, runtimeOptions)
    const normalizedPageNumbers = normalizeHydrationPageNumbers(pageNumbers)

    const didHydrate = options.windowedRenderer.hydratePageBreakShells({
      editorDom: view.dom,
      pageNumbers: normalizedPageNumbers,
      options: runtimeOptions,
      storage,
      onOpenEditor: (type, nextPageNumber, _target, clickPosition) => {
        openEditorByType(editor, type, nextPageNumber, clickPosition)
      }
    })

    if (didHydrate) {
      return true
    }

    refresh(editor)
    const refreshedView = options.getMountedEditorView(editor)
    if (!refreshedView) {
      return false
    }

    return options.windowedRenderer.hydratePageBreakShells({
      editorDom: refreshedView.dom,
      pageNumbers: normalizedPageNumbers,
      options: runtimeOptions,
      storage,
      onOpenEditor: (type, nextPageNumber, _target, clickPosition) => {
        openEditorByType(editor, type, nextPageNumber, clickPosition)
      }
    })
  }

  return {
    dispatchRefreshCommand,
    refresh,
    refreshAndStabilize,
    hydratePageBreakShells,
    closeOverlay,
    reopenActiveEditorAfterRefresh,
    openEditorByType
  }
}
