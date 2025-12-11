// Main form component
export { default as InvestmentForm } from './InvestmentForm'
export { default } from './InvestmentForm'

// Investment catalog queries (used by other parts of the application)
export {
  useGetInvestmentCatalogData,
  type InvestmentCatalogData,
  type FormFieldsDefinition,
  type FormFieldGroup,
  type FormFieldDefinition
} from '../../../../../common/data/investment/hooks/useInvestmentCatalogs'
