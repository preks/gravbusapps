// Main form component
export { default as InvestmentForm } from "./InvestmentForm";
export { default } from "./InvestmentForm";

// Form components
export { default as InvestmentFormComponent } from "./components/InvestmentFormComponent";
export { default as OwnerSelector } from "./components/OwnerSelector";
export { default as EmployeeSelectionModal } from "./components/EmployeeSelectionModal";
export { default as SearchableSelect } from "./components/SearchableSelect";

// Context and hooks
export { InvestmentFormProvider, useInvestmentFormContext } from "./context/InvestmentFormContext";

export { useEmployeePositions } from "./hooks/useEmployeePositions";
export { useAccountsData } from "./hooks/useAccountsData";
export {
  useInvestmentGroups,
  useInvestmentGroupCatalog,
  INVESTMENT_GROUP_CATALOG,
  CATALOG_VERSION,
} from "./hooks/useInvestmentGroupCatalog";

// GraphQL queries
export { useGetInvestmentById, GET_INVESTMENT_BY_ID } from "./queries/InvestmentQueries";
export type { InvestmentData, InvestmentQueryVariables, InvestmentDataResponse } from "./queries/InvestmentQueries";

// Types
export type {
  InvestmentFormValues,
  SelectOption,
  InvestmentContextState,
  InvestmentApiPayload,
  InvestmentApiResponse,
} from "./types";

// API client
export {
  InvestmentApiClient,
  investmentApiClient,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  saveInvestment,
} from "./utils/apiClient";

// Utilities
export {
  toStringOrUndefined,
  toNumberOrUndefined,
  isRequired,
  isPositiveNumber,
  validateInvestmentForm,
  formatCurrency,
  parseCurrency,
  type ValidationResult,
} from "./utils/validationUtils";
