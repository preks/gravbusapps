import { HandshakeIcon, BriefcaseIcon, UsersIcon, UserCircleIcon } from '@phosphor-icons/react'
import { ContactType } from '@/common/data/relations/constants/contactConstants'

/**
 * Get appropriate icon for contact type
 */
export const getContactTypeIcon = (contactType: string | undefined) => {
  if (!contactType) return null

  switch (contactType) {
    case ContactType.FOUNDER_CONTACT:
      return HandshakeIcon
    case ContactType.PRIMARY_CONTACT:
      return BriefcaseIcon
    case ContactType.SECONDARY_CONTACT:
      return UsersIcon
    case ContactType.UNKNOWN_CONTACT:
    default:
      return UserCircleIcon
  }
}

/**
 * Get background color class for contact type
 */
export const getContactTypeColor = (contactType: string | undefined) => {
  if (!contactType) return 'gba:bg-muted'

  switch (contactType) {
    case ContactType.FOUNDER_CONTACT:
      return 'gba:bg-amber-100' // Gold for founders
    case ContactType.PRIMARY_CONTACT:
      return 'gba:bg-blue-100' // Blue for primary
    case ContactType.SECONDARY_CONTACT:
      return 'gba:bg-cyan-100' // Cyan for secondary
    case ContactType.UNKNOWN_CONTACT:
    default:
      return 'gba:bg-slate-100' // Slate for unknown
  }
}

/**
 * Get icon color class for contact type
 */
export const getContactTypeIconColor = (contactType: string | undefined) => {
  if (!contactType) return 'gba:text-muted-foreground'

  switch (contactType) {
    case ContactType.FOUNDER_CONTACT:
      return 'gba:text-amber-600' // Gold for founders
    case ContactType.PRIMARY_CONTACT:
      return 'gba:text-blue-600' // Blue for primary
    case ContactType.SECONDARY_CONTACT:
      return 'gba:text-cyan-600' // Cyan for secondary
    case ContactType.UNKNOWN_CONTACT:
    default:
      return 'gba:text-slate-600' // Slate for unknown
  }
}
