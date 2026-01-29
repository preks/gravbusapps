/**
 * Lead Import Configuration - Investment Relations (IRM)
 */

import { TargetFieldDefinition, ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

export const leadTargetFields: TargetFieldDefinition[] = [
  // Personal Information
  { value: 'salutationRef', label: 'Salutation (Catalog)', type: 'catalog', catalog: 'Salutation' },
  { value: 'academicTitleRef', label: 'Academic Title (Catalog)', type: 'catalog', catalog: 'AcademicTitle' },
  { value: 'firstName', label: 'First Name', type: 'direct' },
  { value: 'lastName', label: 'Last Name', type: 'direct' },
  { value: 'position', label: 'Position/Job Title', type: 'direct' },

  // Contact Information
  { value: 'email', label: 'Email', type: 'direct' },
  { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },

  // Company Information
  { value: 'companyName', label: 'Company Name', type: 'direct' },
  { value: 'companyEmail', label: 'Company Email', type: 'direct' },
  { value: 'companyPhone', label: 'Company Phone', type: 'direct' },
  { value: 'companyWebsite', label: 'Company Website', type: 'direct' },
  { value: 'legalFormRef', label: 'Legal Form (Catalog)', type: 'catalog', catalog: 'LegalForm' },
  {
    value: 'numberOfEmployeesRef',
    label: 'Company Size (Catalog)',
    type: 'catalog',
    catalog: 'CompanySize'
  },
  { value: 'industryRef', label: 'Industry (Catalog)', type: 'catalog', catalog: 'IndustryClass' },
  {
    value: 'accountAnnualRevenueBandRef',
    label: 'Annual Revenue (Catalog)',
    type: 'catalog',
    catalog: 'AnnualRevenue'
  },

  // Address/Location
  { value: 'addressLine', label: 'Address Line', type: 'direct' },
  { value: 'city', label: 'City', type: 'direct' },
  { value: 'postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },
  { value: 'regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'Region' },

  // Lead Information
  { value: 'leadSourceRef', label: 'Lead Source (Catalog)', type: 'catalog', catalog: 'LeadSource' },
  { value: 'leadSourceType', label: 'Lead Source Type', type: 'direct' },
  { value: 'leadStatusRef', label: 'Lead Status (Catalog)', type: 'catalog', catalog: 'LeadStatus' },
  { value: 'leadRatingRef', label: 'Lead Rating (Catalog)', type: 'catalog', catalog: 'LeadRating' },
  { value: 'sourceCompanyName', label: 'Source Company Name', type: 'direct' },
  { value: 'sourceIndividualName', label: 'Source Individual Name', type: 'direct' },

  // Investment Details
  { value: 'investmentName', label: 'Investment Name', type: 'direct' },
  { value: 'investmentTypeRef', label: 'Investment Type (Catalog)', type: 'catalog', catalog: 'InvestmentType' },
  { value: 'investmentGroupRef', label: 'Investment Group (Catalog)', type: 'catalog', catalog: 'InvestmentGroup' },
  { value: 'investmentRoleRef', label: 'Investment Role (Catalog)', type: 'catalog', catalog: 'InvestmentRole' },
  { value: 'investmentStakeTypeRef', label: 'Stake Type (Catalog)', type: 'catalog', catalog: 'InvestmentStakeType' },
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
  { value: 'timeZoneRef', label: 'Time Zone (Catalog)', type: 'catalog', catalog: 'TimeZone' },

  // Owner
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },

  // Additional
  { value: 'description', label: 'Description', type: 'direct' },
  { value: 'sensitive', label: 'Sensitive/Confidential', type: 'direct' }
]

export const leadImportConfig: ImportConfig = {
  entityType: 'lead',
  domain: 'investment',
  aiAgentName: 'InvestmentLeadImportAnalyzer',
  targetFields: leadTargetFields,
  requiredCatalogs: [
    'Salutation',
    'AcademicTitle',
    'Country',
    // Note: Region requires country-specific filtering, not loaded by default
    'CompanySize',
    'IndustryClass',
    'AnnualRevenue',
    'LeadSource',
    'LeadStatus',
    'LeadRating',
    'LegalForm',
    // IRM-specific catalogs
    'InvestmentType',
    'InvestmentGroup',
    'InvestmentRole',
    'InvestmentStakeType',
    'SizeMeasurementUnit',
    'TimeZone'
  ]
}
