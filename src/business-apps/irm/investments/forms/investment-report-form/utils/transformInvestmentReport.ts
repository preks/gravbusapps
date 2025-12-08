import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import dayjs from 'dayjs'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapToFormValues } from '@/common/utils/formMappingUtils'

/**
 * Extract investment data from report, excluding id/version
 */
const extractInvestmentDataFromReport = (report: InvestmentReport | Partial<InvestmentReport>): Partial<Investment> => {
  if (report.investment) {
    return {
      ...report.investment,
      id: undefined,
      version: undefined,
      ...(report.investment.code === null ? {} : { code: report.investment.code })
    }
  }
  return {
    name: (report as any).name || '',
    ...((report as any).code === null ? {} : { code: (report as any).code })
  }
}

/**
 * Remove id/version from a sub-investment (handles both array and single object)
 */
const removeIdVersionFromSubInvestment = (subInvestment: any): any => {
  if (Array.isArray(subInvestment)) {
    return subInvestment.map((item: any) => ({
      ...item,
      id: undefined,
      version: undefined
    }))
  }
  return {
    ...subInvestment,
    id: undefined,
    version: undefined
  }
}

/**
 * Merge fetched investment with report investment data, excluding id/version
 */
const mergeInvestmentData = (
  investmentData: Partial<Investment>,
  fetchedInvestment?: Investment | null | undefined
): Partial<Investment> => {
  if (!fetchedInvestment) {
    return investmentData
  }

  return {
    ...fetchedInvestment,
    id: undefined,
    version: undefined,
    ...(fetchedInvestment.equityInvestment
      ? { equityInvestment: removeIdVersionFromSubInvestment(fetchedInvestment.equityInvestment) }
      : {}),
    ...(fetchedInvestment.liquidFundInvestment
      ? { liquidFundInvestment: removeIdVersionFromSubInvestment(fetchedInvestment.liquidFundInvestment) }
      : {}),
    ...(fetchedInvestment.realEstateInvestment
      ? { realEstateInvestment: removeIdVersionFromSubInvestment(fetchedInvestment.realEstateInvestment) }
      : {}),
    ...investmentData
  }
}

/**
 * Map sub-investment report to form values (with or without id/version based on mode)
 */
const mapSubInvestmentReport = (reportItem: any, reportId: string | undefined): any => {
  if (reportId) {
    return reportItem
  }
  return {
    ...reportItem,
    id: undefined,
    version: undefined
  }
}

/**
 * Transforms InvestmentReport to InvestmentFormValues structure
 * Used for initializing the form with report data
 */
export const transformInvestmentReport = (
  report: InvestmentReport | Partial<InvestmentReport>,
  reportId: string | undefined,
  investmentId: string | undefined,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[],
  fetchedInvestment?: Investment | null | undefined
): Partial<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }> => {
  const investmentData = extractInvestmentDataFromReport(report)
  const mergedInvestmentData = mergeInvestmentData(investmentData, fetchedInvestment)

  // Create base schema for mapping
  const baseSchema = createDynamicInvestmentSchema()

  // Map investment data to form values (automatic mapping of all fields)
  const mappedValues = mapToFormValues(
    { investment: mergedInvestmentData },
    baseSchema
  ) as Partial<InvestmentFormValues>

  // Extract IDs - einfach die Ref-Felder nehmen, keine Fallbacks
  const groupId = mergedInvestmentData.investmentGroupRef || null
  const typeId = mergedInvestmentData.investmentTypeRef || null

  // Extract liquidFundTypeId from liquidFundInvestment
  let liquidFundTypeId: string | null = null
  if (mergedInvestmentData.liquidFundInvestment) {
    const liquidFund = Array.isArray(mergedInvestmentData.liquidFundInvestment)
      ? mergedInvestmentData.liquidFundInvestment[0]
      : mergedInvestmentData.liquidFundInvestment
    liquidFundTypeId = (liquidFund as any)?.investmentLiquidFundTypeRef || null
  }

  // Convert to single investmentTypeId
  const investmentTypeId = getPathByType
    ? mapToSingleInvestmentTypeId(groupId, typeId, liquidFundTypeId, getPathByType)
    : null

  if (investmentTypeId && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentTypeId = investmentTypeId
  }

  // Map investmentRoleReport (from InvestmentReport) to investmentRole (for Layout)
  if (report.investmentRoleReport && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentRole = report.investmentRoleReport
  }

  // Map Sub-Groups (from InvestmentReport) to Layout field names (without "Report")
  if (report.equityInvestmentReport && report.equityInvestmentReport.length > 0) {
    ;(mappedValues as any).equityInvestment = mapSubInvestmentReport(report.equityInvestmentReport[0], reportId)
  }

  if (report.liquidFundInvestmentReport && report.liquidFundInvestmentReport.length > 0) {
    ;(mappedValues as any).liquidFundInvestment = mapSubInvestmentReport(report.liquidFundInvestmentReport[0], reportId)
  }

  if (report.realEstateInvestmentReport && report.realEstateInvestmentReport.length > 0) {
    ;(mappedValues as any).realEstateInvestment = mapSubInvestmentReport(report.realEstateInvestmentReport[0], reportId)
  }

  // Set investment.id and investmentId so InvestmentLayout automatically loads it
  // IMPORTANT: investment.id should be the investmentId (for InvestmentLayout), not the report id
  if (mappedValues.investment && investmentId) {
    ;(mappedValues.investment as any).id = investmentId
    ;(mappedValues.investment as any).investmentId = investmentId
  }

  // Store report id and version in form data when updating (for sanitizer to include in payload)
  // These are separate from investment.id - investment.id is the investmentId, reportId is the report's id
  if (reportId && mappedValues.investment) {
    ;(mappedValues.investment as any).reportId = reportId
    ;(mappedValues.investment as any).reportVersion = report.version
  }

  // Normalize liquidFundInvestment array if present
  const liquidFundNormalized =
    (mappedValues as any).liquidFundInvestment && Array.isArray((mappedValues as any).liquidFundInvestment)
      ? (mappedValues as any).liquidFundInvestment[0]
      : (mappedValues as any).liquidFundInvestment

  return {
    ...mappedValues,
    ...(liquidFundNormalized && {
      liquidFundInvestment: liquidFundNormalized
    }),
    // Store report-specific fields at root level for form fields
    investmentReportDate: report.date || dayjs().format('YYYY-MM-DD'),
    investmentReportScope: report.scope || 'MONTHLY'
  } as any
}
