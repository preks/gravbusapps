// Re-export all types from the shared types module
export * from '../../../types/index'

// Dashboard-specific types can be added here if needed
export interface DashboardViewMode {
  mode: 'overview' | 'list' | 'grid'
}

export interface DashboardState {
  viewMode: DashboardViewMode['mode']
  selectedInvestmentId?: string
  isFilterPanelOpen: boolean
  isMetricsPanelExpanded: boolean
}
