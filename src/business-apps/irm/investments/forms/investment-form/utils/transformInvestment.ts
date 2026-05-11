import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

/**
 * Transforms mapped investment values by:
 * - Extracting and normalizing array fields (equityInvestment, realEstateInvestment, liquidFundInvestment)
 * - Converting group/type/liquidFundType IDs to single investmentTypeId
 * - Setting default values (investmentStatus)
 * - Normalizing null to undefined
 */
export const transformInvestment = (
  mappedValues: Partial<InvestmentFormValues>,
  investment: Investment,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
): Partial<InvestmentFormValues> => {
  // Extract IDs - einfach die Ref-Felder nehmen, keine Fallbacks
  const groupId = investment.investmentGroupRef || null
  const typeId = investment.investmentTypeRef || null

  // Normalize arrays to single objects
  let liquidFundTypeId: string | null = null
  if (investment.liquidFundInvestment) {
    const liquidFund = Array.isArray(investment.liquidFundInvestment)
      ? investment.liquidFundInvestment[0]
      : investment.liquidFundInvestment
    ;(mappedValues as any).liquidFundInvestment = liquidFund
    // Check both Ref field and nested object for liquid fund type ID
    liquidFundTypeId = liquidFund?.investmentLiquidFundTypeRef || liquidFund?.investmentLiquidFundType?.id || null
  }

  if (investment.equityInvestment) {
    const equity = Array.isArray(investment.equityInvestment)
      ? investment.equityInvestment[0]
      : investment.equityInvestment
    ;(mappedValues as any).equityInvestment = equity
  }

  if (investment.realEstateInvestment) {
    const realEstate = Array.isArray(investment.realEstateInvestment)
      ? investment.realEstateInvestment[0]
      : investment.realEstateInvestment
    // Form uses realEstateInvestment.sizeMeasurementUnit (no Ref). CatalogSelect accepts string id or { id }.
    // When GraphQL returns null for the nested object but sizeMeasurementUnitRef is set, prefill from ref.
    const unit = realEstate?.sizeMeasurementUnit
    const hasUnitObject =
      unit &&
      typeof unit === 'object' &&
      !Array.isArray(unit) &&
      typeof (unit as { id?: string }).id === 'string' &&
      (unit as { id?: string }).id!.length > 0
    const unitRef = realEstate?.sizeMeasurementUnitRef
    ;(mappedValues as any).realEstateInvestment =
      !hasUnitObject && unitRef ? { ...realEstate, sizeMeasurementUnit: unitRef } : realEstate
  }

  // Convert to single investmentTypeId
  const investmentTypeId = getPathByType
    ? mapToSingleInvestmentTypeId(groupId, typeId, liquidFundTypeId, getPathByType)
    : null

  if (investmentTypeId && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentTypeId = investmentTypeId
  }

  // Ensure investmentStatus has a default if missing
  if (!mappedValues.investment?.investmentStatus) {
    mappedValues.investment = {
      ...mappedValues.investment,
      investmentStatus: {
        id: 'InvestmentStatus:v1:ACTIVE',
        code: 'ACTIVE'
      } as any
    }
  }

  // Explicitly preserve investmentAccounts array for update mode prefill (same as investment-report-form)
  if (investment.investmentAccounts && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentAccounts = investment.investmentAccounts
  }

  // Explicitly preserve investment company for update mode prefill (InvestmentCompanySelect needs company object for initialCompany)
  if (investment.investmentCompany && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentCompany = investment.investmentCompany
  }
  if (investment.investmentCompanyId && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentCompanyId = investment.investmentCompanyId
  }

  // Convert null to undefined for optional fields (schema expects string | undefined, not null)
  if (mappedValues.investment?.code === null) {
    delete mappedValues.investment.code
  }

  return mappedValues
}
