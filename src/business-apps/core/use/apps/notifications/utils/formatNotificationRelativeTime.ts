export function formatNotificationRelativeTime(createdAt?: string, now = Date.now()): string {
  if (!createdAt) {
    return ''
  }

  const timestamp = new Date(createdAt).getTime()
  if (Number.isNaN(timestamp)) {
    return ''
  }

  const diffSeconds = Math.round((timestamp - now) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absSeconds < 60) {
    return formatter.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffSeconds / 3600)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffSeconds / 86400)
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, 'day')
  }

  return new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: timestamp < now - 365 * 86400 * 1000 ? 'numeric' : undefined
  })
}
