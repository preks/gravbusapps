import type { Note } from '@/common/data/relations/types/noteTypes'
import { NoteFields, createNoteDescriptors } from '@/common/data/relations/types/noteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount, CustomerContact, CustomerDocument, CustomerOpportunity, CustomerLead } from './'

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

export type CustomerNoteFieldName = (typeof CustomerNoteFields)[keyof typeof CustomerNoteFields]

/**
 * Customer Note Descriptors
 * Uses createNoteDescriptors with CustomerNoteFields mapping
 */
export const CUSTOMER_NOTE_DESCRIPTORS: Descriptor[] = [
  ...createNoteDescriptors(CustomerNoteFields as Record<keyof typeof NoteFields, string>)
]
