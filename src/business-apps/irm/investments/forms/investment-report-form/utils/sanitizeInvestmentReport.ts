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

  // Get liquidFundTypeId for liquid fund reports
  const investmentTypeId: string | null = formData.investment?.investmentTypeId ?? null
  const { liquidFundTypeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

  // Get report-specific fields directly from formData (no fallbacks)
  const reportDate = (formData as any).investmentReportDate
  const reportScope = (formData as any).investmentReportScope
  const finalInvestmentId = formData.investment?.id

  // Map investment.investmentRole (from Layout) to investmentRoleReport (for Report)
  // Map Sub-Groups (from Layout) to Report field names (with "Report")
  // IMPORTANT: Exclude investment id and version - these belong to the investment, not the report
  // IMPORTANT: Only include fields that match InvestmentReport API schema
  // Extract reportId and reportVersion (custom properties added during transform, not part of Investment type)
  const reportId = (mergedData as any).reportId
  const reportVersion = (mergedData as any).reportVersion

  // Extract investmentRoles (form field name is 'investmentRoles', but type has 'investmentRole')
  const investmentRoles = (mergedData as any).investmentRoles || mergedData.investmentRole

  const reportPayload: Partial<InvestmentReport> = {
    // Include report id and version when updating (from reportId/reportVersion stored in form)
    ...(reportId && { id: reportId }),
    ...(reportVersion !== undefined && { version: reportVersion }),

    // BaseEntity fields
    businessKey: (mergedData as any).businessKey,
    additionalProperties: mergedData.additionalProperties,

    // Report-specific fields from form state
    date: reportDate,
    scope: reportScope as ReportScope | undefined,
    investmentId: finalInvestmentId,

    // Catalog References (only report-level)
    investmentStakeTypeRef: mergedData.investmentStakeTypeRef,
    investmentPhaseRef: mergedData.investmentPhaseRef,
    investmentStatusRef: mergedData.investmentStatusRef,
    investmentRiskLevelRef: mergedData.investmentRiskLevelRef,
    currencyRef: mergedData.currencyRef,

    // Report Amount Fields (snapshot at report time)
    plannedExitDate: mergedData.plannedExitDate,
    totalInvestmentAmount: mergedData.totalInvestmentAmount,
    investmentMarketValue: mergedData.investmentMarketValue,
    debtFinancingAmount: mergedData.debtFinancingAmount,
    requiredCapitalAmount: mergedData.requiredCapitalAmount,
    forecastedRevenueAmount: mergedData.forecastedRevenueAmount,
    forecastedProfitAmount: mergedData.forecastedProfitAmount,
    stakePercentage: mergedData.stakePercentage,

    // Loan Fields
    loanRecipientName: mergedData.loanRecipientName,
    loanAmount: mergedData.loanAmount,
    loanOpenCommitmentAmount: mergedData.loanOpenCommitmentAmount,
    loanInterestRate: mergedData.loanInterestRate,
    loanStartDate: mergedData.loanStartDate,
    loanEndDate: mergedData.loanEndDate,
    loanInterestClaim: mergedData.loanInterestClaim,
    loanRecipientInvestmentAccountId: mergedData.loanRecipientInvestmentAccountId,

    // Fund Fields
    totalCommitmentAmount: mergedData.totalCommitmentAmount,
    totalDistributionAmount: mergedData.totalDistributionAmount,
    fundManagerName: mergedData.fundManagerName,
    identification: (mergedData as any).identification,

    // Custom fields to keep (IRR and MOIC)
    irr: mergedData.irr,
    moic: mergedData.moic,
    // Map investmentRoles (from Layout) to investmentRoleReport (for Report)
    ...(investmentRoles && {
      investmentRoleReport: investmentRoles
    }),
    // Map Sub-Groups (from Layout) to Report field names (with "Report")
    // IMPORTANT: Add date and scope to each sub-report
    // IMPORTANT: Exclude BaseEntity fields from loaded investment data (they shouldn't be in report)
    ...(formData.equityInvestment
      ? {
          equityInvestmentReport: [
            {
              // Only include equity report fields that match API schema
              ...(formData.equityInvestment.id && { id: formData.equityInvestment.id }),
              ...(formData.equityInvestment.version !== undefined && { version: formData.equityInvestment.version }),
              marketValue: formData.equityInvestment.marketValue,
              turnoverAmount: formData.equityInvestment.turnoverAmount,
              ebitdaAmount: formData.equityInvestment.ebitdaAmount,
              additionalProperties: formData.equityInvestment.additionalProperties,
              date: reportDate,
              scope: reportScope as ReportScope | undefined
            }
          ] as any[]
        }
      : {}),
    ...(formData.liquidFundInvestment
      ? {
          liquidFundInvestmentReport: [
            {
              // Only include liquid fund-specific fields, not BaseEntity fields from loaded data
              ...(formData.liquidFundInvestment.id && { id: formData.liquidFundInvestment.id }),
              ...(formData.liquidFundInvestment.version !== undefined && {
                version: formData.liquidFundInvestment.version
              }),
              proprietorName: formData.liquidFundInvestment.proprietorName,
              bankName: formData.liquidFundInvestment.bankName,
              bankAccountNumber: formData.liquidFundInvestment.bankAccountNumber,
              earlyTerminationAllowed: formData.liquidFundInvestment.earlyTerminationAllowed,
              interestRate: formData.liquidFundInvestment.interestRate,
              maturityDate: formData.liquidFundInvestment.maturityDate,
              interestPaymentFrequencyRef: formData.liquidFundInvestment.interestPaymentFrequencyRef,
              additionalProperties: formData.liquidFundInvestment.additionalProperties,
              date: reportDate,
              scope: reportScope as ReportScope | undefined,
              // Add liquidFundTypeId if present
              ...(liquidFundTypeId ? { investmentLiquidFundTypeRef: liquidFundTypeId } : {})
            } as any
          ]
        }
      : {}),
    ...(formData.realEstateInvestment
      ? {
          realEstateInvestmentReport: [
            {
              // Only include real estate report fields that match API schema
              ...(formData.realEstateInvestment.id && { id: formData.realEstateInvestment.id }),
              ...(formData.realEstateInvestment.version !== undefined && {
                version: formData.realEstateInvestment.version
              }),
              numberOfUnits: formData.realEstateInvestment.numberOfUnits,
              annualNetColdRent: formData.realEstateInvestment.annualNetColdRent,
              actualAnnualExpenses: formData.realEstateInvestment.actualAnnualExpenses,
              targetAnnualExpenses: formData.realEstateInvestment.targetAnnualExpenses,
              funding: formData.realEstateInvestment.funding,
              occupancyPercent: formData.realEstateInvestment.occupancyPercent,
              size: formData.realEstateInvestment.size,
              sizeMeasurementUnitRef: formData.realEstateInvestment.sizeMeasurementUnitRef,
              liquidityForecast: formData.realEstateInvestment.liquidityForecast,
              additionalProperties: formData.realEstateInvestment.additionalProperties,
              date: reportDate,
              scope: reportScope as ReportScope | undefined
            }
          ] as any[]
        }
      : {})
  }

  return reportPayload
}
