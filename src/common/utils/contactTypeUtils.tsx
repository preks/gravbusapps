import { HandshakeIcon, BriefcaseIcon, UsersIcon, UserCircleIcon } from '@phosphor-icons/react'

/**
 * Get appropriate icon for contact type
 */
export const getContactTypeIcon = (contactType: string | undefined) => {
  if (!contactType) return null

  const typeUpper = contactType.toUpperCase()

  if (typeUpper.includes('FOUNDER')) return HandshakeIcon
  if (typeUpper.includes('PRIMARY')) return BriefcaseIcon
  if (typeUpper.includes('SECONDARY')) return UsersIcon
  return UserCircleIcon
}

/**
 * Get background color class for contact type
 */
export const getContactTypeColor = (contactType: string | undefined) => {
  if (!contactType) return 'gba:bg-muted'

  const typeUpper = contactType.toUpperCase()

  if (typeUpper.includes('FOUNDER')) return 'gba:bg-amber-100' // Gold for founders
  if (typeUpper.includes('PRIMARY')) return 'gba:bg-blue-100' // Blue for primary
  if (typeUpper.includes('SECONDARY')) return 'gba:bg-cyan-100' // Cyan for secondary
  return 'gba:bg-slate-100' // Slate for unknown
}

/**
 * Get icon color class for contact type
 */
export const getContactTypeIconColor = (contactType: string | undefined) => {
  if (!contactType) return 'gba:text-muted-foreground'

  const typeUpper = contactType.toUpperCase()

  if (typeUpper.includes('FOUNDER')) return 'gba:text-amber-600' // Gold for founders
  if (typeUpper.includes('PRIMARY')) return 'gba:text-blue-600' // Blue for primary
  if (typeUpper.includes('SECONDARY')) return 'gba:text-cyan-600' // Cyan for secondary
  return 'gba:text-slate-600' // Slate for unknown
}
