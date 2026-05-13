import { useEffect } from 'react'
import {
  NUMFMT_MENU_ITEM_ROW_SELECTOR,
  findNumfmtFormatMenuGrids,
  getGermanNumfmtPattern,
  hideUnwantedRibbonTabs,
  normalizeMenuText,
  patchChineseDateLabels,
  patchGermanNumfmtMenuPreview,
  simplifyMergeDropdownMenu
} from './univerGridLocaleChrome'
import {
  getRibbonAccountingCurrencyPatternFromRowElement,
  hideRibbonNumfmtCurrencyQuickSplit,
  patchRibbonAccountingCurrencyMenus
} from './univerGridRibbonCurrencyPresets'
import type { UniverGridController } from './useUniverGridController'

type LocaleRibbonChromeDeps = Pick<UniverGridController, 'univerAPIRef'>

/**
 * Observes document DOM for Univer ribbon / numfmt menus and applies DE locale patches and German number-format overrides.
 */
export function useUniverGridLocaleRibbonChrome(
  params: {
    isReadOnly: boolean
    gridHostEl: HTMLElement | null
  } & LocaleRibbonChromeDeps
): void {
  const { isReadOnly, gridHostEl, univerAPIRef } = params

  useEffect(() => {
    if (isReadOnly) return
    if (!gridHostEl) return

    const applyGermanPatternToActiveRange = (label: string) => {
      const pattern = getGermanNumfmtPattern(label)
      if (!pattern) return
      const workbook = univerAPIRef.current?.getActiveWorkbook?.() as
        | { getActiveRange?: () => { setNumberFormat?: (nextPattern: string) => unknown } | null }
        | undefined
      const range = workbook?.getActiveRange?.()
      if (!range || typeof range.setNumberFormat !== 'function') return
      try {
        range.setNumberFormat(pattern)
      } catch (error) {
        console.error('[UniverSheetGrid] setNumberFormat override failed:', error)
      }
    }

    /**
     * Toolbar overflow (⋮) and Radix popovers often mount outside `containerRef`. A capture listener
     * on the grid host never runs, so we observe `document.body` and rAF-debounce patches — including
     * `characterData` so React text updates are re-overridden.
     */
    let rafScheduled = 0
    const scheduleNumfmtMenuPatch = () => {
      if (rafScheduled !== 0) return
      rafScheduled = globalThis.requestAnimationFrame(() => {
        rafScheduled = 0
        patchGermanNumfmtMenuPreview()
        patchChineseDateLabels()
        hideUnwantedRibbonTabs()
        simplifyMergeDropdownMenu()
        hideRibbonNumfmtCurrencyQuickSplit()
        patchRibbonAccountingCurrencyMenus()
      })
    }

    const observer = new globalThis.MutationObserver(() => {
      scheduleNumfmtMenuPatch()
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    scheduleNumfmtMenuPatch()

    /** Univer re-applies `Dt(pattern)` to preview spans on render; re-patch on a timer while the sheet is mounted. */
    const numfmtPreviewIntervalId = globalThis.setInterval(() => {
      patchGermanNumfmtMenuPreview()
      patchChineseDateLabels()
      hideUnwantedRibbonTabs()
      simplifyMergeDropdownMenu()
      hideRibbonNumfmtCurrencyQuickSplit()
      patchRibbonAccountingCurrencyMenus()
    }, 200)

    const onNumfmtMenuItemClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const ribbonCurrencyRow = target.closest('[data-gravity-currency-row]') as HTMLElement | null
      const ribbonPattern = getRibbonAccountingCurrencyPatternFromRowElement(ribbonCurrencyRow)
      if (ribbonPattern && ribbonCurrencyRow) {
        const workbook = univerAPIRef.current?.getActiveWorkbook?.() as
          | { getActiveRange?: () => { setNumberFormat?: (nextPattern: string) => unknown } | null }
          | undefined
        const range = workbook?.getActiveRange?.()
        if (range && typeof range.setNumberFormat === 'function') {
          event.preventDefault()
          event.stopImmediatePropagation()
          try {
            range.setNumberFormat(ribbonPattern)
          } catch (error) {
            console.error('[UniverSheetGrid] ribbon currency preset setNumberFormat failed:', error)
          }
          globalThis.setTimeout(() => {
            scheduleNumfmtMenuPatch()
          }, 0)
        }
        return
      }

      const row = target.closest(NUMFMT_MENU_ITEM_ROW_SELECTOR) as HTMLElement | null
      if (!row) return
      const grids = findNumfmtFormatMenuGrids()
      if (!grids.some(g => g.contains(row))) return
      const labelSpan = row.querySelector<HTMLElement>(':scope > span:first-child')
      const label = labelSpan ? normalizeMenuText(labelSpan.textContent || '') : null
      if (!label) return
      globalThis.setTimeout(() => {
        applyGermanPatternToActiveRange(label)
        scheduleNumfmtMenuPatch()
      }, 0)
    }

    document.addEventListener('click', onNumfmtMenuItemClickCapture, true)

    return () => {
      observer.disconnect()
      globalThis.clearInterval(numfmtPreviewIntervalId)
      if (rafScheduled !== 0) {
        globalThis.cancelAnimationFrame(rafScheduled)
        rafScheduled = 0
      }
      document.removeEventListener('click', onNumfmtMenuItemClickCapture, true)
    }
  }, [isReadOnly, gridHostEl])
}
