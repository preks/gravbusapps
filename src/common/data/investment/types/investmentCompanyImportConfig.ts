/**
 * Investment Company Import Configuration (IRM)
 * Core company fields, nested addresses, executives, and ownership rows from CSV/Excel.
 * Company group may be selected on the upload step (optional FE dropdown), not from the file.
 */

import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'
import { investmentCompanyPreviewConfig } from '@/common/data/relations/types/entityPreviewConfigs'

const companyCoreFields: TargetFieldDefinition[] = [
  { value: 'name', label: 'Company Name', type: 'direct', required: true },
  { value: 'code', label: 'Company Code', type: 'direct', required: true },
  { value: 'description', label: 'Description', type: 'direct' },
  { value: 'commercialRegistrationNumber', label: 'Commercial Registration Number', type: 'direct' },
  { value: 'taxIdentificationNumber', label: 'Tax Identification Number', type: 'direct' },
  { value: 'taxNumber', label: 'Tax Number', type: 'direct' },
  { value: 'valueAddedTaxNumber', label: 'VAT Number', type: 'direct' },
  { value: 'currencyRef', label: 'Currency (Catalog)', type: 'catalog', catalog: 'Currency' },
  // Owner — name of an Employee responsible for this company at our firm.
  // Distinct from `Owned By` (parent company ownership). Flowbot resolves
  // the column via `_IRM_OWNER_HEADER_ALIASES` and the import-template
  // builder renames the header to "Owner" via `TEMPLATE_LABEL_BY_FIELD_NAME`.
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' }
]

const companyAddressFields: TargetFieldDefinition[] = [
  { value: 'addresses.addressLine', label: 'Address Line', type: 'direct' },
  { value: 'addresses.locality', label: 'City / Locality', type: 'direct' },
  { value: 'addresses.postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'addresses.countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },
  { value: 'addresses.regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'CountryRegion' },
  { value: 'addresses.addressType', label: 'Address Type', type: 'direct' }
]

const companyExecutiveFields: TargetFieldDefinition[] = [
  {
    value: 'investmentCompanyExecutives.employeeId',
    label: 'Executive Employee ID',
    type: 'direct'
  },
  {
    value: 'investmentCompanyExecutives.investmentContactId',
    label: 'Executive Investment Contact ID',
    type: 'direct'
  },
  {
    value: 'investmentCompanyExecutives.executiveTypeRef',
    label: 'Executive Type (Catalog)',
    type: 'catalog',
    catalog: 'LegalEntityExecutiveType'
  }
]

const companyOwnershipFields: TargetFieldDefinition[] = [
  {
    value: 'investmentCompanyOwnership.ownerInvestmentCompanyId',
    label: 'Owner Investment Company ID',
    type: 'direct'
  },
  { value: 'investmentCompanyOwnership.percentage', label: 'Ownership Percentage', type: 'direct' }
]

export const investmentCompanyImportConfig: ImportConfig = {
  entityType: 'company',
  flowbotEntityType: 'InvestmentCompany',
  domain: 'investment',
  targetFields: [...companyCoreFields, ...companyAddressFields, ...companyExecutiveFields, ...companyOwnershipFields],
  preview: investmentCompanyPreviewConfig,
  deferOwnershipSubmission: true
}
