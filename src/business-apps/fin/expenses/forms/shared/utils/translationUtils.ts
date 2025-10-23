import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Helper to get translated message with proper parameter extraction.
 * Extracting params into a variable is required for i18n interpolation to work.
 *
 * IMPORTANT: This wrapper is necessary because i18n.t() requires parameters to be
 * extracted into a separate variable before being passed to the function.
 * Passing an inline object literal causes interpolation to fail.
 */
export const getTranslatedMessage = (key: string, defaultValue: string, params: Record<string, string>): string => {
  // Extract parameters into a variable - this is REQUIRED for i18n interpolation
  // This is the critical fix: params must be in a separate variable, not inline
  const translationParams = {
    ...params,
    interpolation: { escapeValue: false }
  }

  // Use the established windowUtils function to maintain consistency with project guidelines
  return getTranslationFromI18nKeyAndLabel(key, defaultValue, translationParams)
}
