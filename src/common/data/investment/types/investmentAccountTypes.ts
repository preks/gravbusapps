/**
 * Investment Account Types
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
  filterAddressLines
} from '@/common/data/common/utils/entityPayloadHelpers'
import { splitAccountContactDrafts } from '@/common/data/common/utils/inlineDraftHelpers'
import type { InvestmentReport } from './investmentTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentAccountContact } from './investmentAccountContactTypes'
import type { InvestmentInvestmentAccount } from './investmentAccountAssociationTypes'

/**
 * Investment Account Type
 * Extends Account with IRM-specific fields and proper type mappings
 */
export interface InvestmentAccount extends Account {
  // Investment-specific fields (GraphQL `investments` junction rows on InvestmentAccount)
  investments?: InvestmentInvestmentAccount[]
  investmentReports?: InvestmentReport[]

  // Mapped from Account to Investment-specific types
  accountContacts?: InvestmentAccountContact[]
  /** Raw GraphQL field name; use `accountContacts` when data is mapped via toInvestmentAccount */
  investmentAccountContact?: InvestmentAccountContact[]
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  documents?: InvestmentDocument[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunities?: InvestmentOpportunity[]
  tasks?: InvestmentTask[]
}

/**
 * Investment Account Query Field Mapping
 * Extends AccountFields with IRM-specific GraphQL field names
 */
export const InvestmentAccountFields = {
  ...AccountFields,
  // Override IRM-specific field names
  accountContacts: 'investmentAccountContact',
  //activities: 'investmentActivity',
  //documents: 'investmentDocument',
  leads: 'investmentLead',
  //notes: 'investmentNote',
  opportunities: 'investmentOpportunity'
  //tasks: 'investmentTask'
} as const

/**
 * Investment Account Descriptors
 * Uses createAccountDescriptors with InvestmentAccountFields mapping
 * Adds IRM-specific fields that don't exist in Common/CRM
 */
export const INVESTMENT_ACCOUNT_DESCRIPTORS: Descriptor[] = [
  ...createAccountDescriptors(InvestmentAccountFields as Record<keyof typeof AccountFields, string>).map(descriptor => {
    // Disable search/sort for opportunities field - it's not a direct field on InvestmentAccount
    // investmentOpportunity is not directly queryable on InvestmentAccount in GraphQL schema
    // (Opportunities link TO accounts via opportunityAccounts junction table, not the other way)
    if (descriptor.key === 'opportunities') {
      return {
        ...descriptor,
        enableSearch: false,
        enableSort: false,
        searchPaths: [],
        sortPath: undefined,
        sortPaths: []
      }
    }
    return descriptor
  }),

  // IRM-specific fields (not in Common/CRM)
  // Note: investmentInvestmentAccount is a relationship from Investment TO InvestmentAccount
  // It does not exist as a field ON InvestmentAccount
  // Filtering InvestmentAccount by investment data must be done via reverse relationships
  // For now, these descriptors are commented out as they require a different approach

  // IRM-specific filter IDs
  { key: 'reportIds', path: 'investmentReport.id', kind: 'inIds' }
]

/**
 * Investment Account Form Fields Configuration
 * Extends AccountFormFields with IRM-specific fields (currently just mirrors AccountFormFields)
 *
 * This allows for future IRM-specific field additions or overrides
 */
export const investmentAccountFormFields = { ...AccountFormFields } as const

export const buildInvestmentAccountPayload = (account: Partial<InvestmentAccount>) => {
  // Keep only existing selected associations under the parent account. Inline-created drafts
  // are lifted to top-level `investmentContacts` by the form submit handler.
  const { existingAccountContacts } = splitAccountContactDrafts(account.accountContacts as any[] | undefined)
  const accountWithExistingAssociations: Partial<InvestmentAccount> = {
    ...account,
    accountContacts: existingAccountContacts as InvestmentAccount['accountContacts']
  }

  // Build base payload using investmentAccountFormFields for field mapping
  const payload = buildPayload(accountWithExistingAssociations, investmentAccountFormFields)

  // Filter communication channels
  const filteredChannels = filterCommunicationChannels(payload.communicationChannels)
  if (filteredChannels) {
    payload.communicationChannels = filteredChannels
  } else {
    delete payload.communicationChannels
  }

  // Filter addresses (IRM keeps addressLine as object)
  const filteredAddresses = filterAddresses(payload.addresses, filterAddressLines)
  if (filteredAddresses) {
    payload.addresses = filteredAddresses
  } else {
    delete payload.addresses
  }

  return {
    investmentAccount: payload
  }
}

/**
 * Transform raw GraphQL response to InvestmentAccount
 *
 * NOTE: IRM field naming already matches Account standards:
 * - industryClass (IRM) ✓
 * - companySize (IRM) ✓
 * - accountAnnualRevenueBand (IRM) ✓
 * - locality (IRM) ✓
 *
 * This mapper handles array naming transformations:
 * - investment → investments
 * - investmentReport → reports
 * - investmentCommunicationChannel → communicationChannels
 * - investmentAccountContact → accountContacts (common naming)
 * - investmentOpportunity → opportunities (common naming)
 * - investmentLead → leads (common naming)
 */
/** Contact junction rows from mapped or raw GraphQL account payloads */
export function getInvestmentAccountContactAssociations(
  account?: InvestmentAccount | null
): InvestmentAccountContact[] {
  if (!account) {
    return []
  }
  return account.accountContacts ?? account.investmentAccountContact ?? []
}

export function toInvestmentAccount(raw: any): InvestmentAccount {
  // Extract GraphQL field names to exclude from spread
  const {
    investments, // GraphQL field name for junction table relationship
    investmentReport,
    investmentAccountContact,
    investmentCommunicationChannel,
    investmentLead,
    investmentOpportunity,
    ...rest
  } = raw

  return {
    ...rest,
    // Map GraphQL field names to TypeScript interface names
    // investments field comes from GraphQL relationship, keep it as-is
    investments: investments ?? [],
    investmentReports: raw.investmentReports ?? investmentReport,
    accountContacts: raw.accountContacts ?? investmentAccountContact,
    communicationChannels: raw.communicationChannels ?? investmentCommunicationChannel,
    leads: raw.leads ?? investmentLead,
    opportunities: raw.opportunities ?? investmentOpportunity
  } as InvestmentAccount
}
