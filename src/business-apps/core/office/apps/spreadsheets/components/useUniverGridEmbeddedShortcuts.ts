import { useCallback, useEffect } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { isDomTextEditingTarget } from './univerGridContextMenuDom'
import type { UniverGridController } from './useUniverGridController'

type EmbeddedShortcutDeps = Pick<UniverGridController, 'univerAPIRef' | 'isSheetInteractionActiveRef'>

/**
 * Global/wrapper keyboard behavior for spreadsheets embedded in host apps: track sheet focus,
 * capture Cmd/Ctrl+B for bold, clear interaction when read-only, and stop propagation for common shortcuts.
 */
export function useUniverGridEmbeddedShortcuts(
  params: {
    isReadOnly: boolean
    containerRef: RefObject<HTMLDivElement | null>
  } & EmbeddedShortcutDeps
): { onSpreadsheetKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void } {
  const { isReadOnly, containerRef, univerAPIRef, isSheetInteractionActiveRef } = params

  useEffect(() => {
    const updateInteractionActive = (target: EventTarget | null) => {
      const container = containerRef.current
      if (!container) return
      isSheetInteractionActiveRef.current = target instanceof Node && container.contains(target)
    }

    const onPointerDownCapture = (e: PointerEvent) => updateInteractionActive(e.target)
    const onFocusInCapture = (e: FocusEvent) => updateInteractionActive(e.target)

    globalThis.addEventListener('pointerdown', onPointerDownCapture, true)
    globalThis.addEventListener('focusin', onFocusInCapture, true)
    return () => {
      globalThis.removeEventListener('pointerdown', onPointerDownCapture, true)
      globalThis.removeEventListener('focusin', onFocusInCapture, true)
    }
  }, [])

  useEffect(() => {
    const onKeyDownCapture = (e: globalThis.KeyboardEvent) => {
      if (isReadOnly) return
      const api = univerAPIRef.current
      const container = containerRef.current
      if (!api || !container) return

      const activeEl = typeof document !== 'undefined' ? document.activeElement : null
      if (isDomTextEditingTarget(activeEl) && activeEl instanceof Element && !container.contains(activeEl)) {
        return
      }

      const inSheet =
        (activeEl instanceof Element && container.contains(activeEl)) || isSheetInteractionActiveRef.current
      if (!inSheet) return

      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      if (e.key.toLowerCase() !== 'b') return

      e.preventDefault()
      e.stopImmediatePropagation()
      e.stopPropagation()
      try {
        const didExecute = api.syncExecuteCommand('sheet.command.set-range-bold')
        if (didExecute) return
      } catch {
        // continue to fallback
      }

      try {
        const wb = api.getActiveWorkbook?.()
        const range =
          (wb as { getActiveRange?: () => unknown } | null | undefined)?.getActiveRange?.() ??
          (wb as { getActiveSheet?: () => { getActiveRange?: () => unknown } } | null | undefined)
            ?.getActiveSheet?.()
            ?.getActiveRange?.()
        if (!range) return
        const style = (range as { getCellStyleData?: () => { bl?: number } | null })?.getCellStyleData?.()
        const isBold = style?.bl === 1
        ;(range as { setFontWeight?: (v: 'normal' | 'bold' | null) => unknown })?.setFontWeight?.(
          isBold ? 'normal' : 'bold'
        )
      } catch {
        // Ignore — shortcut is best-effort in published embeds
      }
    }

    globalThis.addEventListener('keydown', onKeyDownCapture, true)
    return () => globalThis.removeEventListener('keydown', onKeyDownCapture, true)
  }, [isReadOnly])

  useEffect(() => {
    if (!isReadOnly) return
    isSheetInteractionActiveRef.current = false
  }, [isReadOnly])

  const onSpreadsheetKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.target as Node)) return
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null
    if (isDomTextEditingTarget(activeEl) && activeEl instanceof Element && !containerRef.current.contains(activeEl)) {
      return
    }
    const isMod = e.metaKey || e.ctrlKey
    if (!isMod) return
    const key = e.key.toLowerCase()
    const spreadsheetShortcuts = ['b', 'i', 'u', 'c', 'v', 'x', 'z', 'y']
    if (spreadsheetShortcuts.includes(key)) {
      e.stopPropagation()
    }
  }, [])

  return { onSpreadsheetKeyDown }
}
