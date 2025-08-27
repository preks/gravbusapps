/**
 * Constants for the expense plan form
 */

export const PLAN_STATUS = {
  CREATED: "CREATED"
} as const;

export const PLAN_TYPES = {
  TRIP: "trip",
  EXPENSE: "expense"
} as const;

export const FORM_STEPS = {
  START: "start",
  EXPENSE: "expense",
  TRIP: "trip"
} as const;

export type FormStepType = typeof FORM_STEPS[keyof typeof FORM_STEPS]; 