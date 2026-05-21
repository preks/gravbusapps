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

/** Shorter labels for compact row selects (dropdown items keep full ContactTypeLabels). */
export const ContactTypeCompactLabels: Record<ContactType, string> = {
  [ContactType.UNKNOWN_CONTACT]: 'Unknown',
  [ContactType.FOUNDER_CONTACT]: 'Founder',
  [ContactType.PRIMARY_CONTACT]: 'Primary',
  [ContactType.SECONDARY_CONTACT]: 'Secondary'
}

export type ContactTypeLabelOptions = {
  compact?: boolean
}

/**
 * Get label for a ContactType enum value
 * @param contactType - ContactType enum value or string
 * @returns Human-readable label or empty string if not found
 */
export const getContactTypeLabel = (
  contactType: ContactType | string | null | undefined,
  options?: ContactTypeLabelOptions
): string => {
  if (!contactType) {
    return ''
  }

  const labels = options?.compact ? ContactTypeCompactLabels : ContactTypeLabels
  const typeKey = contactType
  return labels[typeKey as ContactType] || ''
}
