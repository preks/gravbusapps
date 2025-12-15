/**
 * Validation constants for benefit request and deactivation forms
 */

export const BENEFIT_FORM_VALIDATION = {
  /**
   * Minimum length for text fields (justification, additional details)
   */
  MIN_TEXT_LENGTH: 10,

  /**
   * Maximum length for text fields (justification, additional details)
   */
  MAX_TEXT_LENGTH: 500,

  /**
   * Default currency for benefit values
   * Note: System will use country currency or employee bank account currency when available
   * This is kept for backward compatibility but not used as automatic fallback
   */
  DEFAULT_CURRENCY: 'EUR',

  /**
   * Default currency reference for API
   * Note: System will use country currency or employee bank account currency when available
   * This is kept for backward compatibility but not used as automatic fallback
   */
  DEFAULT_CURRENCY_REF: 'Currency:v1:EUR'
} as const
