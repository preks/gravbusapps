import type { CommonNote } from '@/common/data/relations/types/commonNoteTypes'
import { COMMON_NOTE_DESCRIPTORS } from '@/common/data/relations/types/commonNoteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount, CustomerContact, CustomerDocument, CustomerOpportunity, CustomerLead } from './'

export interface CustomerNote extends CommonNote {
  account?: CustomerAccount
  contact?: CustomerContact
  documents?: CustomerDocument[] // TODO: Missing
  opportunity?: CustomerOpportunity
  lead?: CustomerLead

  // TODO: Mapping fields
  noteText?: string // Mapped to text
  noteTitle?: string // Mapped to title
}

/**
 * Customer Note Descriptors
 * CRM uses correct field names, so we use Common descriptors directly
 */
export const CUSTOMER_NOTE_DESCRIPTORS: Descriptor[] = [...COMMON_NOTE_DESCRIPTORS]
