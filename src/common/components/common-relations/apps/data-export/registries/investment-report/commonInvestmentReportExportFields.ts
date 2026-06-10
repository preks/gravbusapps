import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatExportCatalog,
  formatExportDateValue,
  formatExportNumber,
  formatExportText,
  formatExportPercentage,
  formatOwnerEmployee
} from '../../utils/exportFormatHelpers'
import {
  formatReportCurrencyCode,
  formatReportFirstEquityMarketValue,
  formatReportFirstLiquidFundInterestRate,
  formatReportFirstRealEstateAnnualRent,
  formatReportInvestmentGroup,
  formatReportInvestmentName,
  formatReportInvestmentType,
  formatReportLinkedAccount,
  formatReportLinkedInvestmentStatus
} from './investmentReportExportFormatters'
import { buildInvestmentIdExportField, buildRecordIdExportField } from '../../utils/exportExternalIdFieldBuilders'

/** Core investment report export fields aligned with list export and savable form fields. */
export function buildCommonInvestmentReportExportFields(): ExportFieldDefinition<InvestmentReport>[] {
  return [
    {
      key: 'investment',
      label: 'Investment',
      formKeys: ['investmentId'],
      defaultSelected: true,
      format: formatReportInvestmentName
    },
    {
      key: 'date',
      label: 'Report Date',
      formKeys: ['date'],
      defaultSelected: true,
      isDateColumn: true,
      format: report => formatExportDateValue(report.date)
    },
    {
      key: 'investmentGroup',
      label: 'Investment Group',
      formKeys: [],
      defaultSelected: true,
      format: formatReportInvestmentGroup
    },
    {
      key: 'investmentType',
      label: 'Investment Type',
      formKeys: [],
      defaultSelected: true,
      format: formatReportInvestmentType
    },
    {
      key: 'investmentStatus',
      label: 'Report Status',
      formKeys: ['investmentStatusRef'],
      defaultSelected: true,
      format: report => formatExportCatalog(report.investmentStatus)
    },
    {
      key: 'linkedInvestmentStatus',
      label: 'Investment Status',
      formKeys: [],
      defaultSelected: false,
      format: formatReportLinkedInvestmentStatus
    },
    {
      key: 'investmentPhase',
      label: 'Investment Phase',
      formKeys: ['investmentPhaseRef'],
      defaultSelected: false,
      format: report => formatExportCatalog(report.investmentPhase)
    },
    {
      key: 'investmentStakeType',
      label: 'Investment Stake Type',
      formKeys: ['investmentStakeTypeRef'],
      defaultSelected: false,
      format: report => formatExportCatalog(report.investmentStakeType)
    },
    {
      key: 'investmentRiskLevel',
      label: 'Investment Risk Level',
      formKeys: ['investmentRiskLevelRef'],
      defaultSelected: false,
      format: report => formatExportCatalog(report.investmentRiskLevel)
    },
    {
      key: 'currency',
      label: 'Currency',
      formKeys: ['currencyRef'],
      defaultSelected: true,
      format: formatReportCurrencyCode
    },
    {
      key: 'totalInvestmentAmount',
      label: 'Total Investment Amount',
      formKeys: ['totalInvestmentAmount'],
      defaultSelected: true,
      format: report => formatExportNumber(report.totalInvestmentAmount)
    },
    {
      key: 'initialInvestmentAmount',
      label: 'Initial Investment Amount',
      formKeys: ['initialInvestmentAmount'],
      defaultSelected: false,
      format: report => formatExportNumber(report.initialInvestmentAmount)
    },
    {
      key: 'investmentMarketValue',
      label: 'Investment Market Value',
      formKeys: ['investmentMarketValue'],
      defaultSelected: true,
      format: report => formatExportNumber(report.investmentMarketValue)
    },
    {
      key: 'stakePercentage',
      label: 'Stake (%)',
      formKeys: ['stakePercentage'],
      defaultSelected: true,
      format: report => formatExportPercentage(report.stakePercentage)
    },
    {
      key: 'irr',
      label: 'IRR',
      formKeys: ['irr'],
      defaultSelected: true,
      format: report => formatExportNumber(report.irr)
    },
    {
      key: 'moic',
      label: 'MOIC',
      formKeys: ['moic'],
      defaultSelected: true,
      format: report => formatExportNumber(report.moic)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: [],
      defaultSelected: false,
      format: report => formatOwnerEmployee(report.investment?.ownerEmployee)
    },
    {
      key: 'linkedAccount',
      label: 'Account',
      formKeys: [],
      defaultSelected: false,
      format: formatReportLinkedAccount
    },
    {
      key: 'scope',
      label: 'Report Scope',
      formKeys: ['scope'],
      defaultSelected: false,
      format: report => formatExportText(report.scope)
    },
    {
      key: 'plannedExitDate',
      label: 'Planned Exit Date',
      formKeys: ['plannedExitDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: report => formatExportDateValue(report.plannedExitDate)
    },
    {
      key: 'forecastedProfitAmount',
      label: 'Forecasted Profit Amount',
      formKeys: ['forecastedProfitAmount'],
      defaultSelected: false,
      format: report => formatExportNumber(report.forecastedProfitAmount)
    },
    {
      key: 'timeWeightedPerformance',
      label: 'Time Weighted Performance',
      formKeys: ['timeWeightedPerformance'],
      defaultSelected: false,
      format: report => formatExportNumber(report.timeWeightedPerformance)
    },
    {
      key: 'equityMarketValue',
      label: 'Equity Market Value',
      formKeys: [],
      defaultSelected: false,
      format: formatReportFirstEquityMarketValue
    },
    {
      key: 'realEstateAnnualNetColdRent',
      label: 'Annual Net Cold Rent',
      formKeys: [],
      defaultSelected: false,
      format: formatReportFirstRealEstateAnnualRent
    },
    {
      key: 'liquidFundInterestRate',
      label: 'Interest Rate',
      formKeys: [],
      defaultSelected: false,
      format: formatReportFirstLiquidFundInterestRate
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: report => formatExportDateValue(report.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: report => formatExportDateValue(report.updatedAt)
    },
    buildRecordIdExportField<InvestmentReport>('Report ID'),
    buildInvestmentIdExportField<InvestmentReport>(),
    {
      key: 'ownerEmployeeId',
      label: 'Owner ID',
      formKeys: [],
      defaultSelected: false,
      exportIdKind: 'external',
      format: report =>
        formatExportText(report.investment?.ownerEmployeeId ?? report.investment?.ownerEmployee?.id ?? undefined)
    }
  ]
}
