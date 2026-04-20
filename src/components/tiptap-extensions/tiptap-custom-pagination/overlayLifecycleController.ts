import type { ActivePaginationOverlayEditor } from './overlayReopen'
import type { PagesStorage } from './types'

type FrameScheduler = (callback: FrameRequestCallback) => number

export function resolveActivePaginationOverlayEditor(
  storage: Pick<PagesStorage, 'activeEditorType' | 'activePageNumber'>
) {
  if (
    (storage.activeEditorType === 'header' || storage.activeEditorType === 'footer') &&
    storage.activePageNumber != null
  ) {
    return {
      type: storage.activeEditorType,
      pageNumber: storage.activePageNumber
    } satisfies ActivePaginationOverlayEditor
  }

  return null
}

export function applyPaginationOverlayOptionRefresh(options: {
  activeEditor: ActivePaginationOverlayEditor | null
  overlayManager: {
    suppressNextCloseNotificationOnce: () => void
    updateAccentColor: () => void
  }
  closeOverlay: () => void
  applyUpdates: () => void
  refresh: () => boolean
  reopenActiveEditor: (activeEditor: ActivePaginationOverlayEditor) => void
  scheduleFrame?: FrameScheduler
}) {
  const scheduleFrame = options.scheduleFrame ?? requestAnimationFrame

  if (options.activeEditor) {
    options.overlayManager.suppressNextCloseNotificationOnce()
  }

  options.closeOverlay()
  options.applyUpdates()
  options.overlayManager.updateAccentColor()
  const refreshed = options.refresh()

  if (options.activeEditor) {
    scheduleFrame(() => {
      options.reopenActiveEditor(options.activeEditor as ActivePaginationOverlayEditor)
    })
  }

  return refreshed
}
