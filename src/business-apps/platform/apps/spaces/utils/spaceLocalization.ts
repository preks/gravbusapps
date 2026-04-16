import { format, formatDistanceToNow } from 'date-fns'
import type { Locale } from 'date-fns'
import { de, enUS, ro } from 'date-fns/locale'

export type SpaceTranslateFn = (key: string, args?: Record<string, unknown>) => string
export type TranslationBundle = Record<string, string>

const DEFAULT_LOCALE = 'en-US'

export function mergeTranslationBundles(...bundles: TranslationBundle[]): TranslationBundle {
  const locales = new Set(bundles.flatMap(bundle => Object.keys(bundle)))

  return Array.from(locales).reduce<TranslationBundle>((acc, locale) => {
    acc[locale] = bundles
      .map(bundle => bundle[locale])
      .filter((value): value is string => Boolean(value))
      .join('\n')

    return acc
  }, {})
}

export function getDateFnsLocale(locale?: string): Locale {
  const baseLocale = locale?.split('-')[0]?.toLowerCase()

  switch (baseLocale) {
    case 'de':
      return de
    case 'ro':
      return ro
    default:
      return enUS
  }
}

export function formatLocalizedDate(date: Date, locale?: string, pattern: string = 'MMM d, yyyy'): string {
  return format(date, pattern, { locale: getDateFnsLocale(locale) })
}

export function formatLocalizedDistance(date: Date, locale?: string): string {
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: getDateFnsLocale(locale)
  })
}

export function formatCompactRelativeTime(dateString: string, locale: string | undefined, t: SpaceTranslateFn): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return t('time-just-now')
  }

  if (diffMins < 60) {
    return t('time-minutes-ago-short', { count: diffMins })
  }

  if (diffHours < 24) {
    return t('time-hours-ago-short', { count: diffHours })
  }

  if (diffDays === 1) {
    return t('time-yesterday')
  }

  if (diffDays < 7) {
    return t('time-days-ago-short', { count: diffDays })
  }

  return date.toLocaleDateString(locale || DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric'
  })
}

export function formatConversationLastActivity(
  dateString: string | undefined,
  locale: string | undefined,
  t: SpaceTranslateFn
): string {
  if (!dateString) {
    return t('chat-no-recent-activity')
  }

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    return t('chat-active-just-now')
  }

  if (diffHours < 24) {
    return t('chat-active-hours-ago', { count: diffHours })
  }

  if (diffDays === 1) {
    return t('chat-active-yesterday')
  }

  if (diffDays < 7) {
    return t('chat-active-days-ago', { count: diffDays })
  }

  return date.toLocaleDateString(locale || DEFAULT_LOCALE)
}

export function formatMeetingTimeRange(
  startString: string,
  endString: string,
  locale: string | undefined,
  t: SpaceTranslateFn
): string {
  const start = new Date(startString)
  const end = new Date(endString)
  const now = new Date()

  const today = now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const timeRange = `${start.toLocaleTimeString(locale || DEFAULT_LOCALE, {
    hour: 'numeric',
    minute: '2-digit'
  })} - ${end.toLocaleTimeString(locale || DEFAULT_LOCALE, {
    hour: 'numeric',
    minute: '2-digit'
  })}`

  if (start.toDateString() === today) {
    return t('calendar-time-today', { time: timeRange })
  }

  if (start.toDateString() === tomorrow.toDateString()) {
    return t('calendar-time-tomorrow', { time: timeRange })
  }

  return t('calendar-time-date', {
    date: start.toLocaleDateString(locale || DEFAULT_LOCALE, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    time: timeRange
  })
}

export function formatLiveDuration(startedAt: Date, t: SpaceTranslateFn): string {
  const diffMs = Date.now() - startedAt.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) {
    return t('live-activity-duration-just-now')
  }

  if (diffMins < 60) {
    return t('live-activity-duration-minutes-short', { count: diffMins })
  }

  return t('live-activity-duration-hours-short', { count: Math.floor(diffMins / 60) })
}
