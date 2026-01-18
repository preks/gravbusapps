import React from 'react'

/**
 * Icon configuration for different entity types
 */
export interface EntityIconConfig {
  icon: React.ReactNode
  bgColor: string
  iconColor: string
}

/**
 * Standard icon component factory
 */
const createIcon = (svgPath: string, bgColor: string, iconColor: string): React.ReactNode => (
  <div className={`gba:h-12 gba:w-12 gba:rounded-full ${bgColor} gba:flex gba:items-center gba:justify-center`}>
    <svg className={`gba:h-6 gba:w-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={svgPath} />
    </svg>
  </div>
)

/**
 * Icon configurations for entity types
 */
export const ENTITY_ICONS: Record<string, EntityIconConfig> = {
  lead: {
    icon: createIcon('M13 10V3L4 14h7v7l9-11h-7z', 'gba:bg-info-secondary', 'gba:text-info'),
    bgColor: 'gba:bg-info-secondary',
    iconColor: 'gba:text-info'
  },
  contact: {
    icon: createIcon(
      'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      'gba:bg-success-secondary',
      'gba:text-success'
    ),
    bgColor: 'gba:bg-success-secondary',
    iconColor: 'gba:text-success'
  },
  opportunity: {
    icon: createIcon(
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'gba:bg-ai-secondary',
      'gba:text-ai'
    ),
    bgColor: 'gba:bg-ai-secondary',
    iconColor: 'gba:text-ai'
  },
  account: {
    icon: createIcon(
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'gba:bg-primary-secondary',
      'gba:text-primary'
    ),
    bgColor: 'gba:bg-primary-secondary',
    iconColor: 'gba:text-primary'
  },
  company: {
    icon: createIcon(
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'gba:bg-primary-secondary',
      'gba:text-primary'
    ),
    bgColor: 'gba:bg-primary-secondary',
    iconColor: 'gba:text-primary'
  }
}

/**
 * Get icon configuration for an entity type
 */
export function getEntityIcon(entityType: string): EntityIconConfig | undefined {
  return ENTITY_ICONS[entityType]
}

/**
 * Get default icon (used as fallback)
 */
export function getDefaultIcon(): React.ReactNode {
  return (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-muted/40 gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  )
}
