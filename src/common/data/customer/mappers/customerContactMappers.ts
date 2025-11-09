// Customer Contact Mapper - Transform base type to enhanced type with field mappings

import { CustomerContact } from '../types'
import type { CustomerAccountContact } from '../types/customerRelationTypes'

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
  let accountContacts: CustomerAccountContact[] | undefined = base.accountContacts
  if (!accountContacts || accountContacts.length === 0) {
    // Fallback: Transform CRM accountId/account to accountContacts array
    // CRM uses deprecated accountId/account instead of accountContacts relation
    if (base.accountId && base.account) {
      accountContacts = [
        {
          id: `${base.id}-${base.accountId}`, // Generate synthetic ID for the relationship
          accountId: base.accountId,
          account: base.account,
          contactType: base.contactType, // Use contact's contactType
          contactId: base.id,
          contact: base as any // Reference to the contact itself
        } as CustomerAccountContact
      ]
    }
  }

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
