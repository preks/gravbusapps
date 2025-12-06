import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import dayjs from 'dayjs'

/**
 * Transforms InvestmentReport to InvestmentFormValues structure
 * Used for initializing the form with report data
 */
export const transformReportToFormValues = (
  report: InvestmentReport | Partial<InvestmentReport> | null | undefined,
  reportId: string | undefined,
  investmentId: string | undefined
): Partial<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }> => {
  if (!report) {
    // If no report but we have investmentId, set it so InvestmentLayout can load it
    if (investmentId) {
      return {
        investment: {
          id: investmentId,
          investmentId: investmentId
        } as any
      }
    }
    return {}
  }

  // Map InvestmentReport to InvestmentFormValues structure
  // The investment data comes from report.investment or from the report itself
  // Only include id and version if we're updating an existing report (reportId exists)
  const investmentData: Partial<Investment> = report.investment
    ? {
        ...report.investment,
        // Prefer existing currencyRef/ownerEmployeeId/investmentAccountId on the investment
        ...(report.investment.currencyRef ? { currencyRef: report.investment.currencyRef } : {}),
        ...(report.investment.ownerEmployeeId ? { ownerEmployeeId: report.investment.ownerEmployeeId } : {}),
        ...(report.investment.investmentAccountId
          ? { investmentAccountId: report.investment.investmentAccountId }
          : {}),
        // Only include id and version if we're updating an existing report
        ...(reportId
          ? {
              id: report.investment.id,
              version: report.investment.version
            }
          : {}),
        // Convert null to undefined for optional fields (like code)
        ...(report.investment.code === null ? {} : { code: report.investment.code }),
        // Map report-specific fields to investment if they exist
        ...(report.totalInvestmentAmount !== undefined && {
          totalInvestmentAmount: report.totalInvestmentAmount
        }),
        ...(report.investmentMarketValue !== undefined && {
          investmentMarketValue: report.investmentMarketValue
        }),
        ...(report.forecastedRevenueAmount !== undefined && {
          forecastedRevenueAmount: report.forecastedRevenueAmount
        }),
        ...(report.forecastedProfitAmount !== undefined && {
          forecastedProfitAmount: report.forecastedProfitAmount
        })
      }
    : {
        // If no investment object, create from report fields
        // Only include id and version if we're updating an existing report
        ...(reportId
          ? {
              id: report.id,
              version: report.version
            }
          : {}),
        name: (report as any).name || '',
        // Convert null to undefined for optional fields
        ...((report as any).code === null ? {} : { code: (report as any).code }),
        ...(report.totalInvestmentAmount !== undefined && {
          totalInvestmentAmount: report.totalInvestmentAmount
        }),
        ...(report.investmentMarketValue !== undefined && {
          investmentMarketValue: report.investmentMarketValue
        }),
        ...(report.forecastedRevenueAmount !== undefined && {
          forecastedRevenueAmount: report.forecastedRevenueAmount
        }),
        ...(report.forecastedProfitAmount !== undefined && {
          forecastedProfitAmount: report.forecastedProfitAmount
        })
      }

  return {
    investment: {
      ...investmentData,
      // Map investmentRoleReport (from InvestmentReport) to investmentRole (for Layout)
      ...(report.investmentRoleReport && {
        investmentRole: report.investmentRoleReport
      }),
      // Map Sub-Groups (from InvestmentReport) to Layout field names (without "Report")
      // Only include id and version if we're updating an existing report
      ...(report.equityInvestmentReport &&
        report.equityInvestmentReport.length > 0 && {
          equityInvestment: reportId
            ? report.equityInvestmentReport[0] // Include id/version in update mode
            : {
                ...report.equityInvestmentReport[0],
                id: undefined,
                version: undefined
              } // Exclude id/version in create mode
        }),
      ...(report.liquidFundInvestmentReport &&
        report.liquidFundInvestmentReport.length > 0 && {
          liquidFundInvestment: reportId
            ? report.liquidFundInvestmentReport[0] // Include id/version in update mode
            : {
                ...report.liquidFundInvestmentReport[0],
                id: undefined,
                version: undefined
              } // Exclude id/version in create mode
        }),
      ...(report.realEstateInvestmentReport &&
        report.realEstateInvestmentReport.length > 0 && {
          realEstateInvestment: reportId
            ? report.realEstateInvestmentReport[0] // Include id/version in update mode
            : {
                ...report.realEstateInvestmentReport[0],
                id: undefined,
                version: undefined
              } // Exclude id/version in create mode
        }),
      // Set investment.id so InvestmentLayout automatically loads it
      // Use investmentId from all sources (report.investmentId OR additionalData.investmentId)
      ...(investmentId && {
        id: investmentId,
        investmentId: investmentId
      })
    },
    // Store report-specific fields at root level for form fields
    investmentReportDate: report.date || dayjs().format('YYYY-MM-DD'),
    investmentReportScope: report.scope || 'MONTHLY'
  } as any
}
