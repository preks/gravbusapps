import { type Activity, ActivityFields, createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { CustomerAccount, CustomerContact, CustomerDocument, CustomerOpportunity, CustomerLead } from './'

export interface CustomerActivity extends Activity {
  account?: CustomerAccount
  contact?: CustomerContact
  documents?: CustomerDocument[]
  opportunity?: CustomerOpportunity
  lead?: CustomerLead
}

/**
 * Customer Activity Query Field Mapping
 * CRM uses same field names as Common, so no overrides needed
 */
export const CustomerActivityFields = {
  ...ActivityFields
} as const

export type CustomerActivityFieldName = (typeof CustomerActivityFields)[keyof typeof CustomerActivityFields]

/**
 * Customer Activity Descriptors
 * Uses createActivityDescriptors with CustomerActivityFields mapping
 * CRM uses correct field names, so we use Common descriptors directly
 */
export const CUSTOMER_ACTIVITY_DESCRIPTORS: Descriptor[] = [
  ...createActivityDescriptors(CustomerActivityFields as Record<keyof typeof ActivityFields, string>)
]
