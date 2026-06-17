type DateFormatStyle = 'date.medium' | 'datetime.short'

function currentLocale(): string {
  return globalThis.navigator?.language || 'en-US'
}

function dateOptions(style: DateFormatStyle): Intl.DateTimeFormatOptions {
  if (style === 'datetime.short') {
    return {
      dateStyle: 'short',
      timeStyle: 'short'
    }
  }

  return {
    dateStyle: 'medium'
  }
}

export function formatDate(value: string | number | Date, style: DateFormatStyle = 'date.medium'): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  try {
    return new Intl.DateTimeFormat(currentLocale(), dateOptions(style)).format(date)
  } catch {
    return date.toISOString()
  }
}
