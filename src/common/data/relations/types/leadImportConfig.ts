/**
 * Shared Lead Import Fields
 * Only fields that exist in BOTH CustomerLead (CRM) and InvestmentLead (IRM) schemas.
 * Domain-specific fields live in customerLeadImportConfig and investmentLeadImportConfig respectively.
 */

import { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

export const sharedLeadImportFields: TargetFieldDefinition[] = [
  // Personal Information
  { value: 'salutationRef', label: 'Salutation (Catalog)', type: 'catalog', catalog: 'Salutation' },
  { value: 'academicTitleRef', label: 'Academic Title (Catalog)', type: 'catalog', catalog: 'AcademicTitle' },
  { value: 'firstName', label: 'First Name', type: 'direct' },
  { value: 'lastName', label: 'Last Name', type: 'direct' },
  { value: 'position', label: 'Position/Job Title', type: 'direct' },

  // Contact Information
  { value: 'email', label: 'Email', type: 'direct' },
  { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },

  // Company Information (shared between CRM and IRM)
  { value: 'companyName', label: 'Company Name', type: 'direct' },
  { value: 'companyEmail', label: 'Company Email', type: 'direct' },
  { value: 'companyPhone', label: 'Company Phone', type: 'direct' },
  { value: 'companyWebsite', label: 'Company Website', type: 'direct' },
  { value: 'legalFormRef', label: 'Legal Form (Catalog)', type: 'catalog', catalog: 'LegalForm' },
  {
    value: 'accountAnnualRevenueBandRef',
    label: 'Annual Revenue (Catalog)',
    type: 'catalog',
    catalog: 'AnnualRevenue'
  },

  // Address (shared fields only; city/locality and regionRef differ per domain)
  { value: 'addressLine', label: 'Address Line', type: 'direct' },
  { value: 'postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },

  // Lead Information (shared non-catalog fields)
  { value: 'sourceCompanyName', label: 'Source Company Name', type: 'direct' },
  { value: 'sourceIndividualName', label: 'Source Individual Name', type: 'direct' },

  // Owner
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },

  // Additional
  { value: 'description', label: 'Description', type: 'direct' },
  { value: 'sensitive', label: 'Sensitive/Confidential', type: 'direct' }
]
