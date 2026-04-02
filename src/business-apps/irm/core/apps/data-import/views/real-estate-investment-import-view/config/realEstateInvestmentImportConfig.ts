/**
 * Real Estate Investment Import Configuration
 * Combines common investment fields with real estate-specific fields
 */

import { TargetFieldDefinition, ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { COMMON_INVESTMENT_FIELDS } from '../../../config/commonInvestmentFields'

export const REAL_ESTATE_SPECIFIC_FIELDS: TargetFieldDefinition[] = [
  // Property Information
  { value: 'realEstateInvestment.buildingYear', label: 'Building Year', type: 'direct' },
  { value: 'realEstateInvestment.numberOfUnits', label: 'Number of Units', type: 'direct' },
  { value: 'realEstateInvestment.size', label: 'Property Size', type: 'direct' },
  {
    value: 'realEstateInvestment.sizeMeasurementUnitRef',
    label: 'Size Unit',
    type: 'catalog',
    catalog: 'SizeMeasurementUnit'
  },

  // Location
  { value: 'realEstateInvestment.locality', label: 'City/Locality', type: 'direct' },
  { value: 'realEstateInvestment.postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'realEstateInvestment.addressLine', label: 'Address Line', type: 'direct' },
  { value: 'realEstateInvestment.countryRef', label: 'Country', type: 'catalog', catalog: 'Country' },
  { value: 'realEstateInvestment.regionRef', label: 'Region', type: 'catalog', catalog: 'CountryRegion' },

  // Financial Information
  { value: 'realEstateInvestment.annualNetColdRent', label: 'Annual Net Cold Rent', type: 'direct' },
  { value: 'realEstateInvestment.actualAnnualExpenses', label: 'Actual Annual Expenses', type: 'direct' },
  { value: 'realEstateInvestment.targetAnnualExpenses', label: 'Target Annual Expenses', type: 'direct' },
  { value: 'realEstateInvestment.funding', label: 'Funding', type: 'direct' },
  { value: 'realEstateInvestment.occupancyPercent', label: 'Occupancy Percentage', type: 'direct' },
  { value: 'realEstateInvestment.marketValue', label: 'Real Estate Market Value', type: 'direct' },
  { value: 'realEstateInvestment.loanAmount', label: 'Real Estate Loan Amount', type: 'direct' },
  { value: 'realEstateInvestment.loanInterestRate', label: 'Real Estate Loan Interest Rate', type: 'direct' },
  { value: 'realEstateInvestment.liquidityForecast', label: 'Liquidity Forecast (JSON)', type: 'direct' }
]

export const realEstateInvestmentTargetFields: TargetFieldDefinition[] = [
  ...COMMON_INVESTMENT_FIELDS,
  ...REAL_ESTATE_SPECIFIC_FIELDS
]

export const realEstateInvestmentImportConfig: ImportConfig = {
  entityType: 'real-estate-investment',
  domain: 'investment',
  targetFields: realEstateInvestmentTargetFields
}
