import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import dayjs from 'dayjs'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapToFormValues } from '@/common/utils/formMappingUtils'

/**
 * Transforms Investment to InvestmentFormValues structure for Investment Report Form
 * Used when creating a new report from an existing investment
 */
export const transformInvestment = (
  investment: Investment,
  investmentId: string | undefined,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
): Partial<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }> => {
  // Create base schema for mapping
  const baseSchema = createDynamicInvestmentSchema(undefined)

  // Map investment data to form values (automatic mapping of all fields)
  const mappedValues = mapToFormValues({ investment }, baseSchema) as Partial<InvestmentFormValues>

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
    liquidFundTypeId = liquidFund?.investmentLiquidFundTypeRef || null
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
    ;(mappedValues as any).realEstateInvestment = realEstate
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

  // Remove id and version from investment - these belong to the investment, not the report
  if (mappedValues.investment) {
    delete (mappedValues.investment as any).id
    delete (mappedValues.investment as any).version
  }

  // Remove id and version from sub-investments - these belong to the investment, not the report
  // Sub-investments are at the top level, not nested in investment
  if ((mappedValues as any).equityInvestment) {
    ;(mappedValues as any).equityInvestment = {
      ...(mappedValues as any).equityInvestment,
      id: undefined,
      version: undefined
    }
  }
  if ((mappedValues as any).liquidFundInvestment) {
    ;(mappedValues as any).liquidFundInvestment = {
      ...(mappedValues as any).liquidFundInvestment,
      id: undefined,
      version: undefined
    }
  }
  if ((mappedValues as any).realEstateInvestment) {
    ;(mappedValues as any).realEstateInvestment = {
      ...(mappedValues as any).realEstateInvestment,
      id: undefined,
      version: undefined
    }
  }

  // Set investment.id and investmentId so InvestmentLayout recognizes it
  if (mappedValues.investment && investmentId) {
    ;(mappedValues.investment as any).id = investmentId
    ;(mappedValues.investment as any).investmentId = investmentId
  }

  // Convert null to undefined for optional string fields
  if ((mappedValues.investment as any)?.code === null) {
    delete (mappedValues.investment as any).code
  }

  return {
    ...mappedValues,
    investmentReportDate: dayjs().format('YYYY-MM-DD'),
    investmentReportScope: 'MONTHLY'
  } as any
}
