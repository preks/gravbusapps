/**
 * Investment Account Import Configuration (IRM)
 * Full explicit field list for InvestmentAccount schema.
 *
 * Key differences from CRM Account:
 * - Address fields live under addresses.* (not top-level countryRef/regionRef/city/locality)
 * - addresses.regionRef uses CountryRegion catalog (not Region)
 * - addresses.locality replaces top-level city
 */

import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

const irmAccountSpecificFields: TargetFieldDefinition[] = [
  // Address fields — nested under addresses.* (IRM schema only)
  { value: 'addresses.addressLine', label: 'Address Line', type: 'direct' },
  { value: 'addresses.locality', label: 'City / Locality', type: 'direct' },
  { value: 'addresses.postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'addresses.countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },
  { value: 'addresses.regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'CountryRegion' }
]

const irmAccountSharedFields: TargetFieldDefinition[] = [
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
    catalog: 'AccountAnnualRevenueBand'
  },
  {
    value: 'accountPriorityRef',
    label: 'Account Priority (Catalog)',
    type: 'catalog',
    catalog: 'AccountPriority'
  },
  { value: 'foundationDate', label: 'Foundation Date', type: 'direct' },
  { value: 'liquidationDate', label: 'Liquidation Date', type: 'direct' },

  // Communication Channels (transformed to communicationChannels array)
  { value: 'email', label: 'Email', type: 'direct' },
  { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },
  { value: 'mobileNumber', label: 'Mobile Number', type: 'direct' },
  { value: 'faxNumber', label: 'Fax Number', type: 'direct' },
  { value: 'linkedInUrl', label: 'LinkedIn URL', type: 'direct' },
  { value: 'xingUrl', label: 'Xing URL', type: 'direct' },
  { value: 'websiteUrl', label: 'Website URL', type: 'direct' },

  // Management
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },
  { value: 'timeZoneRef', label: 'Time Zone (Catalog)', type: 'catalog', catalog: 'TimeZone' },

  // Additional
  { value: 'notesSummary', label: 'Notes Summary', type: 'direct' }
]

export const investmentAccountImportConfig: ImportConfig = {
  entityType: 'account',
  domain: 'investment',
  targetFields: [...irmAccountSharedFields, ...irmAccountSpecificFields]
}
