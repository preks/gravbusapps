import { useState, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { applyHeaderHtmlForPage, applyFooterHtmlForPage } from './headerFooterSidebarApply'
import { displayToPx, pxToDisplay, type HeaderFooterPaginationCmd } from './headerFooterSidebarUtils'

export interface UseHeaderFooterSidebarActionsParams {
  editor: Editor
  overlayEditor: Editor | null
  activeType: 'header' | 'footer'
  activePage: number
  differentFirstPage: boolean
  differentOddEven: boolean
  headerTopMarginPx: number
  footerBottomMarginPx: number
  marginUnit: 'cm' | 'in'
  onPersistPagesFromEditor: () => void
}

export function useHeaderFooterSidebarActions({
  editor,
  overlayEditor,
  activeType,
  activePage,
  differentFirstPage,
  differentOddEven,
  headerTopMarginPx,
  footerBottomMarginPx,
  marginUnit,
  onPersistPagesFromEditor
}: UseHeaderFooterSidebarActionsParams) {
  const [hPos, setHPos] = useState(String(pxToDisplay(headerTopMarginPx, marginUnit)))
  const [fPos, setFPos] = useState(String(pxToDisplay(footerBottomMarginPx, marginUnit)))

  useEffect(() => {
    setHPos(String(pxToDisplay(headerTopMarginPx, marginUnit)))
  }, [headerTopMarginPx, marginUnit])
  useEffect(() => {
    setFPos(String(pxToDisplay(footerBottomMarginPx, marginUnit)))
  }, [footerBottomMarginPx, marginUnit])

  const cmds = editor.commands as HeaderFooterPaginationCmd

  const reopenAfterLayoutToggle = useCallback(
    (apply: () => void) => {
      const page = activePage
      const typ = activeType
      apply()
      requestAnimationFrame(() => {
        onPersistPagesFromEditor()
        setTimeout(() => {
          const c = editor.commands as HeaderFooterPaginationCmd
          if (typ === 'header') c.openHeaderEditor?.({ pageNumber: page })
          else c.openFooterEditor?.({ pageNumber: page })
        }, 100)
      })
    },
    [activePage, activeType, editor, onPersistPagesFromEditor]
  )

  const applyMargins = useCallback(() => {
    const h = Number.parseFloat(hPos.replace(',', '.'))
    const f = Number.parseFloat(fPos.replace(',', '.'))
    if (Number.isFinite(h)) cmds.setHeaderTopMargin?.(displayToPx(h, marginUnit))
    if (Number.isFinite(f)) cmds.setFooterBottomMargin?.(displayToPx(f, marginUnit))
    requestAnimationFrame(() => onPersistPagesFromEditor())
  }, [cmds, fPos, hPos, marginUnit, onPersistPagesFromEditor])

  const applyHeaderPreset = useCallback(
    (html: string) => {
      applyHeaderHtmlForPage(editor, activePage, html, differentFirstPage, differentOddEven)
      requestAnimationFrame(() => onPersistPagesFromEditor())
    },
    [activePage, differentFirstPage, differentOddEven, editor, onPersistPagesFromEditor]
  )

  const applyFooterPreset = useCallback(
    (html: string) => {
      applyFooterHtmlForPage(editor, activePage, html, differentFirstPage, differentOddEven)
      requestAnimationFrame(() => onPersistPagesFromEditor())
    },
    [activePage, differentFirstPage, differentOddEven, editor, onPersistPagesFromEditor]
  )

  const insertInOverlay = useCallback(
    (text: string) => {
      overlayEditor?.chain().focus().insertContent(text).run()
    },
    [overlayEditor]
  )

  return {
    hPos,
    setHPos,
    fPos,
    setFPos,
    cmds,
    reopenAfterLayoutToggle,
    applyMargins,
    applyHeaderPreset,
    applyFooterPreset,
    insertInOverlay
  }
}
