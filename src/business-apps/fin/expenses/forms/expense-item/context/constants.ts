import { env } from "../../../../../../common/env/EnvUtils";

export const DEFAULT_EMPLOYEE_ID = "";

export const GRAPHQL_API_ENDPOINT = env("NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK");

export const ICONS_ENDPOINT = env("NEXT_PUBLIC_BASE_URL") + "/_next/static/media/lowcoder-icons"

export const FILES_ENDPOINT = env("NEXT_PUBLIC_FILE_SERVICE_ENDPOINT")

export const EMPLOYEE_FILES_LOCATION = "/api/v1/tenant/files"

export const FILES_ENGINE_ENDPOINT = env("NEXT_PUBLIC_API_SERVER") + "/docs-engine/api/v1"

export const PROCESSES_ENDPOINT = env("NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT")

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
