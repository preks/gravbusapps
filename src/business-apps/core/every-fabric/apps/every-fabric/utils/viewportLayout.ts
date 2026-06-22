const DEVTOOLS_LAYOUT_GAP_PX = 120
const RESPONSIVE_LAYOUT_DEBOUNCE_MS = 150

/**
 * Chrome (and other browsers) shrink `innerWidth` / `innerHeight` when DevTools
 * is docked, which fires `resize` even though the user did not resize the
 * window. That makes responsive auto-layout (sidebar collapse, etc.) flip and
 * can feel like the whole app "reloaded".
 */
export function isDevToolsLayoutShift(): boolean {
  if (typeof globalThis.outerWidth !== 'number' || typeof globalThis.innerWidth !== 'number') {
    return false
  }
  if (typeof globalThis.outerHeight !== 'number' || typeof globalThis.innerHeight !== 'number') {
    return false
  }

  const widthGap = globalThis.outerWidth - globalThis.innerWidth
  const heightGap = globalThis.outerHeight - globalThis.innerHeight
  return widthGap > DEVTOOLS_LAYOUT_GAP_PX || heightGap > DEVTOOLS_LAYOUT_GAP_PX
}

export function readLayoutViewportWidth(): number {
  if (typeof globalThis.innerWidth !== 'number') return 0
  return globalThis.innerWidth
}

export function subscribeResponsiveLayoutViewport(
  onChange: (width: number) => void,
  options?: { debounceMs?: number }
): () => void {
  const debounceMs = options?.debounceMs ?? RESPONSIVE_LAYOUT_DEBOUNCE_MS
  if (typeof globalThis.addEventListener !== 'function') return () => {}

  let timer: ReturnType<typeof setTimeout> | undefined

  const emit = () => {
    if (isDevToolsLayoutShift()) return
    onChange(readLayoutViewportWidth())
  }

  const sync = () => {
    if (isDevToolsLayoutShift()) return
    clearTimeout(timer)
    timer = setTimeout(emit, debounceMs)
  }

  globalThis.addEventListener('resize', sync)
  return () => {
    clearTimeout(timer)
    globalThis.removeEventListener('resize', sync)
  }
}
