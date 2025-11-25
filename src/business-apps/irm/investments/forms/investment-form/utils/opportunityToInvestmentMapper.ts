import { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { InvestmentFormValues } from '../types'
import { FormFieldsDefinition } from '../queries/InvestmentCatalogQueries'

/**
 * Maps investment opportunity data to investment form values
 * Maps static fields + dynamic fields based on form field definitions
 * Uses full objects instead of extracting IDs
 *
 * @param opportunityData - The opportunity data from GraphQL
 * @param formFieldsDefinition - Form field definitions from catalog (optional)
 * @returns Partial investment form values with static and dynamic fields mapped
 */
export const mapOpportunityToInvestmentFormValues = (
  opportunityData: InvestmentOpportunity,
  formFieldsDefinition?: FormFieldsDefinition
): Partial<InvestmentFormValues> => {
  if (!opportunityData) {
    return {}
  }

  // NOTE: Form state stores full objects, not IDs
  // This avoids redundant API calls and simplifies the code
  const result: Partial<InvestmentFormValues> = {
    investment: {
      // Static field mappings from opportunity to investment form (full objects)
      ownerEmployee: opportunityData.ownerEmployee as any,
      name: opportunityData.investmentName || opportunityData.name || '',
      currency: opportunityData.currency as any,
      investmentGroup: opportunityData.investmentGroup as any,
      investmentType: opportunityData.investmentType as any,
      investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any, // Default status as object
      investmentAccount: opportunityData.account as any
    }
  }

  // If no form fields definition provided, return static fields only
  if (!formFieldsDefinition || !formFieldsDefinition.formFields) {
    return result
  }

  // Map dynamic fields based on form field definitions
  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      // Extract property path (e.g., "investment.acquisitionDate", "equityInvestment.marketValue")
      const propertyPath = field.property

      // Split into entity type and field path
      const parts = propertyPath.split('.')
      if (parts.length < 2) {
        continue // Invalid property path
      }

      const entityType = parts[0] // "investment", "equityInvestment", "realEstateInvestment", "liquidFundInvestment"
      const fieldPath = parts.slice(1).join('.') // All parts after entity type

      // Handle nested paths (e.g., additionalProperties.fieldName)
      const opportunityValue = fieldPath.split('.').reduce((obj, key) => obj?.[key], opportunityData as any)

      // Skip if field doesn't exist in opportunity or is undefined/null
      if (opportunityValue === undefined || opportunityValue === null) {
        continue
      }

      // Map to the correct entity in the investment form structure
      if (entityType === 'investment') {
        result.investment = {
          ...result.investment,
          [fieldPath]: opportunityValue
        } as any
      } else if (entityType === 'equityInvestment') {
        result.equityInvestment = {
          ...result.equityInvestment,
          [fieldPath]: opportunityValue
        } as any
      } else if (entityType === 'realEstateInvestment') {
        result.realEstateInvestment = {
          ...result.realEstateInvestment,
          [fieldPath]: opportunityValue
        } as any
      } else if (entityType === 'liquidFundInvestment') {
        result.liquidFundInvestment = {
          ...result.liquidFundInvestment,
          [fieldPath]: opportunityValue
        } as any
      }
    }
  }

  return result
}
