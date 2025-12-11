import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { mapFromSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { ReportScope } from '@/common/data/investment/types/investmentEnums'

/**
 * Sanitizes InvestmentFormValues for InvestmentReport API payload
 * - Converts investmentTypeId back to groupId/typeId/liquidFundTypeId
 * - Removes investmentTypeId (not part of API)
 * - Maps investmentRole to investmentRoleReport
 * - Converts subtype objects to arrays with "Report" suffix
 * - Adds report-specific fields (date, scope, investmentId)
 */
export const sanitizeInvestmentReport = (
  formData: InvestmentFormValues & {
    investmentReportDate?: string
    investmentReportScope?: string
  },
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
): Partial<InvestmentReport> => {
  const mergedData: Partial<Investment> = {
    ...formData.investment
  }

  // Convert investmentTypeId back to group/type/liquidFundType for payload
  const investmentTypeId: string | null = formData.investment?.investmentTypeId ?? null
  const { groupId, typeId, liquidFundTypeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

  // Remove investmentTypeId from payload (not part of API)
  delete (mergedData as any).investmentTypeId
  // Add group/type/liquidFundType for payload
  mergedData.investmentGroupRef = groupId ?? undefined
  mergedData.investmentTypeRef = typeId ?? undefined

  // Get report-specific fields directly from formData (no fallbacks)
  const reportDate = (formData as any).investmentReportDate
  const reportScope = (formData as any).investmentReportScope
  const finalInvestmentId = formData.investment?.id

  // Map investment.investmentRole (from Layout) to investmentRoleReport (for Report)
  // Map Sub-Groups (from Layout) to Report field names (with "Report")
  // IMPORTANT: Exclude investment id and version - these belong to the investment, not the report
  // Extract reportId and reportVersion (custom properties added during transform, not part of Investment type)
  const reportId = (mergedData as any).reportId
  const reportVersion = (mergedData as any).reportVersion
  const { investmentRole, ...investmentDataWithoutSubGroups } = mergedData

  // Determine which sub-investment type is active based on investment group
  // Only save the sub-investment report that matches the current investment group
  const groupCode = groupId?.includes(':') ? groupId.split(':').pop() : groupId

  const reportPayload: Partial<InvestmentReport> = {
    ...investmentDataWithoutSubGroups,
    // Include report id and version when updating (from reportId/reportVersion stored in form)
    ...(reportId && { id: reportId }),
    ...(reportVersion !== undefined && { version: reportVersion }),
    // Add report-specific fields from form state
    date: reportDate,
    scope: reportScope as ReportScope | undefined,
    investmentId: finalInvestmentId,
    // Map investmentRole (from Layout) to investmentRoleReport (for Report)
    ...(investmentRole && {
      investmentRoleReport: investmentRole
    })
  }

  // Map Sub-Groups (from Layout) to Report field names (with "Report")
  // Only include the sub-investment that matches the current investment group
  if (groupCode === 'EQUITY' && formData.equityInvestment) {
    reportPayload.equityInvestmentReport = [
      {
        ...formData.equityInvestment,
        date: reportDate,
        scope: reportScope as ReportScope | undefined
      }
    ] as any[]
  } else if (groupCode === 'LIQUID_FUND' && formData.liquidFundInvestment) {
    reportPayload.liquidFundInvestmentReport = [
      {
        ...formData.liquidFundInvestment,
        date: reportDate,
        scope: reportScope as ReportScope | undefined,
        // Add liquidFundTypeId if present
        ...(liquidFundTypeId ? { investmentLiquidFundTypeRef: liquidFundTypeId } : {})
      } as any
    ]
  } else if (groupCode === 'REAL_ESTATE' && formData.realEstateInvestment) {
    reportPayload.realEstateInvestmentReport = [
      {
        ...formData.realEstateInvestment,
        date: reportDate,
        scope: reportScope as ReportScope | undefined
      }
    ] as any[]
  }

  return reportPayload
}
