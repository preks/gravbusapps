/**
 * Gravity Platform hosts remote apps in a pane that uses plain Tailwind (`overflow-auto`, no `gba:`).
 * That outer pane scrolls the whole embedded UI so Univer's sheet-tab footer scrolls away.
 * Also, a `min-h-dvh` / oversized viewer can exceed the pane height while the shell still scrolls.
 * Patch: stop outer vertical scrolling and size the spreadsheet viewer root to the pane height.
 */
export function patchEmbeddedSpreadsheetHostLayout(gridHost: HTMLElement): (() => void) | undefined {
  if (typeof document === 'undefined') return undefined

  let el: HTMLElement | null = gridHost.parentElement
  let scrollShell: HTMLElement | null = null
  while (el && el !== document.body) {
    const st = getComputedStyle(el)
    const cls = typeof el.className === 'string' ? el.className : ''
    const isGbaWrapper = cls.includes('gba:')
    const overflowsVertically =
      (st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
    if (overflowsVertically && !isGbaWrapper) {
      scrollShell = el
      break
    }
    el = el.parentElement
  }

  if (!scrollShell) return undefined

  const prevShellOverflow = scrollShell.style.overflow
  const prevShellMinHeight = scrollShell.style.minHeight
  scrollShell.style.overflow = 'hidden'
  if (!scrollShell.style.minHeight) {
    scrollShell.style.minHeight = '0'
  }

  const viewerRoot = gridHost.closest<HTMLElement>('[data-testid="spreadsheet-app-viewer"], [data-testid$="-viewer"]')

  let restoreViewer: (() => void) | undefined
  if (viewerRoot && scrollShell.contains(viewerRoot)) {
    const slotHeight = scrollShell.clientHeight
    if (slotHeight > 0) {
      viewerRoot.style.setProperty('max-height', `${slotHeight}px`, 'important')
      viewerRoot.style.setProperty('height', `${slotHeight}px`, 'important')
      viewerRoot.style.setProperty('min-height', '0', 'important')
      restoreViewer = () => {
        viewerRoot.style.removeProperty('max-height')
        viewerRoot.style.removeProperty('height')
        viewerRoot.style.removeProperty('min-height')
      }
    }
  }

  return () => {
    scrollShell.style.overflow = prevShellOverflow
    scrollShell.style.minHeight = prevShellMinHeight
    if (!prevShellOverflow) scrollShell.style.removeProperty('overflow')
    if (!prevShellMinHeight) scrollShell.style.removeProperty('min-height')
    restoreViewer?.()
  }
}
