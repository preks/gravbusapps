import type { HeaderFooterEditorType } from './types'

export function applyPaginationOptionRefresh(options: {
  shouldCloseOverlay?: boolean
  closeOverlay: () => void
  applyUpdates: () => void
  refresh: () => boolean
}) {
  if (options.shouldCloseOverlay) {
    options.closeOverlay()
  }

  options.applyUpdates()
  return options.refresh()
}

export function closePaginationOverlayAndRefresh(options: {
  activeEditorType: HeaderFooterEditorType | null
  requiredActiveEditorType?: HeaderFooterEditorType
  closeOverlay: () => void
  refresh: () => boolean
}) {
  if (options.requiredActiveEditorType && options.activeEditorType !== options.requiredActiveEditorType) {
    return false
  }

  options.closeOverlay()
  return options.refresh()
}

export function updatePaginationOverlayAccentColor(options: {
  applyAccentColor: () => void
  updateOverlayAccentColor: () => void
}) {
  options.applyAccentColor()
  options.updateOverlayAccentColor()
  return true
}
