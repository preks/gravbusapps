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
export const formatTime = (date: Date | string, t?: (key: string, params?: any) => string): string => {
  const d = parseDate(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (!t) {
    // Fallback to English if no translation function provided
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  if (diffMins < 1) return t('chat-time-justNow')
  if (diffMins < 60) return t('chat-time-minutesAgo', { minutes: diffMins })
  if (diffHours < 24) return t('chat-time-hoursAgo', { hours: diffHours })
  if (diffDays < 7) return t('chat-time-daysAgo', { days: diffDays })

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
