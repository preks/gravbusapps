/**
 * Validation constants for benefit request and deactivation forms
 */

export const BENEFIT_FORM_VALIDATION = {
  /**
   * Minimum length for text fields (justification, additional details)
   */
  MIN_TEXT_LENGTH: 20,

  /**
   * Maximum length for text fields (justification, additional details)
   */
  MAX_TEXT_LENGTH: 500,

  /**
   * Default currency for benefit values
   */
  DEFAULT_CURRENCY: 'EUR',

  /**
   * Default currency reference for API
   */
  DEFAULT_CURRENCY_REF: 'Currency:v1:EUR'
} as const
