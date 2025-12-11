import { type Note, NoteFields, NoteFormFields, createNoteDescriptors } from '@/common/data/relations/types/noteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface CustomerNote extends Note {
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
 * Customer Note Query Field Mapping
 * Extends NoteFields with CRM-specific GraphQL field names
 */
export const CustomerNoteFields = {
  ...NoteFields,
  // Override CRM-specific field names
  text: 'noteText',
  title: 'noteTitle'
} as const

export const CustomerNoteFormFields = {
  ...NoteFormFields,
  text: 'noteText',
  title: 'noteTitle'
}

/**
 * Customer Note Descriptors
 * Uses createNoteDescriptors with CustomerNoteFields mapping
 */
export const CUSTOMER_NOTE_DESCRIPTORS: Descriptor[] = [
  ...createNoteDescriptors(CustomerNoteFields as Record<keyof typeof NoteFields, string>)
]

/**
 * Build Customer Note Payload
 * Uses buildPayload utility with CustomerNoteFormFields mapping
 */
export const buildCustomerNotePayload = (note: Partial<CustomerNote> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(note, CustomerNoteFormFields)

  return {
    crmNote: payload
  }
}
