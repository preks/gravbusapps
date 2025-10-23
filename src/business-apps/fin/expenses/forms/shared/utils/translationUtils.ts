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
  const translationParams = params

  // Use window.lowcoder.i18n.t directly to ensure proper translation
  if (typeof window?.lowcoder?.i18n?.t === 'function') {
    const translation = window.lowcoder.i18n.t(key, {
      defaultValue,
      ...translationParams,
      interpolation: { escapeValue: false }
    })

    // If translation key is not found, i18n returns the key itself
    // In that case, manually interpolate the defaultValue
    if (translation === key || key?.split('lowcoder:')?.[1] === translation) {
      return interpolateString(defaultValue, translationParams)
    }

    return translation || interpolateString(defaultValue, translationParams)
  }

  // Fallback: manually interpolate defaultValue
  return interpolateString(defaultValue, translationParams)
}

/**
 * Manually interpolate placeholders in a string using safe string replacement.
 * Uses split/join instead of RegExp to avoid ReDoS security vulnerabilities.
 */
function interpolateString(template: string, params: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(params)) {
    // Safe replacement using split/join - no RegExp, no security risk
    const placeholder = `{{${key}}}`
    result = result.split(placeholder).join(value)
  }
  return result
}
