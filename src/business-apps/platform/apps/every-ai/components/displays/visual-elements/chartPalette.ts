import type { Color } from '../../../types/models'

// Sequential blue palette aligned with @newwork/nw-design-system chart tokens.
// Uses var() directly because the underlying tokens are oklch(), not HSL components.
const FALLBACK = [
  'var(--nw-chart-3)',
  'var(--nw-chart-5)',
  'var(--nw-chart-1)',
  'var(--nw-chart-7)',
  'var(--nw-chart-4)',
  'var(--nw-chart-2)',
  'var(--nw-chart-6)',
  'var(--nw-chart-8)'
] as const

const TOKEN_MAP: Record<string, string> = {
  red: 'var(--nw-destructive)',
  green: 'var(--nw-success)',
  blue: 'var(--nw-chart-3)',
  yellow: 'var(--nw-highlight)',
  purple: 'var(--nw-chart-2)',
  orange: 'var(--nw-ai-confidence-high-chart)',
  pink: 'var(--nw-ai-2)',
  gray: 'var(--nw-muted-foreground)',
  black: 'var(--nw-foreground)',
  white: 'var(--nw-background)'
}

export function chartColorAt(index: number, color?: Color | null): string {
  if (color && color in TOKEN_MAP) {
    return TOKEN_MAP[color]!
  }
  return FALLBACK[index % FALLBACK.length]!
}
