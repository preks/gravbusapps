import { useCallback } from 'react'
import type { WheelEvent } from 'react'

/**
 * Read-only overlay blocks edits but forwards wheel/trackpad to the grid below.
 */
export function useUniverReadOnlyInteraction() {
  const forwardReadOnlyOverlayWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const overlay = e.currentTarget
    const previousPointerEvents = overlay.style.pointerEvents
    overlay.style.pointerEvents = 'none'
    const target = globalThis.document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    overlay.style.pointerEvents = previousPointerEvents

    if (!target) return

    target.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        bubbles: true,
        cancelable: true
      })
    )
  }, [])

  return { forwardReadOnlyOverlayWheel }
}
