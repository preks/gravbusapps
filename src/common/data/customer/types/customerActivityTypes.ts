import type { CommonActivity } from '@/common/data/relations/types/commonActivityTypes'
import { COMMON_ACTIVITY_DESCRIPTORS } from '@/common/data/relations/types/commonActivityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { CustomerAccount, CustomerContact, CustomerDocument, CustomerOpportunity, CustomerLead } from './'

export interface CustomerActivity extends CommonActivity {
  account?: CustomerAccount
  contact?: CustomerContact
  documents?: CustomerDocument[]
  opportunity?: CustomerOpportunity
  lead?: CustomerLead
}

/**
 * Customer Activity Descriptors
 * CRM uses correct field names, so we use Common descriptors directly
 */
export const CUSTOMER_ACTIVITY_DESCRIPTORS: Descriptor[] = [...COMMON_ACTIVITY_DESCRIPTORS]
