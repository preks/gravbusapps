import { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout/types'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'

/**
 * Maps investment opportunity data to investment form values
 * Maps static fields + dynamic fields based on form field definitions
 * Uses investmentTypeId instead of separate group/type refs
 *
 * @param opportunityData - The opportunity data from GraphQL
 * @param formFieldsDefinition - Form field definitions from catalog (optional)
 * @param getPathByType - Function to get path by type ID (for converting to investmentTypeId)
 * @returns Partial investment form values with static and dynamic fields mapped
 */
export const transformOpportunity = (
  opportunityData: InvestmentOpportunity,
  formFieldsDefinition?: DynamicFormConfiguration,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
): Partial<InvestmentFormValues> => {
  if (!opportunityData) {
    return {}
  }

  // Extract group/type IDs
  const groupId = opportunityData.investmentGroup?.id || opportunityData.investmentGroupRef || null
  const typeId = opportunityData.investmentType?.id || opportunityData.investmentTypeRef || null

  // Convert to single investmentTypeId if getPathByType is available
  const investmentTypeId =
    getPathByType && (groupId || typeId)
      ? mapToSingleInvestmentTypeId(groupId, typeId, null, getPathByType)
      : typeId || groupId

  // NOTE: Form state stores investmentTypeId in investment object
  const result: Partial<InvestmentFormValues> = {
    investment: {
      // Static field mappings from opportunity to investment form
      ownerEmployee: opportunityData.ownerEmployee as any,
      ownerEmployeeId: opportunityData.ownerEmployee?.id || opportunityData.ownerEmployeeId || '',
      name: opportunityData.investmentName || opportunityData.name || '',
      currencyRef: opportunityData.currency?.id || opportunityData.currencyRef || '',
      investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any, // Default status as object
      investmentAccount: opportunityData.account as any,
      investmentAccountId: opportunityData.account?.id || opportunityData.accountId || '',
      // Investment type field (leaf InvestmentType ID)
      investmentTypeId: investmentTypeId || null
    }
  }

  // Map additional common investment fields to main investment object
  if (opportunityData.investmentRole) {
    result.investment = { ...result.investment, investmentRole: opportunityData.investmentRole } as any
  }
  if (opportunityData.investmentStakeType) {
    result.investment = { ...result.investment, investmentStakeType: opportunityData.investmentStakeType } as any
  }

  // If no form fields definition provided, return static fields only
  if (!formFieldsDefinition?.formFields?.length) {
    return result
  }

  // Map dynamic fields based on form field definitions
  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      const propertyPath = field.property
      const parts = propertyPath.split('.')
      if (parts.length < 2) {
        continue
      }

      const entityType = parts[0]
      const fieldPath = parts.slice(1).join('.')
      const opportunityValue = fieldPath.split('.').reduce((obj, key) => obj?.[key], opportunityData as any)

      if (opportunityValue === undefined || opportunityValue === null) {
        continue
      }

      // Map to the correct entity
      if (entityType === 'investment') {
        result.investment = { ...result.investment, [fieldPath]: opportunityValue } as any
      } else if (entityType === 'equityInvestment') {
        result.equityInvestment = { ...result.equityInvestment, [fieldPath]: opportunityValue } as any
      } else if (entityType === 'realEstateInvestment') {
        result.realEstateInvestment = { ...result.realEstateInvestment, [fieldPath]: opportunityValue } as any
      } else if (entityType === 'liquidFundInvestment') {
        result.liquidFundInvestment = { ...result.liquidFundInvestment, [fieldPath]: opportunityValue } as any
      }
    }
  }

  return result
}
