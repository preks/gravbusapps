/**
 * Customer Account Types
 */

import {
  type Account,
  AccountFields,
  createAccountDescriptors,
  AccountFormFields
} from '@/common/data/relations/types/accountTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import {
  filterCommunicationChannels,
  filterAddresses,
  addressLineToString
} from '@/common/data/common/utils/entityPayloadHelpers'
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

  // CRM-specific fields
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
  pictureThumbnail: 'pictureThumbnailUrl',
  // Note: CRM doesn't have "activities" or "leads" on Account level

  // CRM-specific fields
  salesCampaign: 'salesCampaign',
  salesCampaignId: 'salesCampaignId'
} as const

/**
 * Customer Account Descriptors
 * Uses createAccountDescriptors with CustomerAccountFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 * Adds CRM-specific fields that don't exist in Common/IRM
 */
export const CUSTOMER_ACCOUNT_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createAccountDescriptors(CustomerAccountFields as Record<keyof typeof AccountFields, string>).filter(
    d => !['activities', 'leads', 'locality', 'notes', 'opportunities'].includes(d.key)
  ),

  // CRM-specific structural overrides
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
    searchPaths: ['opportunityAccounts.opportunity.name'], // CRM uses singular "opportunity"
    sortPaths: ['opportunityAccounts.opportunity.name'],
    type: 'text'
  },

  // CRM-specific fields
  { key: 'campaignIds', path: 'salesCampaignId', kind: 'inIds' }
]

/**
 * Customer Account Form Fields Configuration
 * Extends AccountFormFields with CRM-specific fields
 */
export const customerAccountFormFields = {
  ...AccountFormFields,
  // CRM-specific fields
  salesCampaignId: 'salesCampaign',
  // Overwrite
  picture: 'pictureUrl',
  pictureThumbnail: 'pictureThumbnailUrl',
  companySizeRef: 'numberOfEmployeesRef',
  industryClassRef: 'industryRef',
  accountAnnualRevenueBandRef: 'annualRevenueRef'
} as const

export const buildCustomerAccountPayload = (account: Partial<CustomerAccount>) => {
  // Build base payload using customerAccountFormFields for field mapping
  const basePayload = buildPayload(account, customerAccountFormFields)

  // Filter communication channels
  const filteredChannels = filterCommunicationChannels(basePayload.communicationChannels)
  if (filteredChannels) {
    basePayload.communicationChannels = filteredChannels
  } else {
    delete basePayload.communicationChannels
  }

  // Filter and transform addresses (CRM uses JSON string for addressLine)
  const filteredAddresses = filterAddresses(basePayload.addresses, addressLineToString)
  if (filteredAddresses) {
    basePayload.addresses = filteredAddresses
  } else {
    delete basePayload.addresses
  }

  return {
    account: basePayload
  }
}

/**
 * Transform raw GraphQL response to CustomerAccount
 *
 * NOTE: This mapper handles CRM-specific field naming inconsistencies:
 * - industry → industryClass (fallback only)
 * - numberOfEmployees → companySize (fallback only)
 * - annualRevenue → accountAnnualRevenueBand (fallback only)
 * - salesCampaign → customerCampaign
 * - pictureUrl → picture (fallback only)
 * - pictureThumbnailUrl → pictureThumbnail (fallback only)
 * - contact → contacts (singular to plural, if needed)
 * - opportunity → opportunities (singular to plural, fallback only)
 * - lead → leads (singular to plural)
 * - crmAddress → addresses (fallback only)
 * - crmDocument → documents (fallback only)
 * - crmNote → notes (fallback only)
 */
export function toCustomerAccount(raw: any): CustomerAccount {
  // Extract incorrectly named fields to exclude from spread
  const {
    annualRevenue,
    annualRevenueRef,
    crmAddress,
    crmDocument,
    crmNote,
    industry,
    industryRef,
    numberOfEmployees,
    numberOfEmployeesRef,
    opportunity,
    pictureUrl,
    pictureThumbnailUrl,
    lead,
    ...rest
  } = raw

  // Transform addresses array: convert addressLine from string to object (same logic as toCustomerLead)
  const addresses = (raw.addresses ?? crmAddress)?.map((addr: any) => ({
    ...addr,
    addressLine:
      typeof addr.addressLine === 'string'
        ? (() => {
            try {
              return JSON.parse(addr.addressLine)
            } catch {
              return undefined
            }
          })()
        : addr.addressLine
  }))

  return {
    ...rest,
    // Map only if target field doesn't already exist (fallback mapping)
    industryClass: raw.industryClass ?? industry,
    industryClassRef: raw.industryClassRef ?? industryRef,
    companySize: raw.companySize ?? numberOfEmployees,
    companySizeRef: raw.companySizeRef ?? numberOfEmployeesRef,
    accountAnnualRevenueBand: raw.accountAnnualRevenueBand ?? annualRevenue,
    accountAnnualRevenueBandRef: raw.accountAnnualRevenueBandRef ?? annualRevenueRef,
    picture: raw.picture ?? pictureUrl,
    pictureThumbnail: raw.pictureThumbnail ?? pictureThumbnailUrl,
    addresses: addresses,
    documents: raw.documents ?? crmDocument,
    notes: raw.notes ?? crmNote,
    opportunities: raw.opportunities ?? opportunity,
    leads: raw.leads ?? lead
  } as CustomerAccount
}
