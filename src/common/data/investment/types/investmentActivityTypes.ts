import type { CommonActivity } from '@/common/data/relations/types/commonActivityTypes'
import { COMMON_ACTIVITY_DESCRIPTORS } from '@/common/data/relations/types/commonActivityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import {
  Investment,
  InvestmentContact,
  InvestmentAccount,
  InvestmentDocument,
  InvestmentOpportunity,
  InvestmentLead
} from './'

export interface InvestmentActivity extends CommonActivity {
  account?: InvestmentAccount
  contact?: InvestmentContact
  documents?: InvestmentDocument[]
  investment?: Investment
  investmentId?: string
  opportunity?: InvestmentOpportunity
  lead?: InvestmentLead

  /**
   * @deprecated TODO: Use documents instead
   */
  investmentDocument?: InvestmentDocument[]
}

/**
 * Investment Activity Descriptors
 * IRM uses correct field names, so we use Common descriptors directly
 */
export const INVESTMENT_ACTIVITY_DESCRIPTORS: Descriptor[] = [...COMMON_ACTIVITY_DESCRIPTORS]
