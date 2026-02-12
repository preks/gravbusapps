/**
 * Base Lead Import Configuration
 * Common fields shared between IRM and CRM lead imports
 * Following the same pattern as Lead → InvestmentLead / CustomerLead entity types
 */

import { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

export const baseLeadImportFields: TargetFieldDefinition[] = [
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
  { value: 'leadStatusRef', label: 'Lead Status (Catalog)', type: 'catalog', catalog: 'LeadStatus' },
  { value: 'leadRatingRef', label: 'Lead Rating (Catalog)', type: 'catalog', catalog: 'LeadRating' },
  { value: 'sourceCompanyName', label: 'Source Company Name', type: 'direct' },
  { value: 'sourceIndividualName', label: 'Source Individual Name', type: 'direct' },

  // Owner
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },

  // Additional
  { value: 'description', label: 'Description', type: 'direct' },
  { value: 'sensitive', label: 'Sensitive/Confidential', type: 'direct' }
]
