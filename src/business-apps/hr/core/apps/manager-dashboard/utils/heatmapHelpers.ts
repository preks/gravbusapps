export const employeeLabel = (m: { firstName: string; lastName: string }): string => {
  const initial = m.lastName?.trim()?.charAt(0)
  return initial ? `${m.firstName} ${initial}.` : m.firstName
}

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
