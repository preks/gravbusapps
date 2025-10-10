/**
 * Constants for the expense plan form
 */

export const PLAN_STATUS = {
  CREATED: 'CREATED'
} as const

export const PLAN_TYPES = {
  TRIP: 'trip',
  EXPENSE: 'expense'
} as const

export const FORM_STEPS = {
  START: 'start',
  EXPENSE: 'expense',
  TRIP: 'trip'
} as const

export type FormStepType = (typeof FORM_STEPS)[keyof typeof FORM_STEPS]

export const DISABLED_FLAG = 'disabled' as const

export const PLAN_TYPE_ENUM = {
  TRIP: 'TRIP',
  EXPENSE: 'EXPENSE'
} as const

export const SUBMIT_SUCCESS_RESET_TIMEOUT = 5000
export const ABORT_EXIT_STRATEGY = 'abort'
