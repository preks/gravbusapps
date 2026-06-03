import React from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { InfoIcon, LinkIcon } from '@phosphor-icons/react'

// Type for icon components
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

const NON_COMPONENT_ICON_KEYS = new Set(['SSR', 'IconContext'])

const phosphorIconKeySet: Set<string> = new Set(Object.keys(PhosphorIcons))
const phosphorIconKeySetLower: Map<string, string> = new Map(
  Object.keys(PhosphorIcons)
    .filter(key => /^[A-Z]/.test(key) && !NON_COMPONENT_ICON_KEYS.has(key))
    .map(key => [key.toLowerCase(), key])
)

const resolvePhosphorIconKey = (iconName: string): string | undefined => {
  if (!iconName?.trim() || NON_COMPONENT_ICON_KEYS.has(iconName)) {
    return undefined
  }

  if (phosphorIconKeySet.has(iconName) && !NON_COMPONENT_ICON_KEYS.has(iconName)) {
    return iconName
  }

  const nameWithoutIcon = iconName.replace(/Icon$/, '')
  if (phosphorIconKeySet.has(nameWithoutIcon) && !NON_COMPONENT_ICON_KEYS.has(nameWithoutIcon)) {
    return nameWithoutIcon
  }

  return phosphorIconKeySetLower.get(iconName.toLowerCase())
}

const isRenderablePhosphorExport = (exportValue: unknown): exportValue is IconComponent => {
  if (!exportValue) return false
  if (typeof exportValue === 'function') return true
  if (typeof exportValue === 'object' && '$$typeof' in exportValue) {
    return String((exportValue as { $$typeof?: symbol }).$$typeof).includes('forward_ref')
  }
  return false
}

/**
 * Returns true when iconName maps to a renderable Phosphor icon component.
 */
export const isValidPhosphorIconName = (iconName: string): boolean => {
  const resolvedKey = resolvePhosphorIconKey(iconName)
  if (!resolvedKey) return false
  return isRenderablePhosphorExport((PhosphorIcons as Record<string, unknown>)[resolvedKey])
}

/**
 * Resolves a catalog additionalValue3 icon name to a Phosphor component.
 */
export const resolvePhosphorIconComponent = (
  iconName: string | undefined,
  fallback: IconComponent = LinkIcon
): IconComponent => {
  const resolvedKey = iconName ? resolvePhosphorIconKey(iconName) : undefined
  if (!resolvedKey) {
    return fallback
  }

  const iconComponent = (PhosphorIcons as Record<string, unknown>)[resolvedKey]
  if (isRenderablePhosphorExport(iconComponent)) {
    return iconComponent
  }

  return fallback
}

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

  if (isValidPhosphorIconName(iconName)) {
    return resolvePhosphorIconComponent(iconName, InfoIcon)
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(`Phosphor icon not found: ${iconName}`)
  }

  return InfoIcon
}
