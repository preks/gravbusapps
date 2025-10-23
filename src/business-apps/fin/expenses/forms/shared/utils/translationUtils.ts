import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Helper to get translated message with proper parameter extraction
 * Extracting params into variable is required for i18n interpolation to work
 */
export const getTranslatedMessage = (
  key: string,
  defaultValue: string,
  params: Record<string, string | { escapeValue: boolean }>
): string => {
  const translationParams = {
    ...params,
    interpolation: { escapeValue: false }
  }
  return getTranslationFromI18nKeyAndLabel(key, defaultValue, translationParams)
}
