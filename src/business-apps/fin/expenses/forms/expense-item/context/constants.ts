
export const DEFAULT_EMPLOYEE_ID = "86a8317d-34ef-4e04-951b-b0bb9754dea0";

export const GRAPHQL_API_ENDPOINT = "https://newwork-dev.newwork.com/v1/graphql";

export const DEFAULT_EXPENSE_SOURCE = "GENERAL_EXPENSE_RULE";

export const DEFAULT_EXPENSE_STATUS = "CREATED";

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
