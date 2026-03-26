export function formatLastSavedLabel(
  date: Date | null,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (!date) return t('editor-status-not-saved')

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return t('editor-status-saved-now')
  if (diffMinutes === 1) return t('editor-status-saved-minute')
  if (diffMinutes < 60) return t('editor-status-saved-minutes', { count: diffMinutes })

  return t('editor-status-saved-at', { time: date.toLocaleTimeString() })
}
