// Resolves design-system colour tokens into hex strings consumable by three.js
// materials. WebGL can't read `var(--…)` directly, and CSS variables may be in
// HSL / OKLCH / RGB depending on the design system release, so we round-trip
// each value through a hidden DOM element to coerce it into rgb().
//
// Re-resolves when the `class` attribute on <html> changes (dark mode toggle).

import { useEffect, useState } from 'react'

export interface MeshThemeColors {
  background: string
  foreground: string
  card: string
  muted: string
  mutedForeground: string
  border: string
  primary: string
  primaryForeground: string
  secondary: string
  accent: string
  destructive: string
  ai: string
  /** Convenience: a slightly brighter "glow" colour for active edges/nodes. */
  glow: string
  /** True when the active theme is dark — switches default bloom and grid intensity. */
  isDark: boolean
}

const TOKEN_KEYS: Record<keyof Omit<MeshThemeColors, 'isDark'>, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  border: '--border',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  accent: '--accent',
  destructive: '--destructive',
  ai: '--ai',
  glow: '--primary'
}

const FALLBACKS: MeshThemeColors = {
  background: '#0b1020',
  foreground: '#e6e8ee',
  card: '#11172a',
  muted: '#1c2238',
  mutedForeground: '#8b93a7',
  border: '#222b40',
  primary: '#4f8cff',
  primaryForeground: '#ffffff',
  secondary: '#7c5cff',
  accent: '#22d3ee',
  destructive: '#ef4444',
  ai: '#a855f7',
  glow: '#4f8cff',
  isDark: true
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function resolveCssVar(probe: HTMLElement, value: string): string | null {
  if (!value) return null
  // Some tokens are bare HSL triples (e.g. `222 47% 11%`) meant to be wrapped
  // in `hsl(...)` by Tailwind. Detect that and synthesize the wrapper.
  const trimmed = value.trim()
  const looksLikeHslTriple = /^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(trimmed)
  probe.style.color = looksLikeHslTriple ? `hsl(${trimmed})` : trimmed
  const resolved = getComputedStyle(probe).color
  if (!resolved || resolved === 'rgba(0, 0, 0, 0)') return null
  return resolved
}

function detectDark(): boolean {
  if (!isBrowser()) return true
  const root = document.documentElement
  if (root.classList.contains('dark')) return true
  if (root.classList.contains('light')) return false
  if (root.dataset.theme === 'dark') return true
  if (root.dataset.theme === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

function readColors(): MeshThemeColors {
  if (!isBrowser()) return FALLBACKS
  const styles = getComputedStyle(document.documentElement)
  // Probe element coerces any CSS colour expression (hsl/oklch/var) into rgb().
  const probe = document.createElement('span')
  probe.style.position = 'fixed'
  probe.style.pointerEvents = 'none'
  probe.style.opacity = '0'
  probe.style.top = '-9999px'
  document.body.appendChild(probe)
  try {
    const out = { ...FALLBACKS, isDark: detectDark() } as MeshThemeColors
    ;(Object.keys(TOKEN_KEYS) as (keyof typeof TOKEN_KEYS)[]).forEach(k => {
      const raw = styles.getPropertyValue(TOKEN_KEYS[k])
      const resolved = resolveCssVar(probe, raw)
      if (resolved) out[k] = resolved
    })
    return out
  } finally {
    probe.remove()
  }
}

export function useMeshTheme(): MeshThemeColors {
  const [colors, setColors] = useState<MeshThemeColors>(() => (isBrowser() ? readColors() : FALLBACKS))

  useEffect(() => {
    if (!isBrowser()) return
    const root = document.documentElement
    const handle = () => setColors(readColors())
    // Re-read on class / data-theme changes (manual toggles).
    const observer = new MutationObserver(handle)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    // Re-read on OS dark-mode change.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener?.('change', handle)
    return () => {
      observer.disconnect()
      mq?.removeEventListener?.('change', handle)
    }
  }, [])

  return colors
}
