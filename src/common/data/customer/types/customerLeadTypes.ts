import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { type Lead, LeadFields, createLeadDescriptors } from '@/common/data/relations/types/leadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { CustomerAccount } from './customerAccountTypes'
import { CustomerContact } from './customerContactTypes'
import { CustomerTask } from './customerTaskTypes'
import { CustomerDocument, CustomerOpportunity, CustomerActivity, CustomerNote } from './'

export interface CustomerLead extends Lead {
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
 * Customer Lead Query Field Mapping
 * Extends LeadFields with CRM-specific GraphQL field names
 */
export const CustomerLeadFields = {
  ...LeadFields,
  // Override CRM-specific field names
  accountAnnualRevenueBand: 'annualRevenue',
  accountAnnualRevenueBandRef: 'annualRevenueRef',
  companySize: 'numberOfEmployees',
  companySizeRef: 'numberOfEmployeesRef',
  industryClass: 'industry',
  industryClassRef: 'industryRef',
  locality: 'city'
} as const

export type CustomerLeadFieldName = (typeof CustomerLeadFields)[keyof typeof CustomerLeadFields]

/**
 * Customer Lead Descriptors
 * Uses createLeadDescriptors with CustomerLeadFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 */
export const CUSTOMER_LEAD_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createLeadDescriptors(CustomerLeadFields as Record<keyof typeof LeadFields, string>).filter(
    d => !['address', 'locality', 'notes', 'rejectionReasons'].includes(d.key)
  ),

  // CRM-specific structural overrides
  {
    key: 'address',
    searchPaths: ['postalCode', 'city', 'region.value', 'country.value'], // CRM uses "city" not "locality"
    sortPaths: ['postalCode', 'city', 'region.value', 'country.value'],
    type: 'text'
  },
  {
    key: 'locality',
    searchPaths: ['city'], // CRM uses "city" not "locality"
    sortPath: 'city',
    type: 'text'
  },
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'], // CRM uses "noteTitle"/"noteText"
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  }
]
