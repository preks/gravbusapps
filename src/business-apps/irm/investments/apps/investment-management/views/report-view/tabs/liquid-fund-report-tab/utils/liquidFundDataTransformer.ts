// Liquid Fund Data Transformer
// Transforms InvestmentReport entities to AnalyticsRowData format for liquid fund tables

import type { InvestmentReport } from '@/common/data/investment/types/investmentTypes'
import { AnalyticsRowData } from '../types/AnalyticsTypes'

/**
 * Transforms investment reports to analytics data format for liquid funds
 * Extracted from useLiquidFundReports hook for reusability
 */
export function transformReportsToAnalyticsData(
  reports: InvestmentReport[],
  investmentTypeFilter?: string
): AnalyticsRowData[] {
  // Transform to analytics data
  const transformedData: AnalyticsRowData[] = []

  reports.forEach(report => {
    const liquidFundReports = report.liquidFundInvestmentReport || []

    // Skip if no liquid fund reports (might be a different investment group)
    if (liquidFundReports.length === 0) {
      return
    }

    // Create a row for each liquid fund report
    liquidFundReports.forEach(liquidFundReport => {
      // Extract currency code from catalog entry or ref
      const currencyCode = report.currency?.code || report.currencyRef?.split(':')?.pop() || 'EUR'

      // Extract financial data from additionalProperties or root level
      const additionalProps = liquidFundReport.additionalProperties || {}

      const row: AnalyticsRowData = {
        id: `${report.id}-${liquidFundReport.id}`,
        investmentId: report.investment?.id || '',
        investmentName: report.investment?.name || '',
        reportDate: report.date,
        reportId: report.id, // Store InvestmentReport ID for actions column

        // Required fields for AnalyticsRowData
        cashBankIdentifier:
          liquidFundReport.bankAccountNumber || liquidFundReport.liquidFundInvestment?.investment?.code || '',
        proprietorName: liquidFundReport.proprietorName || additionalProps.proprietor || '',
        originalCurrency: currencyCode,
        portfolioId: liquidFundReport.liquidFundInvestmentId || liquidFundReport.id || '',
        investmentType:
          liquidFundReport.investmentLiquidFundType?.code ||
          liquidFundReport.investmentLiquidFundTypeRef?.split(':')?.pop() ||
          'UNKNOWN',

        // Financial data from additionalProperties
        openingBalance: additionalProps.openingBalance || 0,
        incoming: additionalProps.incoming || 0,
        outgoing: additionalProps.outgoing || 0,
        realizedGainsLosses:
          (additionalProps.realizedGainsLossesCurrency || 0) + (additionalProps.realizedGainsLossesSharePrice || 0),
        unrealizedGainsLosses:
          (additionalProps.unrealizedGainsLossesCurrency || 0) + (additionalProps.unrealizedGainsLossesSharePrice || 0),
        closingBalance: additionalProps.closingBalance || report.investmentMarketValue || 0,
        timeWeightedPerformance: additionalProps.timeWeightedPerformance || 0,
        reportCount: 1,

        // Optional fields
        maturityDate: liquidFundReport.maturityDate,
        interestRate: liquidFundReport.interestRate,
        depositName: additionalProps.name || liquidFundReport.liquidFundInvestment?.investment?.name || '',
        isin: liquidFundReport.liquidFundInvestment?.investment?.isin || additionalProps.isin || '',
        stocksQuantity: additionalProps.quantity,

        // Keep full structures for dynamic column access
        liquidFundReport: liquidFundReport,
        liquidFundInvestment: liquidFundReport.liquidFundInvestment ? [liquidFundReport.liquidFundInvestment] : [],
        investment: report.investment
      }

      transformedData.push(row)
    })
  })

  // Client-side filtering by investment type (if needed)
  let filteredData = transformedData
  if (investmentTypeFilter) {
    const typeMapping: Record<string, string> = {
      'Bank Deposit': 'BANK_DEPOSITE', // Catalog has typo DEPOSITE (not DEPOSIT)
      'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT',
      'Money Market Funds': 'MONEY_MARKET_FUNDS',
      'Pension Fund': 'PENSION_FUNDS',
      Equity: 'EQUITY',
      Bond: 'BONDS'
    }

    // Handle comma-separated multiple types (for "Multiple Types" tab)
    const requestedTypes = investmentTypeFilter.split(',').map(t => t.trim())
    const targetTypes = requestedTypes.map(type => typeMapping[type]).filter(Boolean)

    if (targetTypes.length > 0) {
      filteredData = transformedData.filter(item => {
        // Check multiple possible locations for the investment type code
        const itemTypeCode =
          item.investmentType || // From root level (set in transformation)
          item.liquidFundReport?.investmentLiquidFundType?.code ||
          item.liquidFundReport?.investmentLiquidFundTypeRef?.split(':')?.pop()

        // Check if item type matches any of the target types
        const matches = itemTypeCode && targetTypes.includes(itemTypeCode)

        return matches
      })
    }
  }

  return filteredData
}
