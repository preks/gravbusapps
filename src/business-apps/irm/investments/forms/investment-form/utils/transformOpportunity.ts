import { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout/types'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'

/**
 * Extract investment type ID from opportunity data
 */
const extractInvestmentTypeId = (
  opportunityData: InvestmentOpportunity,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
): string | null => {
  const groupId = opportunityData.investmentGroup?.id || opportunityData.investmentGroupRef || null
  const typeId = opportunityData.investmentType?.id || opportunityData.investmentTypeRef || null

  if (getPathByType && (groupId || typeId)) {
    return mapToSingleInvestmentTypeId(groupId, typeId, null, getPathByType)
  }

  return typeId || groupId
}

/**
 * Create base investment form values from opportunity static fields
 */
const createBaseInvestmentValues = (
  opportunityData: InvestmentOpportunity,
  investmentTypeId: string | null
): Partial<InvestmentFormValues> => {
  // Map opportunity account associations to investment account associations
  // GraphQL field name: opportunityAccounts on InvestmentOpportunity
  const investmentInvestmentAccounts =
    opportunityData.opportunityAccounts?.map(assoc => ({
      investmentAccountId: assoc.accountId || assoc.account?.id || '',
      investmentAccountTypeRef: assoc.accountTypeRef,
      // Preserve the account object for display if available
      investmentAccount: assoc.account as any
    })) || []

  const result: Partial<InvestmentFormValues> = {
    investment: {
      ownerEmployee: opportunityData.ownerEmployee as any,
      ownerEmployeeId: opportunityData.ownerEmployee?.id || opportunityData.ownerEmployeeId || '',
      name: opportunityData.investmentName || opportunityData.name || '',
      currencyRef: opportunityData.currency?.id || opportunityData.currencyRef || '',
      investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any,
      investmentAccounts: investmentInvestmentAccounts as any, // GraphQL field name
      investmentTypeId: investmentTypeId || null,
      company: (opportunityData.company as any) || undefined,
      companyId: opportunityData.companyId || undefined
    }
  }

  if (opportunityData.investmentRole) {
    result.investment = { ...result.investment, investmentRole: opportunityData.investmentRole } as any
  }
  if (opportunityData.investmentStakeType) {
    result.investment = { ...result.investment, investmentStakeType: opportunityData.investmentStakeType } as any
  }

  return result
}

/**
 * Map dynamic field value to correct entity in result
 */
const mapDynamicFieldToEntity = (
  result: Partial<InvestmentFormValues>,
  entityType: string,
  fieldPath: string,
  opportunityValue: any
): void => {
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

/**
 * Map dynamic fields from form field definitions
 */
const mapDynamicFields = (
  opportunityData: InvestmentOpportunity,
  formFieldsDefinition: DynamicFormConfiguration,
  result: Partial<InvestmentFormValues>
): void => {
  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      const propertyPath = field.property
      const parts = propertyPath.split('.')
      if (parts.length < 2) continue

      const entityType = parts[0]
      const fieldPath = parts.slice(1).join('.')
      const opportunityValue = fieldPath.split('.').reduce((obj, key) => obj?.[key], opportunityData as any)

      if (opportunityValue === undefined || opportunityValue === null) continue

      mapDynamicFieldToEntity(result, entityType, fieldPath, opportunityValue)
    }
  }
}

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

  const investmentTypeId = extractInvestmentTypeId(opportunityData, getPathByType)
  const result = createBaseInvestmentValues(opportunityData, investmentTypeId)

  if (formFieldsDefinition?.formFields?.length) {
    mapDynamicFields(opportunityData, formFieldsDefinition, result)
  }

  return result
}
