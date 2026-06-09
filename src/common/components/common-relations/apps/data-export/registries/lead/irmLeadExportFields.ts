import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatExportCatalog,
  formatExportNumber,
  formatExportPercentage,
  formatExportText
} from '../../utils/exportFormatHelpers'
import { buildCommonLeadExportFields } from './commonLeadExportFields'

/** Static IRM investment prospect fields from the lead form (dynamic type fields deferred). */
export function buildIrmLeadExportFields(): ExportFieldDefinition<InvestmentLead>[] {
  const commonFields = buildCommonLeadExportFields<InvestmentLead>()

  const irmFields: ExportFieldDefinition<InvestmentLead>[] = [
    {
      key: 'investmentName',
      label: 'Investment Name',
      formKeys: ['investmentName'],
      defaultSelected: true,
      format: lead => formatExportText(lead.investmentName)
    },
    {
      key: 'investmentGroup',
      label: 'Investment Group',
      formKeys: ['investmentGroupRef', 'investmentTypeId'],
      defaultSelected: true,
      format: lead => formatExportCatalog(lead.investmentGroup)
    },
    {
      key: 'investmentType',
      label: 'Investment Type',
      formKeys: ['investmentTypeRef', 'investmentTypeId'],
      defaultSelected: true,
      format: lead => formatExportCatalog(lead.investmentType)
    },
    {
      key: 'investmentRole',
      label: 'Investment Role',
      formKeys: ['investmentRoleRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.investmentRole)
    },
    {
      key: 'investmentStakeType',
      label: 'Stake Type',
      formKeys: ['investmentStakeTypeRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.investmentStakeType)
    },
    {
      key: 'stakePercentage',
      label: 'Stake (%)',
      formKeys: ['stakePercentage'],
      defaultSelected: false,
      format: lead => formatExportPercentage(lead.stakePercentage)
    },
    {
      key: 'marketValue',
      label: 'Market Value',
      formKeys: ['marketValue'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.marketValue)
    },
    {
      key: 'initialInvestmentAmount',
      label: 'Initial Investment Amount',
      formKeys: ['initialInvestmentAmount'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.initialInvestmentAmount)
    },
    {
      key: 'loanAmount',
      label: 'Loan Amount',
      formKeys: ['loanAmount'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.loanAmount)
    },
    {
      key: 'loanInterestRate',
      label: 'Loan Interest Rate',
      formKeys: ['loanInterestRate'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.loanInterestRate)
    },
    {
      key: 'requiredCapitalAmount',
      label: 'Required Capital Amount',
      formKeys: ['requiredCapitalAmount'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.requiredCapitalAmount)
    },
    {
      key: 'forecastedProfitAmount',
      label: 'Forecasted Profit Amount',
      formKeys: ['forecastedProfitAmount'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.forecastedProfitAmount)
    },
    {
      key: 'annualNetColdRent',
      label: 'Annual Net Cold Rent',
      formKeys: ['annualNetColdRent'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.annualNetColdRent)
    },
    {
      key: 'buildingYear',
      label: 'Building Year',
      formKeys: ['buildingYear'],
      defaultSelected: false,
      format: lead => formatExportText(lead.buildingYear)
    },
    {
      key: 'size',
      label: 'Size',
      formKeys: ['size'],
      defaultSelected: false,
      format: lead => formatExportNumber(lead.size)
    },
    {
      key: 'sizeMeasurementUnit',
      label: 'Size Unit',
      formKeys: ['sizeMeasurementUnitRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.sizeMeasurementUnit)
    }
  ]

  return [...commonFields, ...irmFields]
}
