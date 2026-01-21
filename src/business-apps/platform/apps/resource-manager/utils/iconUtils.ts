import * as PhosphorIcons from '@phosphor-icons/react'

/**
 * Icon format in DB:
 * - New format: "phosphor_<IconName>" (e.g., "phosphor_Users", "phosphor_AppWindow")
 * - Legacy format: "pi_<IconName>" (e.g., "pi_PiUsers", "pi_PiAppWindow")
 */

export const DEFAULT_ICON_NAME = 'AppWindow'
export const EMPTY_ICON_VALUE = '' // Represents "no icon assigned"

/**
 * Check if icon value is empty/unassigned
 */
export const isIconEmpty = (iconValue: string | undefined | null): boolean => {
  return !iconValue || iconValue.trim() === ''
}

/**
 * Parse icon string from DB and return the Phosphor icon name
 * Supports both new (phosphor_) and legacy (pi_) formats
 * Returns DEFAULT_ICON_NAME for empty values (visual placeholder only)
 */
export const parseIconName = (iconValue: string | undefined | null): string => {
  if (isIconEmpty(iconValue)) {
    return DEFAULT_ICON_NAME // Visual placeholder only
  }

  // New format: phosphor_<IconName>
  if (iconValue.startsWith('phosphor_')) {
    return iconValue.replace('phosphor_', '')
  }

  // Legacy format: pi_<IconName>
  if (iconValue.startsWith('pi_')) {
    const legacyName = iconValue.replace('pi_', '')
    // Remove "Pi" prefix if present (e.g., "PiUsers" -> "Users")
    return legacyName.startsWith('Pi') ? legacyName.substring(2) : legacyName
  }

  // No prefix, assume it's a direct icon name
  return iconValue
}

/**
 * Format icon name for saving to DB
 * Always saves in new format: "phosphor_<IconName>"
 * Returns empty string if iconName is empty (preserve unassigned state)
 */
export const formatIconForDB = (iconName: string): string => {
  if (!iconName || iconName.trim() === '') {
    return EMPTY_ICON_VALUE // Keep it empty, don't assign default
  }

  // Already in phosphor_ format
  if (iconName.startsWith('phosphor_')) {
    return iconName
  }

  // Already in pi_ format, convert to phosphor_
  if (iconName.startsWith('pi_')) {
    const parsedName = parseIconName(iconName)
    return `phosphor_${parsedName}`
  }

  // Plain icon name, add phosphor_ prefix
  return `phosphor_${iconName}`
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
    return PhosphorIcons.AppWindow
  }

  return IconComponent
}

/**
 * Get display title for icon showing DB format
 * Used for hover tooltips
 */
export const getIconDBTitle = (iconValue: string | undefined | null): string => {
  if (isIconEmpty(iconValue)) {
    return 'No icon assigned (placeholder)'
  }

  // If already in phosphor_ or pi_ format, show as is
  if (iconValue.startsWith('phosphor_') || iconValue.startsWith('pi_')) {
    return `DB: ${iconValue}`
  }

  // If plain name, show what it will be saved as
  return `DB: phosphor_${iconValue}`
}
