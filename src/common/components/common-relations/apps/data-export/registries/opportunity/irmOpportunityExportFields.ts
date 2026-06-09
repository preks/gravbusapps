import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { formatExportCatalog, formatExportNumber, formatExportText } from '../../utils/exportFormatHelpers'
import { buildCommonOpportunityExportFields } from './commonOpportunityExportFields'

export function buildIrmOpportunityExportFields(): ExportFieldDefinition<InvestmentOpportunity>[] {
  const commonFields = buildCommonOpportunityExportFields<InvestmentOpportunity>()

  const irmFields: ExportFieldDefinition<InvestmentOpportunity>[] = [
    {
      key: 'investmentGroup',
      label: 'Investment Group',
      formKeys: ['investmentGroupRef'],
      defaultSelected: false,
      format: opportunity => formatExportCatalog(opportunity.investmentGroup)
    },
    {
      key: 'investmentType',
      label: 'Investment Type',
      formKeys: ['investmentTypeRef'],
      defaultSelected: false,
      format: opportunity => formatExportCatalog(opportunity.investmentType)
    },
    {
      key: 'investmentName',
      label: 'Investment Name',
      formKeys: ['investmentName'],
      defaultSelected: false,
      format: opportunity => formatExportText(opportunity.investmentName)
    },
    {
      key: 'dealType',
      label: 'Deal Type',
      formKeys: ['dealType'],
      defaultSelected: false,
      format: opportunity => formatExportText(opportunity.dealType)
    },
    {
      key: 'forecastedProfitAmount',
      label: 'Forecasted Profit',
      formKeys: ['forecastedProfitAmount'],
      defaultSelected: true,
      format: opportunity => formatExportNumber(opportunity.forecastedProfitAmount)
    },
    {
      key: 'initialInvestmentAmount',
      label: 'Initial Investment Amount',
      formKeys: ['initialInvestmentAmount'],
      defaultSelected: false,
      format: opportunity => formatExportNumber(opportunity.initialInvestmentAmount)
    },
    {
      key: 'marketValue',
      label: 'Market Value',
      formKeys: ['marketValue'],
      defaultSelected: false,
      format: opportunity => formatExportNumber(opportunity.marketValue)
    },
    {
      key: 'stakePercentage',
      label: 'Stake (%)',
      formKeys: ['stakePercentage'],
      defaultSelected: false,
      format: opportunity => formatExportNumber(opportunity.stakePercentage)
    }
  ]

  return [...commonFields, ...irmFields]
}
