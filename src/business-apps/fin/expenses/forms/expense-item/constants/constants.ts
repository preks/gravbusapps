/**
 * Constants for the expense item form
 */
export const REQUEST_STATUS = {
  CREATED: "CREATED"
} as const;

export const FORM_STEPS = {
  START: "start",
  FORM: "form"
} as const;

export type FormStepType = typeof FORM_STEPS[keyof typeof FORM_STEPS];

export const DEFAULT_EMPLOYEE_ID = "";
export const DEFAULT_EXPENSE_SOURCE = "GENERAL_EXPENSE_RULE";
export const DEFAULT_EXPENSE_STATUS = REQUEST_STATUS.CREATED;
export const PRIORITY_CURRENCIES = ["EUR", "USD", "RON"];

export const generateUniqueId = () => `position-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const DEFAULT_POSITION = {
  id: generateUniqueId(),
  expenseGroup: "",
  expenseType: "",
  amount: 0,
  costCenter: "",
  customField: "",
  isReimbursable: true,
};
