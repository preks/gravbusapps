// Main form component
export { default as InvestmentForm } from "./InvestmentForm";
export { default } from "./InvestmentForm";

// Form components
export { default as InvestmentFormComponent } from "./components/InvestmentFormComponent";

// Context and hooks
export { InvestmentFormProvider, useInvestmentFormContext } from "./context/InvestmentFormContext";

export { useEmployeePositions } from "./hooks/useEmployeePositions";
export {
  useInvestmentGroups,
  useInvestmentGroupCatalog,
  INVESTMENT_GROUP_CATALOG,
  CATALOG_VERSION,
} from "./hooks/useInvestmentGroupCatalog";

// Note: Investment queries now use centralized data access from @/common/data/investment

// Types
export type {
  InvestmentFormValues,
  SelectOption,
  InvestmentContextState,
  InvestmentApiPayload,
  InvestmentApiResponse,
} from "./types";

// API client removed - form now works with Kogito flows only

// Utilities (validation utils removed; zod-only validation is used)
