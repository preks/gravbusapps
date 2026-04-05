/**
 * Customer Lead Import Configuration (CRM)
 * Full explicit field list for CustomerLead schema.
 * CRM-specific fields: city, Region catalog, industryRef, numberOfEmployeesRef, SalesLead* catalogs.
 */

import { sharedLeadImportFields } from '@/common/data/relations/types/leadImportConfig'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

export const customerLeadImportConfig: ImportConfig = {
  entityType: 'lead',
  domain: 'customer',
  targetFields: [
    ...sharedLeadImportFields,

    // CRM-specific company fields (not in InvestmentLead schema)
    { value: 'numberOfEmployeesRef', label: 'Company Size (Catalog)', type: 'catalog', catalog: 'CompanySize' },
    { value: 'industryRef', label: 'Industry (Catalog)', type: 'catalog', catalog: 'IndustryClass' },

    // CRM-specific address fields
    { value: 'city', label: 'City', type: 'direct' },
    { value: 'regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'Region' },

    // CRM-specific lead catalog fields
    { value: 'leadStatusRef', label: 'Lead Status (Catalog)', type: 'catalog', catalog: 'SalesLeadStatus' },
    { value: 'leadSourceRef', label: 'Lead Source (Catalog)', type: 'catalog', catalog: 'SalesLeadSource' },
    { value: 'leadRatingRef', label: 'Lead Rating (Catalog)', type: 'catalog', catalog: 'SalesLeadRating' }
  ]
}
