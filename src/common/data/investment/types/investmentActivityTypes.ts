import type { CommonActivity } from '@/common/data/relations/types/commonActivityTypes'
import { ActivityFields, createCommonActivityDescriptors } from '@/common/data/relations/types/commonActivityTypes'
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
 * Investment Activity Query Field Mapping
 * IRM uses same field names as Common, so we use ActivityFields directly
 */
export const InvestmentActivityFields = ActivityFields

export type InvestmentActivityFieldName = (typeof InvestmentActivityFields)[keyof typeof InvestmentActivityFields]

/**
 * Investment Activity Descriptors
 * Uses createCommonActivityDescriptors with InvestmentActivityFields mapping
 */
export const INVESTMENT_ACTIVITY_DESCRIPTORS: Descriptor[] = [
  ...createCommonActivityDescriptors(InvestmentActivityFields)
]
