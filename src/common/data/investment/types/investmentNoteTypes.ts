import type { CommonNote } from '@/common/data/relations/types/commonNoteTypes'
import { NoteFields, createCommonNoteDescriptors } from '@/common/data/relations/types/commonNoteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import {
  Investment,
  InvestmentContact,
  InvestmentAccount,
  InvestmentDocument,
  InvestmentOpportunity,
  InvestmentLead
} from './'

export interface InvestmentNote extends CommonNote {
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
export const InvestmentNoteFields = NoteFields

export type InvestmentNoteFieldName = (typeof InvestmentNoteFields)[keyof typeof InvestmentNoteFields]

/**
 * Investment Note Descriptors
 * Uses createCommonNoteDescriptors with InvestmentNoteFields mapping
 */
export const INVESTMENT_NOTE_DESCRIPTORS: Descriptor[] = [...createCommonNoteDescriptors(InvestmentNoteFields)]
