import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// View filter types for Sales Activity 360
export type ActivityViewFilter = 'all' | 'by-employee' | 'by-account' | 'by-lead' | 'by-opportunity' | 'by-contact'

// Tab types
export type ActivityTabType = 'list' | 'calendar'

// View selection state
export interface ViewSelectionState {
  filter: ActivityViewFilter
  entityId?: string
  entityName?: string
}

// Props for the main app - extends BusinessAppContext with app-specific requirements
export type SalesActivity360Props = BusinessAppContextProps

// Props for ViewSelector
export interface ViewSelectorProps {
  onSelect: (filter: ActivityViewFilter) => void
  onEmployeeSelect?: (employeeId: string, employeeName: string) => void
  onEntitySelect?: (filter: ActivityViewFilter, entityId: string, entityName: string) => void
  accessToken: string
}

// Props for ActivityView (after selection)
export interface ActivityViewProps extends BusinessAppContextProps {
  filter: ActivityViewFilter
  entityId?: string
  entityName?: string
  onBack: () => void
}

// Entity selector props (for employee, account, etc.)
export interface EntitySelectorProps {
  accessToken: string
  entityType: ActivityViewFilter
  onSelect: (entityId: string, entityName: string) => void
  onCancel: () => void
}
