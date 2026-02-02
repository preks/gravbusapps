/**
 * Validation constants for salary adjustment and assignment forms
 */

export const SALARY_FORM_VALIDATION = {
  /**
   * Maximum length for notes field
   */
  NOTES_MAX_LENGTH: 500,

  /**
   * Maximum amount for salary increase (100 million)
   */
  MAX_AMOUNT_INCREASE: 100_000_000,

  /**
   * Maximum percentage for salary increase
   */
  MAX_PERCENTAGE_INCREASE: 100,

  /**
   * Maximum percentage for salary reduction (as positive number)
   * Example: -100% reduction means reduction down to 0
   */
  MAX_PERCENTAGE_REDUCTION: 100,

  /**
   * Minimum salary threshold (cannot go below 0)
   */
  MIN_SALARY_THRESHOLD: 0
} as const
