/**
 * Validation constants for Performance Evaluation inputs
 * These limits prevent endless horizontal scrollbars in tables
 */

export const PERFORMANCE_VALIDATION = {
  /** Maximum length for cycle names (e.g., "2026 Annual Performance Review") */
  CYCLE_NAME_MAX_LENGTH: 64,

  /** Maximum length for rating scale names (e.g., "5-Star Rating Scale") */
  SCALE_NAME_MAX_LENGTH: 64,

  /** Maximum length for individual rating scale values/labels */
  SCALE_VALUE_MAX_LENGTH: 10,

  /** Maximum length for company value titles */
  VALUE_TITLE_MAX_LENGTH: 64,

  /** Maximum length for company value descriptions */
  VALUE_DESCRIPTION_MAX_LENGTH: 100,

  /** Maximum length for comment textareas (topic comments and general comments); aligned with HR app (e.g. notes, justification: 500) */
  COMMENT_MAX_LENGTH: 500
} as const
