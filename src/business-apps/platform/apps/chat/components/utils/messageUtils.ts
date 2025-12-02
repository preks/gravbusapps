import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Parse a date string to Date object, ensuring UTC interpretation
 */
export const parseDate = (date: Date | string): Date => {
  if (typeof date === 'string') {
    const dateStr = date.endsWith('Z') ? date : date + 'Z'
    return new Date(dateStr)
  }
  return date
}

/**
 * Format time as relative string (e.g., "5m ago", "2h ago")
 */
export const formatTime = (date: Date | string): string => {
  const d = parseDate(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return getTranslationFromI18nKeyAndLabel('chat.time.justNow', 'Just now')
  if (diffMins < 60)
    return getTranslationFromI18nKeyAndLabel('chat.time.minutesAgo', `${diffMins}m ago`).replace(
      '{minutes}',
      diffMins.toString()
    )
  if (diffHours < 24)
    return getTranslationFromI18nKeyAndLabel('chat.time.hoursAgo', `${diffHours}h ago`).replace(
      '{hours}',
      diffHours.toString()
    )
  if (diffDays < 7)
    return getTranslationFromI18nKeyAndLabel('chat.time.daysAgo', `${diffDays}d ago`).replace(
      '{days}',
      diffDays.toString()
    )

  return d.toLocaleDateString()
}

/**
 * Format full timestamp for tooltip display
 */
export const formatFullTimestamp = (date: Date | string): string => {
  const d = parseDate(date)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get message status icon text
 */
export const getStatusIcon = (status?: string): string | null => {
  switch (status) {
    case 'read':
    case 'delivered':
      return '✓✓'
    case 'sent':
      return '✓'
    default:
      return null
  }
}
