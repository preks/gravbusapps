/**
 * Customer Account Types
 */

import type { Account } from '@/common/data/relations/types/accountTypes'
import { AccountFields, createAccountDescriptors } from '@/common/data/relations/types/accountTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAddress } from './customerAddressTypes'
import type { CustomerCommunicationChannel } from './customerCommunicationChannelTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerNote } from './customerNoteTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import type { CustomerTask } from './customerTaskTypes'
import type { CustomerAccountContact } from './customerRelationTypes'

/**
 * Customer Account Type
 * Extends Account with CRM-specific fields and proper type mappings
 */
export interface CustomerAccount extends Account {
  // Map any types from Account to specific Customer types
  accountContacts?: CustomerAccountContact[]
  addresses?: CustomerAddress[]
  communicationChannels?: CustomerCommunicationChannel[]
  contacts?: CustomerContact[]
  documents?: CustomerDocument[]
  notes?: CustomerNote[]
  opportunities?: CustomerOpportunity[]
  tasks?: CustomerTask[]

  // Base fields for mapping (CRM-specific GraphQL field names that need mapping)
  annualRevenue?: any // Mapped to accountAnnualRevenueBand (CatalogEntry)
  annualRevenueRef?: string // Mapped to accountAnnualRevenueBandRef
  //contact?: CustomerContact[] // Mapped to contacts (singular in CRM)
  crmAddress?: CustomerAddress[] // Duplicate - mapped to addresses
  crmDocument?: CustomerDocument[] // Duplicate - mapped to documents
  crmNote?: CustomerNote[] // Duplicate - mapped to notes
  industry?: any // Mapped to industryClass (CatalogEntry)
  industryRef?: string // Mapped to industryClassRef
  numberOfEmployees?: any // Mapped to companySize (CatalogEntry)
  numberOfEmployeesRef?: string // Mapped to companySizeRef
  opportunity?: CustomerOpportunity[] // Mapped to opportunities (singular in CRM)
  pictureUrl?: string // Mapped to picture
  pictureThumbnailUrl?: string // Mapped to pictureThumbnail
  salesCampaign?: any // CRM-specific (SalesCampaign)
  salesCampaignId?: string // CRM-specific
}

/**
 * Customer Account Query Field Mapping
 * Extends AccountFields with CRM-specific GraphQL field names
 */
export const CustomerAccountFields = {
  ...AccountFields,
  // Override CRM-specific field names
  accountAnnualRevenueBand: 'annualRevenue',
  accountAnnualRevenueBandRef: 'annualRevenueRef',
  companySize: 'numberOfEmployees',
  companySizeRef: 'numberOfEmployeesRef',
  contacts: 'contact', // CRM uses singular "contact"
  industryClass: 'industry',
  industryClassRef: 'industryRef',
  opportunities: 'opportunity', // CRM uses singular "opportunity"
  picture: 'pictureUrl',
  pictureThumbnail: 'pictureThumbnailUrl'
  // Note: CRM doesn't have "activities" or "leads" on Account level
} as const

export type CustomerAccountFieldName = (typeof CustomerAccountFields)[keyof typeof CustomerAccountFields]

/**
 * Customer Account Descriptors
 * Uses createAccountDescriptors with CustomerAccountFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 * Adds CRM-specific fields that don't exist in Common/IRM
 */
export const CUSTOMER_ACCOUNT_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createAccountDescriptors(CustomerAccountFields as Record<keyof typeof AccountFields, string>).filter(
    d => !['activities', 'addresses', 'leads', 'locality', 'notes', 'opportunities'].includes(d.key)
  ),

  // CRM-specific structural overrides
  {
    key: 'addresses',
    searchPaths: [
      'addresses.city', // CRM uses "city" not "locality"
      'addresses.postalCode',
      'addresses.region.value',
      'addresses.country.value'
    ],
    sortPaths: ['addresses.city', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    type: 'text'
  },
  {
    key: 'leads',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'], // CRM uses singular "lead"
    sortPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    type: 'text'
  },
  {
    key: 'locality',
    searchPaths: ['addresses.city'], // CRM uses "city" not "locality"
    sortPath: 'addresses.city',
    type: 'text'
  },
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'], // CRM uses "noteTitle"/"noteText"
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  },
  {
    key: 'opportunities',
    searchPaths: ['opportunity.name'], // CRM uses singular "opportunity"
    sortPaths: ['opportunity.name'],
    type: 'text'
  },

  // CRM-specific additional fields
  { key: 'campaignIds', path: 'salesCampaignId', kind: 'inIds' }
]
