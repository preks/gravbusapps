/**
 * Common Contact Constants
 *
 * Shared constants and enums for contacts across Customer and Investment relations
 */

/**
 * Contact Type
 * Indicates the type/role of the contact
 */
export enum ContactType {
  UNKNOWN_CONTACT = 'UNKNOWN_CONTACT',
  FOUNDER_CONTACT = 'FOUNDER_CONTACT',
  PRIMARY_CONTACT = 'PRIMARY_CONTACT',
  SECONDARY_CONTACT = 'SECONDARY_CONTACT'
}

/**
 * Contact Type Labels
 * Human-readable labels for each ContactType enum value
 */
export const ContactTypeLabels: Record<ContactType, string> = {
  [ContactType.UNKNOWN_CONTACT]: 'Unknown Contact',
  [ContactType.FOUNDER_CONTACT]: 'Founder Contact',
  [ContactType.PRIMARY_CONTACT]: 'Primary Contact',
  [ContactType.SECONDARY_CONTACT]: 'Secondary Contact'
}

/**
 * Get label for a ContactType enum value
 * @param contactType - ContactType enum value or string
 * @returns Human-readable label or empty string if not found
 */
export const getContactTypeLabel = (contactType: ContactType | string | null | undefined): string => {
  if (!contactType) {
    return ''
  }

  // Handle string values that match enum keys
  const typeKey = contactType
  return ContactTypeLabels[typeKey as ContactType] || ''
}
