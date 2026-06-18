import { useEffect, useState, type RefObject } from 'react'

/**
 * Resolved design-system colors for canvas painting.
 *
 * The canvas cannot read Tailwind classes, so we probe the live computed
 * colors of hidden elements styled with DS utilities (inside the themed tree),
 * yielding token-true `rgb(...)` strings that also follow light/dark themes.
 * No hardcoded hex is used for actual rendering — these are only safe fallbacks
 * for the first paint / SSR.
 */
export interface GraphPalette {
  background: string
  card: string
  foreground: string
  mutedForeground: string
  border: string
  primary: string
  primaryForeground: string
  destructive: string
}

const DEFAULT_PALETTE: GraphPalette = {
  background: 'rgb(255, 255, 255)',
  card: 'rgb(250, 250, 250)',
  foreground: 'rgb(20, 20, 23)',
  mutedForeground: 'rgb(115, 115, 125)',
  border: 'rgb(228, 228, 231)',
  primary: 'rgb(37, 99, 235)',
  primaryForeground: 'rgb(255, 255, 255)',
  destructive: 'rgb(220, 38, 38)'
}

type CssColorProp = 'color' | 'backgroundColor' | 'borderColor'

const PROBES: Array<{ key: keyof GraphPalette; className: string; prop: CssColorProp }> = [
  { key: 'background', className: 'gba:bg-background', prop: 'backgroundColor' },
  { key: 'card', className: 'gba:bg-card', prop: 'backgroundColor' },
  { key: 'foreground', className: 'gba:text-foreground', prop: 'color' },
  { key: 'mutedForeground', className: 'gba:text-muted-foreground', prop: 'color' },
  { key: 'border', className: 'gba:border gba:border-border', prop: 'borderColor' },
  { key: 'primary', className: 'gba:bg-primary', prop: 'backgroundColor' },
  { key: 'primaryForeground', className: 'gba:text-primary-foreground', prop: 'color' },
  { key: 'destructive', className: 'gba:text-destructive', prop: 'color' }
]

const readPalette = (host: HTMLElement): GraphPalette => {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden'

  const elements = PROBES.map(item => {
    const el = document.createElement('span')
    el.className = item.className
    probe.appendChild(el)
    return { key: item.key, prop: item.prop, el }
  })
  host.appendChild(probe)

  const next: GraphPalette = { ...DEFAULT_PALETTE }
  for (const { key, prop, el } of elements) {
    const value = getComputedStyle(el)[prop]
    if (value && value !== 'rgba(0, 0, 0, 0)') next[key] = value
  }
  host.removeChild(probe)
  return next
}

export const useGraphTokens = (containerRef: RefObject<HTMLElement | null>): GraphPalette => {
  const [palette, setPalette] = useState<GraphPalette>(DEFAULT_PALETTE)

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    const update = () => setPalette(readPalette(host))
    update()

    // Re-probe when the app theme (class / data attributes on <html>) changes.
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    return () => observer.disconnect()
  }, [containerRef])

  return palette
}
