// TypeScript interfaces for BOM Detail View

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import {
  BillOfMaterials,
  BomComponent,
  BomDetailKPIData,
  BomTreeNode,
  BomDetailTab,
  BomValidityInfo,
  BomSystemInfo
} from '../../../types'

export interface BomDetailViewProps extends BusinessAppContextProps {
  bomId: string
  onBack?: () => void
}

// Re-export shared types for convenience
export type {
  BillOfMaterials,
  BomComponent,
  BomDetailKPIData,
  BomTreeNode,
  BomDetailTab,
  BomValidityInfo,
  BomSystemInfo
} from '../../../types'

// Component-specific interfaces
export interface BomDetailHeaderProps {
  bom: BillOfMaterials
  onBack?: () => void
  loading?: boolean
}

export interface BomDetailKPICardsProps {
  kpiData: BomDetailKPIData
  loading?: boolean
}

export interface BomComponentTableProps {
  components: BomComponent[]
  loading?: boolean
  onComponentSelect?: (component: BomComponent) => void
  selectedComponentIds?: string[]
}

export interface BomValidityCardProps {
  bom: BillOfMaterials
  validityInfo?: BomValidityInfo
  loading?: boolean
}

export interface BomSystemInfoCardProps {
  bom: BillOfMaterials
  systemInfo?: BomSystemInfo
  loading?: boolean
}

// Tree view specific interfaces
export interface BomTreeViewProps {
  treeData: BomTreeNode[]
  loading?: boolean
  onNodeSelect?: (selectedKeys: React.Key[], info: any) => void
  expandedKeys?: React.Key[]
  onExpand?: (expandedKeys: React.Key[]) => void
  searchValue?: string
  onSearch?: (value: string) => void
  className?: string
  'data-testid'?: string
}

export interface BomTreeNodeProps {
  node: BomTreeNode
  level: number
  isSelected?: boolean
  isExpanded?: boolean
  onSelect?: (node: BomTreeNode) => void
  onExpand?: (node: BomTreeNode) => void
}

// Cost analysis interfaces
export interface BomCostBreakdown {
  materialCosts: number
  phantomCosts: number
  referenceCosts: number
  toolCosts: number
  resourceCosts: number
  totalCost: number
}

export interface BomCostAnalysisProps {
  costBreakdown: BomCostBreakdown
  components: BomComponent[]
  loading?: boolean
}

// Component detail interfaces
export interface ComponentDetailModalProps {
  component: BomComponent | null
  visible: boolean
  onClose: () => void
  onEdit?: (component: BomComponent) => void
  onDelete?: (component: BomComponent) => void
}

export interface ComponentFormProps {
  component?: BomComponent
  bomId: string
  onSave: (component: BomComponent) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

// Usage analysis interfaces
export interface BomUsageInfo {
  usedInBoms: Array<{
    bomId: string
    bomName: string
    parentProduct: {
      name: string
      productNumber: string
    }
    quantity: number
    componentType: string
    isOptional: boolean
    isCritical: boolean
  }>
  totalUsages: number
}

export interface BomUsageAnalysisProps {
  usageInfo: BomUsageInfo
  loading?: boolean
}

// Export interfaces
export interface BomExportOptions {
  format: 'excel' | 'csv' | 'pdf'
  includeComponents: boolean
  includeHierarchy: boolean
  includeCosts: boolean
  includeSystemInfo: boolean
}

export interface BomExportModalProps {
  visible: boolean
  onClose: () => void
  onExport: (options: BomExportOptions) => Promise<void>
  loading?: boolean
}

// Action interfaces
export interface BomDetailAction {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  loading?: boolean
}

export interface BomDetailActionsProps {
  bom: BillOfMaterials
  actions: BomDetailAction[]
  loading?: boolean
}

// State management interfaces
export interface BomDetailState {
  activeTab: BomDetailTab
  selectedComponentIds: string[]
  expandedTreeKeys: React.Key[]
  searchValue: string
  showComponentModal: boolean
  showExportModal: boolean
  editingComponent: BomComponent | null
}

export interface BomDetailActions {
  setActiveTab: (tab: BomDetailTab) => void
  setSelectedComponentIds: (ids: string[]) => void
  setExpandedTreeKeys: (keys: React.Key[]) => void
  setSearchValue: (value: string) => void
  toggleComponentModal: () => void
  toggleExportModal: () => void
  setEditingComponent: (component: BomComponent | null) => void
  clearSelection: () => void
}

// Hook return types
export interface UseBomDetailDataReturn {
  bom: BillOfMaterials | null
  components: BomComponent[]
  kpiData: BomDetailKPIData | null
  treeData: BomTreeNode[]
  validityInfo: BomValidityInfo | null
  systemInfo: BomSystemInfo | null
  usageInfo: BomUsageInfo | null
  costBreakdown: BomCostBreakdown | null
  loading: boolean
  error: Error | null
  isUsingDemoData: boolean
  refreshData: () => void
}

export interface UseBomDetailDataProps {
  accessToken: string
  bomId: string
}
