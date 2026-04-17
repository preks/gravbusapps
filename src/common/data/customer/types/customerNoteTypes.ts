import {
  type Note,
  type CrmNoteType,
  NoteFields,
  NoteFormFields,
  createNoteDescriptors
} from '@/common/data/relations/types/noteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { mapRawCrmNoteGraphQLRow } from '../utils/crmNoteMap'

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
  title: 'noteTitle',
  noteType: 'noteType'
} as const

/** Notes tab: unknown + general. Prefer notes mapped with mapRawCrmNoteGraphQLRow / toCustomerNote so noteType matches API. */
export function isCrmNoteRegularType(note: { noteType?: CrmNoteType | string | null }): boolean {
  const v = note.noteType
  if (v == null) return true
  return v === 'UNKNOWN_NOTE_TYPE' || v === 'GENERAL_NOTE'
}

/** Next Steps tab only. */
export function isCrmNoteNextStepType(note: { noteType?: CrmNoteType | string | null }): boolean {
  return note.noteType === 'NEXT_STEP_NOTE'
}

/** Default for create payload when noteType omitted (CRM note create). */
export const CRM_NOTE_TYPE_DEFAULT: CrmNoteType = 'GENERAL_NOTE'

/** Page analytics / activity feed: normalized CRM note row. */
export function mapCrmNoteRawToAnalyticsActivity(note: any): {
  id: string
  type: 'note' | 'next_step_note'
  title: string
  occurredAt: string | undefined
  meta: { author?: string; text?: string; noteType?: CrmNoteType | null }
} {
  const n = mapRawCrmNoteGraphQLRow(note)
  const titleBase = (n.noteTitle ?? n.title ?? 'Note') as string
  const isNext = isCrmNoteNextStepType(n)
  return {
    id: n.id,
    type: isNext ? 'next_step_note' : 'note',
    title: titleBase,
    occurredAt: n.createdAt || undefined,
    meta: {
      author: n.createdBy,
      text: (n.noteText ?? n.text) as string | undefined,
      noteType: n.noteType ?? undefined
    }
  }
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
  const withNoteType = {
    ...note,
    noteType: note.noteType ?? CRM_NOTE_TYPE_DEFAULT
  }
  const payload = buildPayload(withNoteType, CustomerNoteFormFields)

  return {
    crmNote: payload
  }
}

/** Next steps quick-add: same as general note payload but forces crmNote.noteType (no UI field). */
export const buildCustomerNextStepNotePayload = (note: Record<string, any>) => {
  const { crmNote } = buildCustomerNotePayload({ ...note, noteType: 'NEXT_STEP_NOTE' })
  return {
    crmNote: {
      ...crmNote,
      noteType: 'NEXT_STEP_NOTE' as const
    }
  }
}
