/**
 * Investment Lead Import Configuration
 * Extends base lead fields with investment-specific fields
 * Used by IRM (Investment Relations Management) domain
 */

import { baseLeadImportFields } from '@/common/data/relations/types/leadImportConfig'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

const investmentBaseLeadImportFields = baseLeadImportFields.map(field => {
  if (field.type !== 'catalog') return field

  switch (field.value) {
    case 'leadStatusRef':
      return { ...field, catalog: 'InvestmentLeadStatus' }
    case 'leadSourceRef':
      return { ...field, catalog: 'InvestmentLeadSource' }
    case 'leadRatingRef':
      return { ...field, catalog: 'InvestmentLeadRating' }
    default:
      return field
  }
})

// IRM-specific fields (investment + property + leadSourceType)
const investmentLeadFields: TargetFieldDefinition[] = [
  { value: 'leadSourceType', label: 'Lead Source Type', type: 'direct' },

  // Investment Details
  { value: 'investmentName', label: 'Investment Name', type: 'direct' },
  { value: 'investmentTypeRef', label: 'Investment Type (Catalog)', type: 'catalog', catalog: 'InvestmentType' },
  { value: 'investmentGroupRef', label: 'Investment Group (Catalog)', type: 'catalog', catalog: 'InvestmentGroup' },
  { value: 'investmentRoleRef', label: 'Investment Role (Catalog)', type: 'catalog', catalog: 'InvestmentRole' },
  {
    value: 'investmentStakeTypeRef',
    label: 'Stake Type (Catalog)',
    type: 'catalog',
    catalog: 'InvestmentStakeType'
  },
  { value: 'stakePercentage', label: 'Stake Percentage', type: 'direct' },

  // Financial Information
  { value: 'initialInvestmentAmount', label: 'Initial Investment Amount', type: 'direct' },
  { value: 'requiredCapitalAmount', label: 'Required Capital Amount', type: 'direct' },
  { value: 'forecastedProfitAmount', label: 'Forecasted Profit Amount', type: 'direct' },
  { value: 'loanAmount', label: 'Loan Amount', type: 'direct' },
  { value: 'loanInterestRate', label: 'Loan Interest Rate', type: 'direct' },
  { value: 'marketValue', label: 'Market Value', type: 'direct' },

  // Property Information
  { value: 'annualNetColdRent', label: 'Annual Net Cold Rent', type: 'direct' },
  { value: 'buildingYear', label: 'Building Year', type: 'direct' },
  { value: 'size', label: 'Property Size', type: 'direct' },
  { value: 'sizeMeasurementUnitRef', label: 'Size Unit (Catalog)', type: 'catalog', catalog: 'SizeMeasurementUnit' },

  // Time Zone
  { value: 'timeZoneRef', label: 'Time Zone (Catalog)', type: 'catalog', catalog: 'TimeZone' }
]

export const investmentLeadImportConfig: ImportConfig = {
  entityType: 'lead',
  domain: 'investment',
  targetFields: [...investmentBaseLeadImportFields, ...investmentLeadFields]
}
