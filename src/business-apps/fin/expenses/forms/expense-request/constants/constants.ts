/**
 * Constants for the expense request form
 */

export const REQUEST_STATUS = {
  CREATED: 'CREATED'
} as const

export const REQUEST_TYPES = {
  TRIP: 'trip',
  EXPENSE: 'expense'
} as const

export const FORM_STEPS = {
  START: 'start',
  EXPENSE: 'expense',
  PLAN: 'plan',
  TRIP: 'trip'
} as const

export type FormStepType = (typeof FORM_STEPS)[keyof typeof FORM_STEPS]

export const PLANS_PER_PAGE = 5

// Domain value flags / enums
export const DISABLED_FLAG = 'disabled' as const

export const PLAN_TYPE_ENUM = {
  TRIP: 'TRIP',
  EXPENSE: 'EXPENSE'
} as const

// UI/behavioral constants
export const SUBMIT_SUCCESS_RESET_TIMEOUT = 5000 // ms

// Currency defaults
export const DEFAULT_PLAN_CURRENCY_CODE = 'EUR' as const

// Validation/UI constants
export const TITLE_MAX_LENGTH = 50
export const COMMENT_TEXTAREA_ROWS = 4
