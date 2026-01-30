import * as PhosphorIcons from '@phosphor-icons/react'

/**
 * Icon format in DB:
 * - Current: "<IconName>Icon" (e.g. "ArticleIcon", "UsersIcon") – value from IconSelect as-is
 * - Legacy (display only): "pi_Pi<Name>" (e.g. "pi_PiUsers") → shown as "<Name>Icon"
 */

export const DEFAULT_ICON_NAME = 'AppWindowIcon'
export const EMPTY_ICON_VALUE = '' // Represents "no icon assigned"

/**
 * Check if icon value is empty/unassigned
 */
export const isIconEmpty = (iconValue: string | undefined | null): boolean => {
  return !iconValue || iconValue.trim() === ''
}

/**
 * Parse icon string from DB to Phosphor icon name (for display/lookup).
 * - Empty → DEFAULT_ICON_NAME (placeholder)
 * - Legacy pi_Pi<Name> → <Name>Icon (display only)
 * - Stored value is <IconName>Icon, return as-is
 */
export const parseIconName = (iconValue: string | undefined | null): string => {
  if (isIconEmpty(iconValue)) {
    return DEFAULT_ICON_NAME
  }

  // Legacy: pi_Pi<Name> → <Name>Icon (e.g. pi_PiUsers → UsersIcon)
  if (iconValue.startsWith('pi_')) {
    const afterPrefix = iconValue.replace('pi_', '')
    const baseName = afterPrefix.startsWith('Pi') ? afterPrefix.substring(2) : afterPrefix
    return baseName.endsWith('Icon') ? baseName : `${baseName}Icon`
  }

  // Stored format: <IconName>Icon or legacy phosphor_<Name> (normalize to XxxIcon if needed)
  if (iconValue.startsWith('phosphor_')) {
    const name = iconValue.replace('phosphor_', '')
    return name.endsWith('Icon') ? name : `${name}Icon`
  }

  return iconValue.endsWith('Icon') ? iconValue : `${iconValue}Icon`
}

/**
 * Format icon name for saving to DB.
 * Saves value from IconSelect as-is (always <IconName>Icon). No prefix.
 */
export const formatIconForDB = (iconName: string): string => {
  if (!iconName || iconName.trim() === '') {
    return EMPTY_ICON_VALUE
  }
  return iconName.trim()
}

/**
 * Get the Phosphor Icon component from icon name
 * Returns undefined if icon not found
 */
export const getPhosphorIcon = (iconName: string): React.ComponentType<any> | undefined => {
  return (PhosphorIcons as any)[iconName]
}

/**
 * Get the Phosphor Icon component from DB value
 * Falls back to AppWindow if icon not found
 */
export const getIconFromDBValue = (iconValue: string | undefined | null): React.ComponentType<any> => {
  const iconName = parseIconName(iconValue)
  const IconComponent = getPhosphorIcon(iconName)

  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in Phosphor Icons, using ${DEFAULT_ICON_NAME} fallback`)
    return PhosphorIcons.AppWindowIcon
  }

  return IconComponent
}

/**
 * Get display title for icon showing DB format (hover tooltips)
 */
export const getIconDBTitle = (iconValue: string | undefined | null): string => {
  if (isIconEmpty(iconValue)) {
    return 'No icon assigned (placeholder)'
  }
  return `DB: ${iconValue}`
}
