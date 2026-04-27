// Liquid Fund Data Transformer
// Transforms InvestmentReport entities to AnalyticsRowData format for liquid fund tables

import type { InvestmentReport } from '@/common/data/investment/types/investmentTypes'

/**
 * Processed data for display in the liquid fund analytics table.
 * Used as the row shape for the dynamic liquid-fund report renderer.
 */
export interface AnalyticsRowData {
  id: string
  cashBankIdentifier: string
  proprietorName: string
  originalCurrency: string
  // Report date for display
  reportDate?: string
  // Additional fields for Fixed-Term Deposits
  maturityDate?: string
  interestRate?: number
  // Investment navigation fields
  investmentId?: string
  investmentName?: string
  // Additional fields for Multiple Investment Types (Tab 3)
  depositName?: string
  isin?: string
  stocksQuantity?: number
  // Calculated values for the analytics period
  openingBalance: number
  incoming: number
  outgoing: number
  realizedGainsLosses: number
  unrealizedGainsLosses: number
  closingBalance: number
  timeWeightedPerformance: number
  // Metadata
  portfolioId: string
  investmentType: string
  reportCount: number
  reportId?: string // InvestmentReport ID for actions column

  // IMPORTANT: Full data structures for dynamic column access
  // These ensure the getValue functions in dynamic columns can access all nested data
  investment?: any // The investment entity with all its properties
  liquidFundInvestment?: any[] // Array of liquid fund investment data
  liquidFundReport?: any // The liquid fund report data
}

/**
 * Transforms investment reports to analytics data format for liquid funds
 * All filtering is done server-side via GraphQL query variables
 */
export function transformReportsToAnalyticsData(reports: InvestmentReport[]): AnalyticsRowData[] {
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
        investment: report.investment,

        // CRITICAL: Include InvestmentReport.totalInvestmentAmount (the actual closing balance per period)
        // This is needed for the "Closing Balance" column which the catalog defines as investment.totalInvestmentAmount
        // but should actually use the report's root totalInvestmentAmount, not the parent investment's total
        totalInvestmentAmount: report.totalInvestmentAmount
      }

      transformedData.push(row)
    })
  })

  return transformedData
}
