import React from 'react'
import { getIconFromDBValue, getIconDBTitle, isIconEmpty } from '../utils/iconUtils'

interface MenuItemIconProps {
  iconValue: string | undefined | null
  size?: number
  className?: string
}

/**
 * Displays a menu item icon with proper fallback
 * Supports <Name>Icon (stored) and legacy pi_Pi<Name> (display only)
 * Shows DB format on hover
 * Displays placeholder icons in lighter gray
 */
export const MenuItemIcon: React.FC<MenuItemIconProps> = ({ iconValue, size = 20, className = '' }) => {
  const IconComponent = getIconFromDBValue(iconValue)
  const title = getIconDBTitle(iconValue)
  const isEmpty = isIconEmpty(iconValue)

  // Add lighter opacity for placeholder icons
  const iconClassName = isEmpty ? `${className} gba:opacity-40`.trim() : className

  return <IconComponent size={size} className={iconClassName} title={title} />
}
