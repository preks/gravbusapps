import {
  type Activity,
  ActivityFields,
  ActivityFormFields,
  createActivityDescriptors
} from '@/common/data/relations/types/activityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

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
  ...ActivityFields,
  investment: 'investment',
  investmentId: 'investmentId'
} as const

export const CustomerActivityFormFields = {
  ...ActivityFormFields,
  investmentId: 'investment'
}

/**
 * Customer Activity Descriptors
 * Uses createActivityDescriptors with CustomerActivityFields mapping
 * Note: SalesOpportunity doesn't have a 'description' field, so we override the opportunity descriptor
 */
export const CUSTOMER_ACTIVITY_DESCRIPTORS: Descriptor[] = [
  ...createActivityDescriptors(CustomerActivityFields as Record<keyof typeof ActivityFields, string>).map(
    descriptor => {
      // Override opportunity descriptor to remove description field (CRM doesn't have it either)
      if (descriptor.key === 'opportunity') {
        return {
          ...descriptor,
          searchPaths: [`${CustomerActivityFields.opportunity}.name`] // Only name, no description
        }
      }
      return descriptor
    }
  )
]

/**
 * Build Customer Activity Payload
 * Uses buildPayload utility with CustomerActivityFormFields mapping
 */
export const buildCustomerActivityPayload = (activity: Partial<CustomerActivity> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(activity, CustomerActivityFormFields)

  return {
    salesActivity: payload
  }
}
