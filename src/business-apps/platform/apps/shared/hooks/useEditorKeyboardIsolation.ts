/**
 * useEditorKeyboardIsolation
 *
 * Prevents text-formatting keyboard shortcuts (Cmd/Ctrl + B, I, U) from
 * propagating beyond the editor container. Without this, shortcuts like
 * Cmd+B bubble up to the platform's window-level listener that toggles
 * the navigation sidebar.
 */

import { useEffect, type RefObject } from 'react'

const FORMATTING_KEYS = new Set(['b', 'i', 'u'])

export function useEditorKeyboardIsolation(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && FORMATTING_KEYS.has(e.key.toLowerCase())) {
        e.stopPropagation()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef])
}
