import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EntityCardConfig {
  title: string
  description: string
  icon: React.ComponentType<any>
  iconSize?: 'sm' | 'md' | 'lg'
  entries: Array<{
    label: string
    entityType: string
  }>
}

export interface DataImportConfig {
  // Header configuration
  headerLabel: string
  headerDescription: string
  searchPlaceholder: string
  backUrl: string
  prefixDataTestId: string

  // Entity cards for selector view
  entityCards: EntityCardConfig[]

  // Map of entity type to import view component
  entityViews: Record<string, React.ComponentType<BusinessAppContextProps & { onBack?: () => void }>>

  // Valid entity types (for URL validation)
  validEntityTypes: Set<string>
}
