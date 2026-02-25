/**
 * Resolve computed colors from gba: Tailwind classes for use in ReactFlow
 * Background/Controls/MiniMap (SVG and inline styles where CSS vars may not resolve).
 */

export interface FlowCanvasThemeColors {
  surface: string
  border: string
  minimapNode: string
  minimapStroke: string
  mask: string
}

export function resolveCssColor(
  className: string,
  property: 'backgroundColor' | 'borderColor' | 'color'
): string | undefined {
  try {
    if (typeof document === 'undefined') return undefined
    const el = document.createElement('div')
    el.className = className
    el.style.position = 'absolute'
    el.style.visibility = 'hidden'
    el.style.pointerEvents = 'none'
    el.style.top = '-9999px'
    el.style.left = '-9999px'
    if (property === 'borderColor') {
      el.style.borderWidth = '1px'
      el.style.borderStyle = 'solid'
    }
    document.body.appendChild(el)
    const value = getComputedStyle(el)[property]
    el.remove()
    const v = String(value ?? '').trim()
    return v || undefined
  } catch {
    return undefined
  }
}

export function withAlpha(color: string | undefined, alpha: number): string | undefined {
  if (!color) return undefined
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+\s*)?\)$/.exec(color)
  if (!m) return color
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const FALLBACK_SURFACE = 'white'
const FALLBACK_BORDER = 'rgba(0,0,0,0.12)'
const FALLBACK_MASK = 'rgba(0,0,0,0.08)'

export const DEFAULT_FLOW_CANVAS_THEME_COLORS: FlowCanvasThemeColors = {
  surface: FALLBACK_SURFACE,
  border: FALLBACK_BORDER,
  minimapNode: FALLBACK_SURFACE,
  minimapStroke: FALLBACK_BORDER,
  mask: FALLBACK_MASK
}

export function resolveFlowCanvasThemeColors(): FlowCanvasThemeColors {
  const surface = resolveCssColor('gba:bg-background', 'backgroundColor') ?? FALLBACK_SURFACE
  const border = resolveCssColor('gba:border-border', 'borderColor') ?? FALLBACK_BORDER
  const minimapNode = resolveCssColor('gba:bg-muted', 'backgroundColor') ?? surface
  const minimapStroke = border
  const mask = withAlpha(minimapNode, 0.12) ?? FALLBACK_MASK
  return { surface, border, minimapNode, minimapStroke, mask }
}
