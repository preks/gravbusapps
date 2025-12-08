import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import dayjs from 'dayjs'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapToFormValues } from '@/common/utils/formMappingUtils'

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
  // Extract investment data from report
  // Priority: 1) report.investment, 2) report itself (if no investment object)
  // IMPORTANT: Never include investment id/version - these belong to the investment, not the report
  // Only the report itself should have id/version when updating (handled separately)
  const investmentData: Partial<Investment> = report.investment
    ? {
        ...report.investment,
        // Exclude id and version - these belong to the investment, not the report
        id: undefined,
        version: undefined,
        // Convert null to undefined for optional fields
        ...(report.investment.code === null ? {} : { code: report.investment.code })
      }
    : {
        // If no investment object, create from report fields
        // Exclude id and version - these belong to the investment, not the report
        name: (report as any).name || '',
        // Convert null to undefined for optional fields
        ...((report as any).code === null ? {} : { code: (report as any).code })
      }

  // Merge with fetchedInvestment if provided (for additional fields that might be missing)
  // IMPORTANT: Exclude id and version from fetchedInvestment - these belong to the investment, not the report
  const mergedInvestmentData = fetchedInvestment
    ? {
        ...fetchedInvestment,
        // Exclude id and version from fetched investment
        id: undefined,
        version: undefined,
        // Exclude id and version from sub-investments in fetchedInvestment
        ...(fetchedInvestment.equityInvestment
          ? {
              equityInvestment: Array.isArray(fetchedInvestment.equityInvestment)
                ? fetchedInvestment.equityInvestment.map((eq: any) => ({
                    ...eq,
                    id: undefined,
                    version: undefined
                  }))
                : {
                    ...fetchedInvestment.equityInvestment,
                    id: undefined,
                    version: undefined
                  }
            }
          : {}),
        ...(fetchedInvestment.liquidFundInvestment
          ? {
              liquidFundInvestment: Array.isArray(fetchedInvestment.liquidFundInvestment)
                ? fetchedInvestment.liquidFundInvestment.map((lf: any) => ({
                    ...lf,
                    id: undefined,
                    version: undefined
                  }))
                : {
                    ...fetchedInvestment.liquidFundInvestment,
                    id: undefined,
                    version: undefined
                  }
            }
          : {}),
        ...(fetchedInvestment.realEstateInvestment
          ? {
              realEstateInvestment: Array.isArray(fetchedInvestment.realEstateInvestment)
                ? fetchedInvestment.realEstateInvestment.map((re: any) => ({
                    ...re,
                    id: undefined,
                    version: undefined
                  }))
                : {
                    ...fetchedInvestment.realEstateInvestment,
                    id: undefined,
                    version: undefined
                  }
            }
          : {}),
        ...investmentData // investmentData takes precedence
      }
    : investmentData

  // Create base schema for mapping
  const baseSchema = createDynamicInvestmentSchema(undefined)

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
  // Only include id and version if we're updating an existing report
  if (report.equityInvestmentReport && report.equityInvestmentReport.length > 0) {
    ;(mappedValues as any).equityInvestment = reportId
      ? report.equityInvestmentReport[0] // Include id/version in update mode
      : {
          ...report.equityInvestmentReport[0],
          id: undefined,
          version: undefined
        } // Exclude id/version in create mode
  }

  if (report.liquidFundInvestmentReport && report.liquidFundInvestmentReport.length > 0) {
    ;(mappedValues as any).liquidFundInvestment = reportId
      ? report.liquidFundInvestmentReport[0] // Include id/version in update mode
      : {
          ...report.liquidFundInvestmentReport[0],
          id: undefined,
          version: undefined
        } // Exclude id/version in create mode
  }

  if (report.realEstateInvestmentReport && report.realEstateInvestmentReport.length > 0) {
    ;(mappedValues as any).realEstateInvestment = reportId
      ? report.realEstateInvestmentReport[0] // Include id/version in update mode
      : {
          ...report.realEstateInvestmentReport[0],
          id: undefined,
          version: undefined
        } // Exclude id/version in create mode
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
