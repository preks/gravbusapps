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
import { getExistingPageCount } from './utils'

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
    const storage = editor.storage.pages as PagesStorage
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

  const openEditorByType = (
    editor: Editor,
    type: HeaderFooterEditorType,
    pageNumber: number,
    clickPosition?: { clientX: number; clientY: number }
  ) => {
    const storage = editor.storage.pages as PagesStorage
    const runtimeOptions = options.getRuntimeOptions(editor)
    const totalPages = storage.getPageCount()
    if (pageNumber < 1 || pageNumber > totalPages) return false
    const view = options.getMountedEditorView(editor)
    if (!view) return false

    const target = findPaginationOverlayTarget(view.dom, { type, pageNumber })
    if (!(target instanceof HTMLElement)) return false

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

    const storage = editor.storage.pages as PagesStorage
    const runtimeOptions = options.getRuntimeOptions(editor)
    options.syncStorageFromOptions(storage, runtimeOptions)

    return options.windowedRenderer.hydratePageBreakShells({
      editorDom: view.dom,
      pageNumbers,
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
