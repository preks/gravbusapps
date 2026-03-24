import type { HeaderFooterOverlayManager } from './headerFooterOverlay'
import type { ActivePaginationOverlayEditor } from './overlayReopen'
import { handleOverlayPaginationContentUpdate } from './overlayPaginationUpdate'
import type { PagesOptions, PagesStorage } from './types'
import { getHeaderFooterExtensions, getInitialEditorContent } from './utils'

interface PaginationOverlayTargetContext {
  editorDom: HTMLElement
}

interface PaginationOverlayMeasurementResult<TContext extends PaginationOverlayTargetContext> {
  currentPageCount: number
  measuredPageCount: number
  context: TContext
}

export function openPaginationOverlay(options: {
  overlayManager: HeaderFooterOverlayManager
  storage: PagesStorage
  runtimeOptions: PagesOptions
  activeEditor: ActivePaginationOverlayEditor
  target: HTMLElement
  clickPosition?: { clientX: number; clientY: number }
  onUpdate: () => void
  onClose: () => void
}) {
  const { overlayManager, storage, runtimeOptions, activeEditor, target, clickPosition, onUpdate, onClose } = options

  overlayManager.open({
    type: activeEditor.type,
    pageNumber: activeEditor.pageNumber,
    target,
    clickPosition,
    initialContent: getInitialEditorContent(
      storage,
      runtimeOptions,
      activeEditor.type,
      activeEditor.pageNumber,
      storage.getPageCount()
    ),
    storage,
    options: runtimeOptions,
    extensions: getHeaderFooterExtensions(runtimeOptions.headerFooterExtensions),
    onUpdate,
    onClose
  })
}

export function openManagedPaginationOverlay<TContext extends PaginationOverlayTargetContext>(options: {
  overlayManager: HeaderFooterOverlayManager
  storage: PagesStorage
  runtimeOptions: PagesOptions
  activeEditor: ActivePaginationOverlayEditor
  target: HTMLElement
  clickPosition?: { clientX: number; clientY: number }
  measure: () => PaginationOverlayMeasurementResult<TContext> | null
  onMeasured?: (context: TContext) => void
  onSetStoredPageCount: (pageCount: number) => void
  onClearGrowthSuppression: () => void
  onCloseOverlay: () => void
  onReopenOverlay: () => void
  onRefreshPresentation: (context: TContext) => void
  onClose: () => void
}) {
  openPaginationOverlay({
    overlayManager: options.overlayManager,
    storage: options.storage,
    runtimeOptions: options.runtimeOptions,
    activeEditor: options.activeEditor,
    target: options.target,
    clickPosition: options.clickPosition,
    onUpdate: () => {
      handleOverlayPaginationContentUpdate({
        measure: options.measure,
        onMeasured: options.onMeasured,
        onSetStoredPageCount: options.onSetStoredPageCount,
        onClearGrowthSuppression: options.onClearGrowthSuppression,
        onCloseOverlay: options.onCloseOverlay,
        onReopenOverlay: options.onReopenOverlay,
        onRefreshPresentation: options.onRefreshPresentation
      })
    },
    onClose: options.onClose
  })
}
