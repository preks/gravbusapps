import React from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { InfoIcon } from '@phosphor-icons/react'

// Type for icon components
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

/**
 * Get Phosphor icon component by name
 * Supports various naming formats and case variations
 *
 * @param iconName - Name of the icon (e.g., "Article", "ArticleIcon", "Envelope", "Phone")
 * @returns React component for the icon, or fallback Info icon if not found
 */
export const getPhosphorIcon = (iconName: string): IconComponent => {
  if (!iconName) {
    return InfoIcon
  }

  // Try exact match first
  if ((PhosphorIcons as any)[iconName]) {
    return (PhosphorIcons as any)[iconName]
  }

  // Try without "Icon" suffix
  const nameWithoutIcon = iconName.replace(/Icon$/, '')
  if ((PhosphorIcons as any)[nameWithoutIcon]) {
    return (PhosphorIcons as any)[nameWithoutIcon]
  }

  // Try case-insensitive match
  const lowerName = iconName.toLowerCase()
  const foundKey = Object.keys(PhosphorIcons).find(key => key.toLowerCase() === lowerName && /^[A-Z]/.test(key))

  if (foundKey) {
    return (PhosphorIcons as any)[foundKey]
  }

  // Log warning for missing icons in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `Phosphor icon not found: ${iconName}. Available icons include:`,
      Object.keys(PhosphorIcons)
        .filter(key => /^[A-Z]/.test(key) && key !== 'IconContext' && key !== 'SSR')
        .slice(0, 10)
    )
  }

  // Fallback to Info icon
  return InfoIcon
}
