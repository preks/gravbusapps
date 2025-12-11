import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
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
 * Transforms InvestmentReport to InvestmentFormValues structure
 * Treats InvestmentReport as Investment - just maps field names:
 * - InvestmentReport → Investment (all top-level fields except report-specific ones)
 * - InvestmentReport.liquidFundInvestmentReport[0] → Investment.liquidFundInvestment
 * - InvestmentReport.equityInvestmentReport[0] → Investment.equityInvestment
 * - InvestmentReport.realEstateInvestmentReport[0] → Investment.realEstateInvestment
 * - InvestmentReport.investmentRoleReport → Investment.investmentRole
 */
export const transformInvestmentReport = (
  report: InvestmentReport | Partial<InvestmentReport>,
  reportId: string | undefined,
  investmentId: string | undefined,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
): Partial<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }> => {
  // Step 1: Build Investment-like object from report
  // Start with nested investment (for InvestmentInformationSegment fields)
  const baseInvestment = report.investment ? { ...report.investment } : {}

  // Step 2: Overlay all report-level fields (these are snapshot fields)
  // Extract sub-reports and investmentRoleReport first
  const equityInvestmentReport = report.equityInvestmentReport
  const liquidFundInvestmentReport = report.liquidFundInvestmentReport
  const realEstateInvestmentReport = report.realEstateInvestmentReport
  const investmentRoleReport = report.investmentRoleReport

  // Exclude report-specific fields: date, scope, investmentId, investment, sub-reports, investmentRoleReport
  const reportFields = { ...report }
  delete reportFields.date
  delete reportFields.scope
  delete reportFields.investmentId
  delete reportFields.investment
  delete reportFields.equityInvestmentReport
  delete reportFields.liquidFundInvestmentReport
  delete reportFields.realEstateInvestmentReport
  delete reportFields.investmentRoleReport
  delete reportFields.loanRecipientInvestmentAccount

  // Merge report-level fields into investment object
  // These override nested investment fields (snapshot data)
  const investmentLike: Partial<Investment> = {
    ...baseInvestment,
    ...reportFields
  }

  // Step 3: Map sub-reports to sub-investments
  // Keep date and scope in sub-investments (they're part of the sub-investment report types)
  if (equityInvestmentReport && equityInvestmentReport.length > 0) {
    const equityReport = equityInvestmentReport[0]
    // Keep date and scope - they're part of EquityInvestmentReport
    ;(investmentLike as any).equityInvestment = reportId
      ? equityReport
      : { ...equityReport, id: undefined, version: undefined }
  }

  if (liquidFundInvestmentReport && liquidFundInvestmentReport.length > 0) {
    const liquidFundReport = liquidFundInvestmentReport[0]
    // Keep date and scope - they're part of LiquidFundInvestmentReport
    ;(investmentLike as any).liquidFundInvestment = reportId
      ? liquidFundReport
      : { ...liquidFundReport, id: undefined, version: undefined }
  }

  if (realEstateInvestmentReport && realEstateInvestmentReport.length > 0) {
    const realEstateReport = realEstateInvestmentReport[0]
    // Keep date and scope - they're part of RealEstateInvestmentReport
    ;(investmentLike as any).realEstateInvestment = reportId
      ? realEstateReport
      : { ...realEstateReport, id: undefined, version: undefined }
  }

  // Step 4: Map investmentRoleReport to investmentRole
  if (investmentRoleReport) {
    ;(investmentLike as any).investmentRole = investmentRoleReport
  }

  // Step 5: Use mapToFormValues to transform Investment-like object to form values
  const baseSchema = createDynamicInvestmentSchema()
  const mappedValues = mapToFormValues({ investment: investmentLike }, baseSchema) as Partial<InvestmentFormValues>

  // Extract sub-investments from investmentLike and set them at top level (like investment-form does)
  // This is needed because mapToFormValues maps them inside investment, but form expects them at top level
  if ((investmentLike as any).equityInvestment) {
    ;(mappedValues as any).equityInvestment = (investmentLike as any).equityInvestment
  }
  if ((investmentLike as any).liquidFundInvestment) {
    ;(mappedValues as any).liquidFundInvestment = (investmentLike as any).liquidFundInvestment
  }
  if ((investmentLike as any).realEstateInvestment) {
    ;(mappedValues as any).realEstateInvestment = (investmentLike as any).realEstateInvestment
  }

  // mapToFormValues only maps fields in schema.shape, but investment schema uses .catchall(z.any())
  // So we need to manually merge all fields from investmentLike that weren't mapped
  // This ensures all report-level snapshot fields (like totalInvestmentAmount, investmentMarketValue, etc.) are included
  if (mappedValues.investment) {
    // Merge all fields from investmentLike into mappedValues.investment
    // This ensures all dynamic segment fields are included
    Object.keys(investmentLike).forEach(key => {
      if (!(key in mappedValues.investment!)) {
        ;(mappedValues.investment as any)[key] = (investmentLike as any)[key]
      }
    })
  }

  // Also merge sub-investment fields that weren't mapped (for dynamic fields in sub-investments)
  if ((investmentLike as any).equityInvestment && mappedValues.equityInvestment) {
    Object.keys((investmentLike as any).equityInvestment).forEach(key => {
      if (!(key in mappedValues.equityInvestment!)) {
        ;(mappedValues.equityInvestment as any)[key] = ((investmentLike as any).equityInvestment as any)[key]
      }
    })
  }
  if ((investmentLike as any).liquidFundInvestment && mappedValues.liquidFundInvestment) {
    Object.keys((investmentLike as any).liquidFundInvestment).forEach(key => {
      if (!(key in mappedValues.liquidFundInvestment!)) {
        ;(mappedValues.liquidFundInvestment as any)[key] = ((investmentLike as any).liquidFundInvestment as any)[key]
      }
    })
  }
  if ((investmentLike as any).realEstateInvestment && mappedValues.realEstateInvestment) {
    Object.keys((investmentLike as any).realEstateInvestment).forEach(key => {
      if (!(key in mappedValues.realEstateInvestment!)) {
        ;(mappedValues.realEstateInvestment as any)[key] = ((investmentLike as any).realEstateInvestment as any)[key]
      }
    })
  }

  // Step 6: Set investment type ID from nested investment
  if (getPathByType && report.investment) {
    const groupId = report.investment.investmentGroupRef || null
    const typeId = report.investment.investmentTypeRef || null

    let liquidFundTypeId: string | null = null
    if (report.investment.liquidFundInvestment) {
      const liquidFund = normalizeSubInvestment(report.investment.liquidFundInvestment)
      liquidFundTypeId = liquidFund?.investmentLiquidFundTypeRef || null
    }

    const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, liquidFundTypeId, getPathByType)
    if (investmentTypeId && mappedValues.investment) {
      ;(mappedValues.investment as any).investmentTypeId = investmentTypeId
    }
  }

  // Step 7: Set IDs
  if (mappedValues.investment && investmentId) {
    ;(mappedValues.investment as any).id = investmentId
    ;(mappedValues.investment as any).investmentId = investmentId
  }

  if (reportId && mappedValues.investment) {
    ;(mappedValues.investment as any).reportId = reportId
    ;(mappedValues.investment as any).reportVersion = report.version
  }

  // Step 8: Normalize liquid fund investment array
  const liquidFundNormalized = (mappedValues as any).liquidFundInvestment
    ? Array.isArray((mappedValues as any).liquidFundInvestment)
      ? (mappedValues as any).liquidFundInvestment[0]
      : (mappedValues as any).liquidFundInvestment
    : null

  return {
    ...mappedValues,
    ...(liquidFundNormalized && { liquidFundInvestment: liquidFundNormalized }),
    investmentReportDate: report.date || dayjs().format('YYYY-MM-DD'),
    investmentReportScope: report.scope || 'MONTHLY'
  }
}
