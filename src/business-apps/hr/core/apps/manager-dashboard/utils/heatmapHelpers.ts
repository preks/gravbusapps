import type { CSSProperties } from 'react'

export const employeeLabel = (m: { firstName: string; lastName: string }): string =>
  `${m.firstName} ${m.lastName}`.trim()

export const employeeInitials = (firstName: string, lastName: string): string => {
  const a = firstName.trim()[0] ?? ''
  const b = lastName.trim()[0] ?? ''
  return `${a}${b}`.toUpperCase() || '?'
}

export const avatarSrc = (pictureThumbnail?: string): string | undefined =>
  pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined

export const heatmapScoreCellClass = (score: number | null | undefined, limit: number): string => {
  if (score == null || limit <= 0) return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  const pct = (score / limit) * 100
  if (!Number.isFinite(pct) || pct === 0) return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  if (pct < 40) return 'gba:bg-red-100 gba:dark:bg-red-900/30 gba:text-red-900 gba:dark:text-red-100'
  if (pct < 60) return 'gba:bg-yellow-100 gba:dark:bg-yellow-900/30 gba:text-yellow-900 gba:dark:text-yellow-100'
  if (pct < 80) return 'gba:bg-green-100 gba:dark:bg-green-900/30 gba:text-green-900 gba:dark:text-green-100'
  return 'gba:bg-green-200 gba:dark:bg-green-800/30 gba:text-green-900 gba:dark:text-green-100'
}

export const heatmapLevelCellClass = (level: number | null | undefined): string => {
  if (level == null || level === 0) return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  if (level <= 2) return 'gba:bg-red-100 gba:dark:bg-red-900/30 gba:text-red-900 gba:dark:text-red-100'
  if (level === 3) return 'gba:bg-yellow-100 gba:dark:bg-yellow-900/30 gba:text-yellow-900 gba:dark:text-yellow-100'
  if (level === 4) return 'gba:bg-green-100 gba:dark:bg-green-900/30 gba:text-green-900 gba:dark:text-green-100'
  return 'gba:bg-green-200 gba:dark:bg-green-800/30 gba:text-green-900 gba:dark:text-green-100'
}

/**
 * Maps a normalised score (0–scaleMax) to a chart-band CSS variable.
 * chart-3 = highest … chart-8 = very low.
 */
function chartBandVar(score: number | null | undefined, scaleMax: number): string | undefined {
  if (score == null || scaleMax <= 0) return undefined
  const pct = score / scaleMax
  if (!Number.isFinite(pct) || pct <= 0) return undefined
  if (pct >= 0.85) return '--nw-chart-3'
  if (pct >= 0.7) return '--nw-chart-4'
  if (pct >= 0.55) return '--nw-chart-5'
  if (pct >= 0.4) return '--nw-chart-6'
  if (pct >= 0.25) return '--nw-chart-7'
  return '--nw-chart-8'
}

/** Background tint for data cells – translucent chart-band colour. */
export function chartBandBg(score: number | null | undefined, scaleMax: number): CSSProperties {
  const v = chartBandVar(score, scaleMax)
  if (!v) return {}
  return { backgroundColor: `color-mix(in srgb, var(${v}) 22%, transparent)` }
}

/** Header base tint (chart-1). */
export const HEADER_BG: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--nw-chart-1) 10%, transparent)'
}

/** Active / sorted-column header tint (chart-2). */
export const HEADER_ACTIVE_BG: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--nw-chart-2) 22%, transparent)'
}

/** Average-row accent tint (chart-1). */
export const AVG_ROW_BG: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--nw-chart-1) 8%, transparent)'
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—'
  if (score === 0) return '0'
  return score % 1 === 0 ? String(score) : score.toFixed(1)
}
