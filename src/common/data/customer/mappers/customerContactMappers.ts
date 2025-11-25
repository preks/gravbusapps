// Customer Contact Mapper - Transform base type to enhanced type with field mappings

import { CustomerContact } from '../types'
import type { CustomerAccountContact } from '../types/customerRelationTypes'
import { toCustomerAccount } from './customerAccountMappers'

/**
 * Transform CustomerContact (GraphQL response) to CustomerContact (enhanced with field mappings)
 *
 * Handles CRM-specific field name mappings:
 * - jobTitle → jobPosition
 * - contactType → type
 * - pictureUrl → picture
 * - pictureThumbnailUrl → pictureThumbnail
 * - accountId/account → accountContacts array (CRM uses deprecated accountId instead of accountContacts)
 */
export function toCustomerContact(base: CustomerContact): CustomerContact {
  // Map CRM field names to Contact standard (IRM naming)
  const jobPosition = base.jobTitle
  const type = base.contactType
  const picture = base.pictureUrl
  const pictureThumbnail = base.pictureThumbnailUrl

  // Use accountContacts from GraphQL if available, otherwise fallback to deprecated accountId/account
  const accountContacts: CustomerAccountContact[] | undefined = base.accountContacts
    ? base.accountContacts.map(ac => ({
        ...ac,
        account: ac.account ? toCustomerAccount(ac.account) : ac.account
      }))
    : undefined

  return {
    ...base,
    // Map CRM fields to Contact standard
    jobPosition,
    type,
    picture,
    pictureThumbnail,
    accountContacts
  } as CustomerContact
}
