import type { PagesOptions, PagesOptionUpdates, PagesStorage } from './types'
import { resolvePageFormat } from './utils'

export function applyPaginationOptionUpdates(options: {
  updates: PagesOptionUpdates
  runtimeOptions: PagesOptions
  storage: PagesStorage
  onSyncEditorStorage?: () => void
}) {
  const { updates, runtimeOptions, storage, onSyncEditorStorage } = options

  // Clear overlay-persisted header/footer so new option templates (e.g. `{page}`) render.
  if (updates.header !== undefined) {
    storage.headerHTML = null
    storage.headerJSON = null
  }
  if (updates.footer !== undefined) {
    storage.footerHTML = null
    storage.footerJSON = null
  }
  if (updates.headerFirstPage !== undefined) {
    storage.headerFirstPageHTML = null
    storage.headerFirstPageJSON = null
  }
  if (updates.footerFirstPage !== undefined) {
    storage.footerFirstPageHTML = null
    storage.footerFirstPageJSON = null
  }
  if (updates.headerOdd !== undefined) {
    storage.headerOddHTML = null
    storage.headerOddJSON = null
  }
  if (updates.headerEven !== undefined) {
    storage.headerEvenHTML = null
    storage.headerEvenJSON = null
  }
  if (updates.footerOdd !== undefined) {
    storage.footerOddHTML = null
    storage.footerOddJSON = null
  }
  if (updates.footerEven !== undefined) {
    storage.footerEvenHTML = null
    storage.footerEvenJSON = null
  }

  if (updates.pageFormat !== undefined) {
    runtimeOptions.pageFormat = updates.pageFormat
    storage.pageFormat = resolvePageFormat(updates.pageFormat)
    onSyncEditorStorage?.()
    runtimeOptions.onPageFormatChange?.(storage.pageFormat)
  }
  if (updates.header !== undefined) runtimeOptions.header = updates.header
  if (updates.footer !== undefined) runtimeOptions.footer = updates.footer
  if (updates.headerTopMargin !== undefined) runtimeOptions.headerTopMargin = updates.headerTopMargin
  if (updates.footerBottomMargin !== undefined) runtimeOptions.footerBottomMargin = updates.footerBottomMargin
  if (updates.differentFirstPage !== undefined) runtimeOptions.differentFirstPage = updates.differentFirstPage
  if (updates.headerFirstPage !== undefined) runtimeOptions.headerFirstPage = updates.headerFirstPage
  if (updates.footerFirstPage !== undefined) runtimeOptions.footerFirstPage = updates.footerFirstPage
  if (updates.differentOddEven !== undefined) runtimeOptions.differentOddEven = updates.differentOddEven
  if (updates.headerOdd !== undefined) runtimeOptions.headerOdd = updates.headerOdd
  if (updates.headerEven !== undefined) runtimeOptions.headerEven = updates.headerEven
  if (updates.footerOdd !== undefined) runtimeOptions.footerOdd = updates.footerOdd
  if (updates.footerEven !== undefined) runtimeOptions.footerEven = updates.footerEven
  if (updates.accentColor !== undefined) runtimeOptions.accentColor = updates.accentColor
  if (updates.headerAccentColor !== undefined) runtimeOptions.headerAccentColor = updates.headerAccentColor
  if (updates.footerAccentColor !== undefined) runtimeOptions.footerAccentColor = updates.footerAccentColor
  if (updates.documentTitle !== undefined) runtimeOptions.documentTitle = updates.documentTitle
  if (updates.pageNumberRegion !== undefined) {
    if (updates.pageNumberRegion === null) delete runtimeOptions.pageNumberRegion
    else runtimeOptions.pageNumberRegion = updates.pageNumberRegion
  }
  if (updates.pageNumberNumeralStyle !== undefined)
    runtimeOptions.pageNumberNumeralStyle = updates.pageNumberNumeralStyle
  if (updates.pageNumberStartAt !== undefined) runtimeOptions.pageNumberStartAt = updates.pageNumberStartAt
  if (updates.pageNumberAlignment !== undefined) {
    if (updates.pageNumberAlignment === null) delete runtimeOptions.pageNumberAlignment
    else runtimeOptions.pageNumberAlignment = updates.pageNumberAlignment
  }
  if (updates.pageNumberShowOnFirstPage !== undefined) {
    runtimeOptions.pageNumberShowOnFirstPage = updates.pageNumberShowOnFirstPage
  }
}
