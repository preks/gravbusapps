// Customer Contact Mapper - Transform base type to enhanced type with field mappings

import { CustomerContact } from '../types'

/**
 * Transform CustomerContact (GraphQL response) to CustomerContact (enhanced with field mappings)
 *
 * Handles CRM-specific field name mappings:
 * - jobTitle → jobPosition
 * - contactType → type
 * - pictureUrl → picture
 * - pictureThumbnailUrl → pictureThumbnail
 */
export function toCustomerContact(base: CustomerContact): CustomerContact {
  // Map CRM field names to CommonContact standard (IRM naming)
  const jobPosition = base.jobTitle
  const type = base.contactType
  const picture = base.pictureUrl
  const pictureThumbnail = base.pictureThumbnailUrl

  return {
    ...base,
    // Map CRM fields to CommonContact standard
    jobPosition,
    type,
    picture,
    pictureThumbnail
  } as CustomerContact
}
