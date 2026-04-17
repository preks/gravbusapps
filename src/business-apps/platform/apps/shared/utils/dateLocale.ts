import type { Locale } from 'date-fns'
import { de, enUS, ro } from 'date-fns/locale'

/**
 * Resolves a `date-fns` locale object from an IETF language tag (e.g. `de-DE`).
 * Falls back to `en-US` when the language is not supported. Keep this list in sync
 * with the application's supported UI languages.
 */
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
