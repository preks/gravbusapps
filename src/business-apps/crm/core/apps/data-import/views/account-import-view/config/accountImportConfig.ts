/**
 * Account Import Configuration
 */

import { TargetFieldDefinition, ImportConfig } from '@/common/data/customer/agents/types'

export const accountTargetFields: TargetFieldDefinition[] = [
  // Company Information
  { value: 'name', label: 'Company Name', type: 'direct' },
  { value: 'code', label: 'Account Code', type: 'direct' },
  { value: 'website', label: 'Website', type: 'direct' },
  { value: 'legalFormRef', label: 'Legal Form (Catalog)', type: 'catalog', catalog: 'LegalForm' },
  { value: 'companySizeRef', label: 'Company Size (Catalog)', type: 'catalog', catalog: 'CompanySize' },
  { value: 'industryClassRef', label: 'Industry (Catalog)', type: 'catalog', catalog: 'IndustryClass' },
  {
    value: 'accountAnnualRevenueBandRef',
    label: 'Annual Revenue (Catalog)',
    type: 'catalog',
    catalog: 'AnnualRevenue'
  },
  {
    value: 'accountPriorityRef',
    label: 'Account Priority (Catalog)',
    type: 'catalog',
    catalog: 'AccountPriority'
  },
  { value: 'foundationDate', label: 'Foundation Date', type: 'direct' },
  { value: 'liquidationDate', label: 'Liquidation Date', type: 'direct' },

  // Address/Location
  { value: 'addressLine', label: 'Address Line', type: 'direct' },
  { value: 'city', label: 'City', type: 'direct' },
  { value: 'postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },
  { value: 'regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'Region' },

  // Communication
  { value: 'email', label: 'Email', type: 'direct' },
  { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },
  { value: 'mobileNumber', label: 'Mobile Number', type: 'direct' },
  { value: 'faxNumber', label: 'Fax Number', type: 'direct' },

  // Management
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },
  { value: 'timeZoneRef', label: 'Time Zone (Catalog)', type: 'catalog', catalog: 'TimeZone' },

  // Additional
  { value: 'notesSummary', label: 'Notes Summary', type: 'direct' },
  { value: 'picture', label: 'Picture URL', type: 'direct' },
  { value: 'pictureThumbnail', label: 'Picture Thumbnail URL', type: 'direct' }
]

export const accountImportConfig: ImportConfig = {
  entityType: 'account',
  aiAgentName: 'AccountImportAnalyzer',
  targetFields: accountTargetFields,
  requiredCatalogs: [
    'LegalForm',
    'CompanySize',
    'IndustryClass',
    'AnnualRevenue',
    'AccountPriority',
    'Country',
    'TimeZone'
  ]
}
