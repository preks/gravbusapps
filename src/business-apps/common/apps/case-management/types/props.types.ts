/**
 * Component Props Type Definitions
 */

import { BusinessAppContextProps } from '@/business-apps/types'
import { CaseColumnConfig, StatusOption } from './case.types'

export interface CaseManagementProps extends BusinessAppContextProps {
  // Configuration props
  appName: string // Display name (e.g., "HR Cases", "Service Cases")
  appDescription?: string // Description text
  appTag: string // Tag filter (e.g., "AppCatalog:1:HR")

  // Feature flags
  allowCreate?: boolean // Enable case creation (default: true)
  allowEdit?: boolean // Enable case editing (default: true)
  allowDelete?: boolean // Enable case deletion (default: false)
  showAnalytics?: boolean // Show dashboard analytics (default: true)

  // Customization
  defaultView?: 'dashboard' | 'list' // Default view (default: 'dashboard')
  columns?: CaseColumnConfig[] // Custom column configuration
  statusOptions?: StatusOption[] // Custom status definitions

  // Entity linking
  enableEntityLinking?: boolean // Enable linking to users/org units (default: true)
  entityTypes?: ('user' | 'employee' | 'organizationalUnit')[]
}
