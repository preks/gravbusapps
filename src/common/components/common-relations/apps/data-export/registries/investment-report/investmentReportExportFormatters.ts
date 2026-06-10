import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import { formatExportCatalog, formatExportNumber, formatExportText } from '../../utils/exportFormatHelpers'

export function formatReportInvestmentName(report: InvestmentReport): string {
  return formatExportText(report.investment?.name)
}

export function formatReportInvestmentGroup(report: InvestmentReport): string {
  return formatExportCatalog(report.investment?.investmentGroup)
}

export function formatReportInvestmentType(report: InvestmentReport): string {
  return formatExportCatalog(report.investment?.investmentType)
}

export function formatReportLinkedInvestmentStatus(report: InvestmentReport): string {
  return formatExportCatalog(report.investment?.investmentStatus)
}

export function formatReportCurrencyCode(report: InvestmentReport): string {
  const currencyCode =
    report.currency?.code?.split(':').pop() || report.investment?.currency?.code?.split(':').pop() || ''
  return formatExportText(currencyCode || undefined)
}

export function formatReportLinkedAccount(report: InvestmentReport): string {
  const associations = report.investment?.investmentAccounts ?? []
  if (associations.length === 0) {
    return '-'
  }
  if (associations.length > 1) {
    return 'Multiple'
  }
  return formatExportText(associations[0]?.investmentAccount?.name)
}

export function formatReportFirstEquityMarketValue(report: InvestmentReport): string {
  return formatExportNumber(report.equityInvestmentReport?.[0]?.marketValue)
}

export function formatReportFirstRealEstateAnnualRent(report: InvestmentReport): string {
  return formatExportNumber(report.realEstateInvestmentReport?.[0]?.annualNetColdRent)
}

export function formatReportFirstLiquidFundInterestRate(report: InvestmentReport): string {
  return formatExportNumber(report.liquidFundInvestmentReport?.[0]?.interestRate)
}
