import { type Lead, LeadFields, createLeadDescriptors, leadFormFields } from '@/common/data/relations/types/leadTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerTask } from './customerTaskTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import type { CustomerActivity } from './customerActivityTypes'
import type { CustomerNote } from './customerNoteTypes'
import { buildCustomerAccountPayload } from './customerAccountTypes'
import { buildCustomerContactPayload } from './customerContactTypes'
import { buildCustomerOpportunityPayload } from './customerOpportunityTypes'

export interface CustomerLead extends Lead {
  account?: CustomerAccount
  activities?: CustomerActivity[]
  aiLeadGrade?: string | null
  aiLeadScore?: number | null
  contact?: CustomerContact
  convertedAccount?: CustomerAccount
  convertedContact?: CustomerContact
  convertedOpportunity?: CustomerOpportunity
  documents?: CustomerDocument[]
  notes?: CustomerNote[]
  ownerOrganization?: any
  tasks?: CustomerTask[]

  salesCampaign?: any
  salesCampaignId?: string
  doubleOptIn?: boolean | null
  doubleOptInDate?: string | null
  optInSource?: CatalogEntry | null
  optInSourceRef?: string | null
  optInStatus?: CatalogEntry | null
  optInStatusRef?: string | null
  singleOptIn?: boolean | null
  singleOptInDate?: string | null
}

/**
 * Customer Lead Query Field Mapping
 * Extends LeadFields with CRM-specific GraphQL field names
 */
export const CustomerLeadFields = {
  ...LeadFields,
  aiLeadGrade: 'aiLeadGrade',
  aiLeadScore: 'aiLeadScore',
  // Override CRM-specific field names
  accountAnnualRevenueBand: 'annualRevenue',
  accountAnnualRevenueBandRef: 'annualRevenueRef',
  companySize: 'numberOfEmployees',
  companySizeRef: 'numberOfEmployeesRef',
  industryClass: 'industry',
  industryClassRef: 'industryRef',
  jobPosition: 'position',
  locality: 'city',
  doubleOptIn: 'doubleOptIn',
  doubleOptInDate: 'doubleOptInDate',
  optInSource: 'optInSource',
  optInSourceRef: 'optInSourceRef',
  optInStatus: 'optInStatus',
  optInStatusRef: 'optInStatusRef',
  singleOptIn: 'singleOptIn',
  singleOptInDate: 'singleOptInDate'
} as const

/**
 * Customer Lead Descriptors
 * Uses createLeadDescriptors with CustomerLeadFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 */
export const CUSTOMER_LEAD_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createLeadDescriptors(CustomerLeadFields as Record<keyof typeof LeadFields, string>).filter(
    d => !['notes', 'rejectionReasons', 'address'].includes(d.key)
  ),

  // CRM-specific structural overrides
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'], // CRM uses "noteTitle"/"noteText"
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  },
  {
    // CRM "Address" column shows the street (addressLine, a String), so include it in
    // search. The base descriptor omits addressLine because IRM stores it as jsonb where
    // _ilike is invalid; in CRM it is a plain String and safe to search.
    key: 'address',
    searchPaths: [
      CustomerLeadFields.addressLine,
      CustomerLeadFields.postalCode,
      CustomerLeadFields.locality,
      `${CustomerLeadFields.region}.value`,
      `${CustomerLeadFields.country}.value`
    ],
    sortPaths: [
      CustomerLeadFields.postalCode,
      CustomerLeadFields.locality,
      `${CustomerLeadFields.region}.value`,
      `${CustomerLeadFields.country}.value`
    ],
    type: 'text'
  },
  {
    key: 'aiLeadScore',
    searchPaths: ['aiLeadScore'],
    sortPath: 'aiLeadScore',
    type: 'number'
  },
  {
    key: 'aiLeadGrade',
    searchPaths: ['aiLeadGrade'],
    sortPath: 'aiLeadGrade',
    type: 'text'
  },
  {
    key: 'doubleOptIn',
    searchPaths: [CustomerLeadFields.doubleOptIn],
    sortPath: CustomerLeadFields.doubleOptIn,
    type: 'boolean'
  },
  {
    key: 'doubleOptInDate',
    searchPaths: [CustomerLeadFields.doubleOptInDate],
    sortPath: CustomerLeadFields.doubleOptInDate,
    type: 'date'
  },
  {
    key: 'optInSource',
    searchPaths: [`${CustomerLeadFields.optInSource}.value`, `${CustomerLeadFields.optInSource}.code`],
    sortPath: `${CustomerLeadFields.optInSource}.value`,
    type: 'text'
  },
  {
    key: 'optInSourceRef',
    searchPaths: [CustomerLeadFields.optInSourceRef],
    sortPath: CustomerLeadFields.optInSourceRef,
    type: 'text'
  },
  {
    key: 'optInStatus',
    searchPaths: [`${CustomerLeadFields.optInStatus}.value`, `${CustomerLeadFields.optInStatus}.code`],
    sortPath: `${CustomerLeadFields.optInStatus}.value`,
    type: 'text'
  },
  {
    key: 'optInStatusRef',
    searchPaths: [CustomerLeadFields.optInStatusRef],
    sortPath: CustomerLeadFields.optInStatusRef,
    type: 'text'
  },
  {
    key: 'singleOptIn',
    searchPaths: [CustomerLeadFields.singleOptIn],
    sortPath: CustomerLeadFields.singleOptIn,
    type: 'boolean'
  },
  {
    key: 'singleOptInDate',
    searchPaths: [CustomerLeadFields.singleOptInDate],
    sortPath: CustomerLeadFields.singleOptInDate,
    type: 'date'
  },

  // CRM-specific filter: sales campaign (form-savable via salesCampaignId)
  {
    key: 'salesCampaignIds',
    path: 'salesCampaignId',
    filterLabel: 'Sales Campaign',
    kind: 'inIds',
    optionSelectPaths: ['salesCampaign.id', 'salesCampaign.name'],
    optionSearchPaths: ['salesCampaign.name'],
    optionDistinctOn: ['salesCampaignId']
  }
]

