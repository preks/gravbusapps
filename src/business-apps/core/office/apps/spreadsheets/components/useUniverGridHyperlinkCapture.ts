import { useEffect } from 'react'
import type { RefObject } from 'react'
import { getHyperlinkUrlFromSelection } from '../utils/univerAdapter'
import { extractActiveRangePosition } from './univerGridRangeSelection'
import type { UniverGridController } from './useUniverGridController'

type HyperlinkCaptureDeps = Pick<UniverGridController, 'univerAPIRef' | 'activeSelectionRef' | 'propsRef'>

/**
 * Opens spreadsheet hyperlinks in a new tab when the user single-clicks inside the grid container.
 */
export function useUniverGridHyperlinkCapture(
  params: { containerRef: RefObject<HTMLDivElement | null> } & HyperlinkCaptureDeps
): void {
  const { containerRef, univerAPIRef, activeSelectionRef, propsRef } = params

  useEffect(() => {
    const handleLinkClick = () => {
      const wb = univerAPIRef.current?.getActiveWorkbook?.()
      const active = activeSelectionRef.current ?? extractActiveRangePosition(wb)
      if (active == null) return
      const { data, columns, sheet } = propsRef.current
      let cellFormula: string | null = null
      try {
        const snap =
          (wb as { save?: () => unknown; getSnapshot?: () => unknown })?.save?.() ??
          (wb as { getSnapshot?: () => unknown })?.getSnapshot?.()
        const sheets =
          snap && typeof snap === 'object'
            ? ((snap as Record<string, unknown>).sheets as Record<
                string,
                { cellData?: Record<number | string, Record<number | string, { f?: string }>> }
              >)
            : null
        const sheetId =
          sheet?.id ??
          (Array.isArray((snap as Record<string, unknown>)?.sheetOrder)
            ? (snap as { sheetOrder: string[] }).sheetOrder[0]
            : '')
        const ws = sheetId ? sheets?.[sheetId] : null
        const rowCells = ws?.cellData?.[active.row] ?? ws?.cellData?.[String(active.row)]
        const cell =
          rowCells && typeof rowCells === 'object' ? (rowCells[active.col] ?? rowCells[String(active.col)]) : null
        if (cell?.f) cellFormula = cell.f
      } catch {
        /* ignore */
      }
      const url = getHyperlinkUrlFromSelection(active.row, active.col, data, columns, cellFormula)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }

    const onCaptureClick = (e: MouseEvent) => {
      if (e.detail > 1) return
      const container = containerRef.current
      if (!container?.contains(e.target as Node)) return
      globalThis.setTimeout(handleLinkClick, 50)
    }

    document.addEventListener('click', onCaptureClick, true)
    return () => document.removeEventListener('click', onCaptureClick, true)
  }, [])
}
