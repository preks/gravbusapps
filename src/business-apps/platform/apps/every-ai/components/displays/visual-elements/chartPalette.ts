import type { Color } from '../../../types/models'

const FALLBACK = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'] as const

const TOKEN_MAP: Record<string, string> = {
  red: 'hsl(var(--destructive))',
  green: 'hsl(var(--success))',
  blue: 'hsl(var(--chart-1))',
  yellow: 'hsl(var(--chart-4))',
  purple: 'hsl(var(--chart-3))',
  orange: 'hsl(var(--chart-5))',
  pink: 'hsl(var(--chart-2))',
  gray: 'hsl(var(--muted-foreground))',
  black: 'hsl(var(--foreground))',
  white: 'hsl(var(--background))'
}

export function chartColorAt(index: number, color?: Color | null): string {
  if (color && color in TOKEN_MAP) {
    return TOKEN_MAP[color]!
  }
  return FALLBACK[index % FALLBACK.length]!
}
