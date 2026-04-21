/**
 * Investment Lead Import Configuration (IRM)
 * Full explicit field list for InvestmentLead schema.
 * IRM-specific fields: locality (not city), CountryRegion catalog, InvestmentLead* catalogs,
 * investment/property/financial fields. industryRef and numberOfEmployeesRef are absent in InvestmentLead.
 */

import { sharedLeadImportFields } from '@/common/data/relations/types/leadImportConfig'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

const irmLeadSpecificFields: TargetFieldDefinition[] = [
  // IRM-specific address fields (locality replaces city; CountryRegion replaces Region)
  { value: 'locality', label: 'City / Locality', type: 'direct' },
  { value: 'regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'CountryRegion' },

  // IRM-specific lead catalog fields
  { value: 'leadStatusRef', label: 'Lead Status (Catalog)', type: 'catalog', catalog: 'InvestmentLeadStatus' },
  { value: 'leadSourceRef', label: 'Lead Source (Catalog)', type: 'catalog', catalog: 'InvestmentLeadSource' },
  { value: 'leadRatingRef', label: 'Lead Rating (Catalog)', type: 'catalog', catalog: 'InvestmentLeadRating' },

  // IRM-specific lead fields
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
  targetFields: [...sharedLeadImportFields, ...irmLeadSpecificFields],
  enforcedSelects: [
    {
      id: 'leadStatus',
      targetField: 'leadStatusRef',
      catalogIdentifier: 'InvestmentLeadStatus',
      required: true,
      defaultValueRef: 'InvestmentLeadStatus:v1:OPEN',
      labelKey: 'lead-status-label'
    },
    {
      id: 'leadSource',
      targetField: 'leadSourceRef',
      catalogIdentifier: 'InvestmentLeadSource',
      required: true,
      labelKey: 'lead-source-label'
    },
    {
      id: 'leadRating',
      targetField: 'leadRatingRef',
      catalogIdentifier: 'InvestmentLeadRating',
      required: true,
      labelKey: 'lead-rating-label'
    }
  ]
}
