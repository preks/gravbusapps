/**
 * Customer Account Types
 */

import type { CommonAccount } from '@/common/data/relations/types/commonAccountTypes'
import { COMMON_ACCOUNT_DESCRIPTORS } from '@/common/data/relations/types/commonAccountTypes'
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
 * Extends CommonAccount with CRM-specific fields and proper type mappings
 */
export interface CustomerAccount extends CommonAccount {
  // Map any types from CommonAccount to specific Customer types
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
  contact?: CustomerContact[] // Mapped to contacts (singular in CRM)
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
  tags?: any[] // CRM-specific (deprecated)
}

/**
 * Customer Account Descriptors
 * Extends Common descriptors with CRM-specific path overrides for wrong field names
 */
export const CUSTOMER_ACCOUNT_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors we need to override for CRM wrong field names
  ...COMMON_ACCOUNT_DESCRIPTORS.filter(
    d =>
      ![
        'industryClass',
        'companySize',
        'accountAnnualRevenueBand',
        'locality',
        'picture',
        'pictureThumbnail',
        'industryIds',
        'companySizeIds',
        'revenueBandIds'
      ].includes(d.key)
  ),

  // CRM-specific path overrides (key remains IRM-correct name, but paths use CRM field names)
  {
    key: 'industryClass',
    searchPaths: ['industry.value', 'industry.code'], // CRM uses "industry" not "industryClass"
    sortPath: 'industry.value',
    type: 'text'
  },
  {
    key: 'companySize',
    searchPaths: ['numberOfEmployees.value', 'numberOfEmployees.code'], // CRM uses "numberOfEmployees"
    sortPath: 'numberOfEmployees.value',
    type: 'text'
  },
  {
    key: 'accountAnnualRevenueBand',
    searchPaths: ['annualRevenue.value', 'annualRevenue.code'], // CRM uses "annualRevenue"
    sortPath: 'annualRevenue.value',
    type: 'text'
  },
  {
    key: 'locality',
    searchPaths: ['addresses.city'], // CRM uses "city" not "locality"
    sortPath: 'addresses.city',
    type: 'text'
  },
  { key: 'picture', searchPaths: ['pictureUrl'], sortPath: 'pictureUrl', type: 'text' }, // CRM: pictureUrl
  {
    key: 'pictureThumbnail',
    searchPaths: ['pictureThumbnailUrl'],
    sortPath: 'pictureThumbnailUrl',
    type: 'text'
  }, // CRM: pictureThumbnailUrl

  // CRM-specific filter path overrides
  { key: 'industryIds', path: 'industryRef', kind: 'inIds' },
  { key: 'companySizeIds', path: 'numberOfEmployeesRef', kind: 'inIds' },
  { key: 'revenueBandIds', path: 'annualRevenueRef', kind: 'inIds' },

  // CRM-specific additional fields
  { key: 'campaignIds', path: 'salesCampaignId', kind: 'inIds' }
]
