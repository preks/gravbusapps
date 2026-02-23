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
  const investmentGroupRefFromForm =
    typeof formData.investment?.investmentGroupRef === 'string' ? formData.investment.investmentGroupRef : null
  const { groupId, typeId, liquidFundTypeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

  // Remove investmentTypeId from payload (not part of API)
  delete (mergedData as any).investmentTypeId
  // Add group/type/liquidFundType for payload
  mergedData.investmentGroupRef = groupId ?? investmentGroupRefFromForm ?? undefined
  mergedData.investmentTypeRef = typeId ?? undefined

  // Get report-specific fields directly from formData (no fallbacks)
  const reportDate = (formData as any).investmentReportDate
  const reportScope = (formData as any).investmentReportScope
  // Use investmentId field (not id) - id belongs to the investment entity, not the report
  // investmentId is a custom property added during transform, not part of Investment type
  const finalInvestmentId = (formData.investment as any)?.investmentId

  // Map investment.investmentRole (from Layout) to investmentRoleReport (for Report)
  // Map Sub-Groups (from Layout) to Report field names (with "Report")
  // IMPORTANT: Exclude investment id and version - these belong to the investment, not the report
  // Extract reportId and reportVersion (custom properties added during transform, not part of Investment type)
  const reportId = (mergedData as any).reportId
  const reportVersion = (mergedData as any).reportVersion

  // Exclude investment id and version - these belong to the investment, not the report
  // Delete them from mergedData before spreading
  delete (mergedData as any).id
  delete (mergedData as any).version
  const { investmentRole, ...investmentDataWithoutSubGroups } = mergedData

  // Determine group code for optional subtype tie-breaking when multiple subtype objects are present.
  const resolvedGroupId = mergedData.investmentGroupRef
  const groupCode =
    typeof resolvedGroupId === 'string' && resolvedGroupId.includes(':')
      ? resolvedGroupId.split(':').pop()
      : (resolvedGroupId as string | undefined)

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

  // Map subtype objects to report subtype payloads.
  // Keep this presence-driven (same principle as investment-form) so generic/custom groups are supported.
  const hasEquity = Boolean(formData.equityInvestment)
  const hasLiquidFund = Boolean(formData.liquidFundInvestment)
  const hasRealEstate = Boolean(formData.realEstateInvestment)

  const preferredSubtypeByGroupCode: Record<string, 'equity' | 'liquidFund' | 'realEstate'> = {
    EQUITY: 'equity',
    LIQUID_FUND: 'liquidFund',
    REAL_ESTATE: 'realEstate'
  }

  const presentSubtypes: Array<'equity' | 'liquidFund' | 'realEstate'> = [
    ...(hasEquity ? (['equity'] as const) : []),
    ...(hasLiquidFund ? (['liquidFund'] as const) : []),
    ...(hasRealEstate ? (['realEstate'] as const) : [])
  ]

  const preferredSubtype = groupCode ? preferredSubtypeByGroupCode[groupCode] : undefined
  const selectedSubtype =
    preferredSubtype && presentSubtypes.includes(preferredSubtype) ? preferredSubtype : presentSubtypes[0]

  if (selectedSubtype === 'equity' && formData.equityInvestment) {
    reportPayload.equityInvestmentReport = [
      {
        ...formData.equityInvestment,
        date: reportDate,
        scope: reportScope as ReportScope | undefined
      }
    ] as any[]
  } else if (selectedSubtype === 'liquidFund' && formData.liquidFundInvestment) {
    reportPayload.liquidFundInvestmentReport = [
      {
        ...formData.liquidFundInvestment,
        date: reportDate,
        scope: reportScope as ReportScope | undefined,
        // Add liquidFundTypeId if present
        ...(liquidFundTypeId ? { investmentLiquidFundTypeRef: liquidFundTypeId } : {})
      } as any
    ]
  } else if (selectedSubtype === 'realEstate' && formData.realEstateInvestment) {
    reportPayload.realEstateInvestmentReport = [
      {
        ...formData.realEstateInvestment,
        date: reportDate,
        scope: reportScope as ReportScope | undefined
      }
    ] as any[]
  }
  // PRIVATE_EQUITY: No dedicated report table - data stored in main reportPayload via investment.additionalProperties

  return reportPayload
}
