import { type Note, NoteFields, NoteFormFields, createNoteDescriptors } from '@/common/data/relations/types/noteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Investment } from './investmentTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface InvestmentNote extends Note {
  account?: InvestmentAccount
  contact?: InvestmentContact
  documents?: InvestmentDocument[]
  investment?: Investment
  investmentId?: string
  opportunity?: InvestmentOpportunity
  lead?: InvestmentLead
}

/**
 * Investment Note Query Field Mapping
 * IRM uses same field names as Common, so we use NoteFields directly
 */
export const InvestmentNoteFields = {
  ...NoteFields,
  investment: 'investment',
  investmentId: 'investmentId',
  noteType: ''
} as const

export const InvestmentNoteFormFields = {
  ...NoteFormFields,
  investmentId: 'investment'
} as const

export type InvestmentNoteFieldName = (typeof InvestmentNoteFields)[keyof typeof InvestmentNoteFields]

/**
 * Investment Note Descriptors
 * Uses createNoteDescriptors with InvestmentNoteFields mapping
 */
export const INVESTMENT_NOTE_DESCRIPTORS: Descriptor[] = [...createNoteDescriptors(InvestmentNoteFields)]

/**
 * Build Investment Note Payload
 * Uses buildPayload utility with InvestmentNoteFormFields mapping
 */
export const buildInvestmentNotePayload = (note: Partial<InvestmentNote> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(note, InvestmentNoteFormFields)

  return {
    investmentNote: payload
  }
}
