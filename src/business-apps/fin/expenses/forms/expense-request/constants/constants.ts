/**
 * Constants for the expense request form
 */

export const REQUEST_STATUS = {
  CREATED: "CREATED"
} as const;

export const REQUEST_TYPES = {
  TRIP: "trip",
  EXPENSE: "expense"
} as const;

export const FORM_STEPS = {
  START: "start",
  EXPENSE: "expense",
  PLAN: "plan",
  TRIP: "trip"
} as const;

export type FormStepType = typeof FORM_STEPS[keyof typeof FORM_STEPS];

export const PLANS_PER_PAGE = 5;
