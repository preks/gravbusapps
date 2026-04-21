import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type ManagerAbsencesFallbacks = Record<string, string | undefined> & {
  en: string
}

const getLocaleFallback = (fallbacks: ManagerAbsencesFallbacks): string => {
  const selectedLocale = String(globalThis?.window?.lowcoder?.i18n?.selectedLocale || 'en-US').toLowerCase()
  const languageCode = selectedLocale.split('-')[0]

  if (fallbacks[languageCode]) {
    return fallbacks[languageCode] || fallbacks.en
  }

  return fallbacks.en
}

export const translateManagerAbsencesText = (key: string, fallbacks: ManagerAbsencesFallbacks): string => {
  const defaultValue = getLocaleFallback(fallbacks)
  return getTranslationFromI18nKeyAndLabel(key, defaultValue)
}
