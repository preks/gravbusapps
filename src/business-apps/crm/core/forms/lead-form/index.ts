// Main components
export { default } from './LeadForm'
export { default as LeadFormComponent } from './components/LeadFormComponent'

// Section components
export { default as LeadInformationSection } from './components/LeadInformationSection'
export { default as ContactInformationSection } from './components/ContactInformationSection'
export { default as CompanyInformationSection } from './components/CompanyInformationSection'
export { default as AddressInformationSection } from './components/AddressInformationSection'
export { default as DescriptionSection } from './components/DescriptionSection'
export { default as OwnerSelector } from './components/OwnerSelector'
export { default as EmployeeSelectionModal } from './components/EmployeeSelectionModal'

// Context
export { LeadFormProvider, useLeadFormContext } from './context/LeadFormContext'

// Types
export type { LeadFormValues, SelectOption, LeadContextState } from './types'

// Hooks
export { useAccountsData } from './hooks/useAccountsData'
export { useContactsData } from './hooks/useContactsData'
export { useEmployeePositions } from './hooks/useEmployeePositions'
export type {
  UseEmployeePositionsProps,
  UseEmployeePositionsReturn,
  EmployeePositionData
} from './hooks/useEmployeePositions'
export { useEmployeeById } from './hooks/useEmployeeById'
export type { UseEmployeeByIdProps, UseEmployeeByIdReturn, EmployeeByIdData } from './hooks/useEmployeeById'
export { useLeadCatalogs } from './hooks/useLeadCatalogs'
export { useRegions } from './hooks/useRegions'

// Queries
export { useGetLeadById } from './queries/LeadQueries'
export type { LeadQueryResult, LeadQueryVariables } from './queries/LeadQueries'

// Utilities
export { toStringOrUndefined, validateEmail, validatePhone, salutationOptions } from './utils/validationUtils'

// Constants
export {
  LEAD_SOURCE_CATALOG,
  LEAD_STATUS_CATALOG,
  LEAD_RATING_CATALOG,
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  COUNTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  CATALOG_VERSION
} from './hooks/useLeadCatalogs'
