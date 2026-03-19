import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import dayjs from 'dayjs'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapToFormValues } from '@/common/utils/formMappingUtils'

/**
 * Normalize array to single object (for sub-investments)
 */
const normalizeSubInvestment = (subInvestment: any): any => {
  return Array.isArray(subInvestment) ? subInvestment[0] : subInvestment
}

/**
 * Remove id and version from sub-investment
 */
const removeIdVersion = (subInvestment: any): any => {
  return {
    ...subInvestment,
    id: undefined,
    version: undefined
  }
}

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
  const baseSchema = createDynamicInvestmentSchema()

  // Map investment data to form values (automatic mapping of all fields)
  const mappedValues = mapToFormValues({ investment }, baseSchema) as Partial<InvestmentFormValues>

  // IMPORTANT: mapToFormValues only maps fields in the schema, but schema has .catchall(z.any())
  // We need to manually merge all fields from investment to ensure dynamic fields are preserved
  if (mappedValues.investment) {
    // Merge all fields from investment into mappedValues.investment
    // This ensures all dynamic fields (not in base schema) are included
    Object.keys(investment).forEach(key => {
      // Skip fields that are already mapped or should be excluded
      if (key === 'id' || key === 'version' || key === 'investmentAccounts') {
        return
      }
      // Only add if not already present (mapToFormValues might have transformed it)
      if (!(key in mappedValues.investment!)) {
        ;(mappedValues.investment as any)[key] = (investment as any)[key]
      }
    })
  }

  // Extract IDs - einfach die Ref-Felder nehmen, keine Fallbacks
  const groupId = investment.investmentGroupRef || null
  const typeId = investment.investmentTypeRef || null

  // Normalize arrays to single objects
  let liquidFundTypeId: string | null = null
  if (investment.liquidFundInvestment) {
    const liquidFund = normalizeSubInvestment(investment.liquidFundInvestment)
    ;(mappedValues as any).liquidFundInvestment = liquidFund
    liquidFundTypeId = liquidFund?.investmentLiquidFundTypeRef || null
  }

  if (investment.equityInvestment) {
    ;(mappedValues as any).equityInvestment = normalizeSubInvestment(investment.equityInvestment)
  }

  if (investment.realEstateInvestment) {
    ;(mappedValues as any).realEstateInvestment = normalizeSubInvestment(investment.realEstateInvestment)
  }

  // Convert to single investmentTypeId
  const investmentTypeId = getPathByType
    ? mapToSingleInvestmentTypeId(groupId, typeId, liquidFundTypeId, getPathByType)
    : null

  if (investmentTypeId && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentTypeId = investmentTypeId
  }

  if (groupId && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentGroupRef = groupId
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
  if ((mappedValues as any).equityInvestment) {
    const equityInvestment = (mappedValues as any).equityInvestment
    ;(mappedValues as any).equityInvestment = {
      ...removeIdVersion(equityInvestment),
      ...(equityInvestment?.id && { equityInvestmentId: equityInvestment.id })
    }
  }
  if ((mappedValues as any).liquidFundInvestment) {
    const liquidFundInvestment = (mappedValues as any).liquidFundInvestment
    ;(mappedValues as any).liquidFundInvestment = {
      ...removeIdVersion(liquidFundInvestment),
      ...(liquidFundInvestment?.id && { liquidFundInvestmentId: liquidFundInvestment.id })
    }
  }
  if ((mappedValues as any).realEstateInvestment) {
    const realEstateInvestment = (mappedValues as any).realEstateInvestment
    ;(mappedValues as any).realEstateInvestment = {
      ...removeIdVersion(realEstateInvestment),
      ...(realEstateInvestment?.id && { realEstateInvestmentId: realEstateInvestment.id })
    }
  }

  // Set investmentId only (not id) - id belongs to the investment entity, not the report
  // investmentId is used to reference which investment this report is for
  // InvestmentLayout will use investment.investmentId for isUpdate check and entityId
  if (mappedValues.investment && investmentId) {
    ;(mappedValues.investment as any).investmentId = investmentId
  }

  // Convert null to undefined for optional string fields
  if ((mappedValues.investment as any)?.code === null) {
    delete (mappedValues.investment as any).code
  }

  // Explicitly preserve investmentAccounts array if it exists
  if (investment.investmentAccounts && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentAccounts = investment.investmentAccounts
  }

  return {
    ...mappedValues,
    investmentReportDate: dayjs().format('YYYY-MM-DD'),
    investmentReportScope: 'MONTHLY'
  } as any
}
