// TypeScript interfaces for BOM Management Overview

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { BillOfMaterials, BomFilters } from '../../../types'

export interface BomManagementOverviewProps extends BusinessAppContextProps {}

// Re-export shared types for convenience
export type { BillOfMaterials, BomKPIData, BomFilters, PaginationParams } from '../../../types'

// Component-specific interfaces
export interface BomTableColumn {
  title: string
  dataIndex: string
  key: string
  width?: number
  fixed?: 'left' | 'right'
  sorter?: boolean
  render?: (value: any, record: BillOfMaterials) => React.ReactNode
}

export interface BomStatusTagProps {
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'OBSOLETE'
  activeFrom?: string
  activeTo?: string
}

export interface BomTypeTagProps {
  type: 'PRODUCTION' | 'ENGINEERING' | 'SALES' | 'COSTING'
}

export interface BomComplexityIndicatorProps {
  componentCount: number
  totalComponents?: number
  level?: 'low' | 'medium' | 'high' | 'very-high'
}

// Filter component interfaces
export interface BomFiltersProps {
  filters: BomFilters
  onFiltersChange: (filters: BomFilters) => void
  loading?: boolean
}

export interface BomSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
}

// Action interfaces
export interface BomActionItem {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: (bom: BillOfMaterials) => void
  disabled?: boolean
  danger?: boolean
}

export interface BomActionsProps {
  bom: BillOfMaterials
  actions: BomActionItem[]
}

// KPI Card interfaces
export interface KpiCardProps {
  title: string
  value: number | string
  trend?: number
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  precision?: number
  loading?: boolean
  className?: string
  'data-testid'?: string
}

// Table pagination interfaces
export interface BomTablePaginationProps {
  current: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: (total: number, range: [number, number]) => string
  onChange: (page: number, pageSize: number) => void
}

// Export interfaces
export interface BomExportOptions {
  format: 'excel' | 'csv' | 'pdf'
  includeComponents?: boolean
  includeInactive?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

export interface BomExportProps {
  boms: BillOfMaterials[]
  options: BomExportOptions
  onExport: (options: BomExportOptions) => Promise<void>
}

// Bulk operations interfaces
export interface BomBulkOperation {
  type: 'activate' | 'deactivate' | 'delete' | 'export' | 'duplicate'
  label: string
  icon?: React.ReactNode
  confirmMessage?: string
  dangerAction?: boolean
}

export interface BomBulkActionsProps {
  selectedBoms: BillOfMaterials[]
  operations: BomBulkOperation[]
  onOperation: (operation: BomBulkOperation, boms: BillOfMaterials[]) => Promise<void>
  loading?: boolean
}

// Quick stats interfaces
export interface BomQuickStats {
  totalBoms: number
  activeBoms: number
  inactiveBoms: number
  pendingBoms: number
  obsoleteBoms: number
  averageComplexity: number
  totalComponents: number
  lastUpdated: string
}

export interface BomQuickStatsProps {
  stats: BomQuickStats
  loading?: boolean
  onRefresh?: () => void
}

// Advanced filter interfaces
export interface BomAdvancedFilters extends BomFilters {
  createdDateRange?: [string, string]
  updatedDateRange?: [string, string]
  createdBy?: string
  updatedBy?: string
  version?: number
  bomLevel?: number
}

export interface BomAdvancedFiltersProps {
  filters: BomAdvancedFilters
  onFiltersChange: (filters: BomAdvancedFilters) => void
  onReset: () => void
  visible: boolean
  onClose: () => void
}

// Component state interfaces
export interface BomOverviewState {
  selectedBomIds: string[]
  showAdvancedFilters: boolean
  showExportModal: boolean
  showBulkActions: boolean
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BomOverviewActions {
  setSelectedBomIds: (ids: string[]) => void
  toggleAdvancedFilters: () => void
  toggleExportModal: () => void
  toggleBulkActions: () => void
  setSorting: (field: string, order: 'asc' | 'desc') => void
  clearSelection: () => void
}
