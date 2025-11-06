import type { CommonNote } from '@/common/data/relations/types/commonNoteTypes'
import { COMMON_NOTE_DESCRIPTORS } from '@/common/data/relations/types/commonNoteTypes'
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
 * Investment Note Descriptors
 * IRM uses correct field names, so we use Common descriptors directly
 */
export const INVESTMENT_NOTE_DESCRIPTORS: Descriptor[] = [...COMMON_NOTE_DESCRIPTORS]
