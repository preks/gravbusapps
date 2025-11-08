import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'
import { COMMON_LEAD_DESCRIPTORS } from '@/common/data/relations/types/commonLeadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { CustomerAccount } from './customerAccountTypes'
import { CustomerContact } from './customerContactTypes'
import { CustomerTask } from './customerTaskTypes'
import { CustomerDocument, CustomerOpportunity, CustomerActivity, CustomerNote } from './'

export interface CustomerLead extends CommonLead {
  account?: CustomerAccount
  activities?: CustomerActivity[]
  contact?: CustomerContact
  convertedAccount?: CustomerAccount
  convertedContact?: CustomerContact
  convertedOpportunity?: CustomerOpportunity
  documents?: CustomerDocument[]
  notes?: CustomerNote[]
  ownerOrganization?: any
  tasks?: CustomerTask[]

  // Base fields for mapping
  annualRevenue?: CatalogEntry // Mapped to accountAnnualRevenueBand
  annualRevenueRef?: string // Mapped to accountAnnualRevenueBandRef
  city?: string // Mapped to locality
  industry?: CatalogEntry // Mapped to industryClass
  industryRef?: string // Mapped to industryClassRef
  numberOfEmployees?: CatalogEntry // Mapped to companySize
  numberOfEmployeesRef?: string // Mapped to companySizeRef
  source?: string // Mapped to sourceCompanyName / sourceIndividualName
}

/**
 * Customer Lead Descriptors
 * Extends Common descriptors with CRM-specific path overrides for wrong field names
 */
export const CUSTOMER_LEAD_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors we need to override for CRM wrong field names
  ...COMMON_LEAD_DESCRIPTORS.filter(
    d =>
      ![
        'accountAnnualRevenueBand',
        'address',
        'companySize',
        'industryClass',
        'locality',
        'notes',
        'rejectionReasons',
        'accountAnnualRevenueBandIds',
        'companySizeIds',
        'industryClassIds'
      ].includes(d.key)
  ),

  // CRM-specific path overrides (key remains IRM-correct name, but paths use CRM field names)
  {
    key: 'accountAnnualRevenueBand',
    searchPaths: ['annualRevenue.value', 'annualRevenue.code'],
    sortPath: 'annualRevenue.value',
    type: 'text'
  },
  {
    key: 'companySize',
    searchPaths: ['numberOfEmployees.value', 'numberOfEmployees.code'],
    sortPath: 'numberOfEmployees.value',
    type: 'text'
  },
  {
    key: 'industryClass',
    searchPaths: ['industry.value', 'industry.code'],
    sortPath: 'industry.value',
    type: 'text'
  },
  { key: 'notes', searchPaths: ['notes.noteTitle', 'notes.noteText'], sortPath: 'notes.noteTitle', type: 'text' },
  {
    key: 'address',
    searchPaths: ['addressLine', 'postalCode', 'city', 'region.value', 'country.value'],
    sortPaths: ['addressLine', 'postalCode', 'city', 'region.value', 'country.value'], // Fallbacks in Reihenfolge
    type: 'text'
  },
  { key: 'locality', searchPaths: ['city'], sortPath: 'city', type: 'text' }, // CRM: city

  // CRM-specific filter path overrides
  { key: 'accountAnnualRevenueBandIds', path: 'annualRevenueRef', kind: 'inIds' },
  { key: 'companySizeIds', path: 'numberOfEmployeesRef', kind: 'inIds' },
  { key: 'industryClassIds', path: 'industryRef', kind: 'inIds' }
]