/**
 * Customer Lead Form Fields Configuration
 * Extends leadFormFields with CRM-specific field mappings
 */
export const customerLeadFormFields = {
  ...Object.fromEntries(Object.entries(leadFormFields).filter(([key]) => key !== 'addressLine')),
  // Override mappings for CRM field name differences
  accountAnnualRevenueBandRef: 'annualRevenueRef',
  companySizeRef: 'numberOfEmployeesRef',
  industryClassRef: 'industryRef',
  jobPosition: 'position',
  locality: 'city',
  // CRM-specific fields
  salesCampaignId: 'salesCampaign'
} as const

/**
 * Build Customer Lead payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping via customerLeadFormFields
 * - Empty value exclusion
 * - ID/version automatically included if present (determines update vs create)
 * - CRM-specific fields (salesCampaign, accountId, timeZone)
 *
 * @param lead - Partial CustomerLead entity (only fields provided by form)
 * @returns Payload object ready for API submission
 */
export const buildCustomerLeadPayload = (lead: Partial<CustomerLead>) => {
  const { addressLine, ...leadWithoutAddressLine } = lead
  // Build base payload using customerLeadFormFields for field mapping
  const basePayload = buildPayload(leadWithoutAddressLine, customerLeadFormFields)

  if (addressLine !== undefined && addressLine !== null) {
    basePayload.addressLine = typeof addressLine === 'object' ? JSON.stringify(addressLine) : addressLine
  }

  return {
    lead: basePayload
  }
}

/**
 * Transform CustomerLead (raw GraphQL) to CustomerLead (enhanced/standardized)
 *
 * Handles CRM-specific field naming inconsistencies by mapping them to Lead standards.
 * Uses fallback pattern: only maps if target field doesn't already exist.
 *
 * Key Mappings (fallback only):
 * - annualRevenue → accountAnnualRevenueBand
 * - industry → industryClass
 * - numberOfEmployees → companySize
 */
export function toCustomerLead(raw: any): CustomerLead {
  // Extract incorrectly named fields to exclude from spread
  const {
    annualRevenue,
    annualRevenueRef,
    city,
    industry,
    industryRef,
    position,
    numberOfEmployees,
    numberOfEmployeesRef,
    ...rest
  } = raw

  return {
    ...rest,
    // Map only if target field doesn't already exist (fallback mapping)
    accountAnnualRevenueBand: raw.accountAnnualRevenueBand ?? annualRevenue,
    accountAnnualRevenueBandRef: raw.accountAnnualRevenueBandRef ?? annualRevenueRef,
    jobPosition: raw.jobPosition ?? position,
    locality: raw.locality ?? city,
    industryClass: raw.industryClass ?? industry,
    industryClassRef: raw.industryClassRef ?? industryRef,
    companySize: raw.companySize ?? numberOfEmployees,
    companySizeRef: raw.companySizeRef ?? numberOfEmployeesRef,

    // Map addressLine from string to { lines: string[] } if it's a string
    addressLine:
      typeof raw.addressLine === 'string'
        ? (() => {
            try {
              return JSON.parse(raw.addressLine)
            } catch {
              return undefined
            }
          })()
        : raw.addressLine
  } as CustomerLead
}

/**
 * Build Customer Lead Convert Payload
 * Simple function that takes lead ID and optional account, contact, opportunity objects
 *
 * @param leadId - The ID of the lead being converted
 * @param account - Account object (full object for create, or { id: string } for match)
 * @param contact - Contact object (full object for create, or { id: string } for match)
 * @param opportunity - Opportunity object (only if creating opportunity)
 */
export const buildCustomerLeadConvertPayload = (
  leadId: string,
  account?: Partial<CustomerAccount> | { id: string },
  contact?: Partial<CustomerContact> | { id: string },
  opportunity?: Partial<CustomerOpportunity>
) => {
  const payload: any = {
    leadId
  }

  // Handle Account
  if (account) {
    if ('id' in account && Object.keys(account).length === 1) {
      // Match existing account - only send id
      payload.account = { id: account.id }
    } else {
      // Create new account - use payload builder
      const { account: accountPayload } = buildCustomerAccountPayload(account as Partial<CustomerAccount>)
      payload.account = accountPayload
    }
  }

  // Handle Contact
  if (contact) {
    if ('id' in contact && Object.keys(contact).length === 1) {
      // Match existing contact - only send id
      payload.contact = { id: contact.id }
    } else {
      // Create new contact - use payload builder
      const { contact: contactPayload } = buildCustomerContactPayload(contact as Partial<CustomerContact>)
      payload.contact = contactPayload
    }
  }

  // Handle Opportunity
  if (opportunity) {
    const { opportunity: opportunityPayload } = buildCustomerOpportunityPayload(opportunity)
    payload.opportunity = opportunityPayload
  }

  return payload
}
