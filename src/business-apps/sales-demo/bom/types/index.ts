// Shared TypeScript interfaces for BOM Management

export interface BillOfMaterials {
  id: string
  businessKey: string
  name: string
  description?: string

  // Parent Product Information
  parentProductId: string
  parentProduct?: {
    id: string
    name: string
    productNumber: string
    description?: string
  }

  // BOM Structure
  bomType: 'PRODUCTION' | 'ENGINEERING' | 'SALES' | 'COSTING'
  bomLevel: number
  bomStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'OBSOLETE'

  // Validity and Lifecycle
  activeFrom?: string
  activeTo?: string
  validFrom?: string
  validTo?: string

  // Quantities and Measurements
  baseQuantity: number
  baseUom?: string
  scrapFactor?: number

  // Component Count (calculated)
  componentCount: number
  totalComponents?: number // Including sub-components

  // System Information
  version: number
  recordState?: string
  processInstanceId?: string

  // Standard fields
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  additionalProperties?: any
}

export interface BomComponent {
  id: string
  bomId: string

  // Component Product Information
  componentProductId: string
  componentProduct?: {
    id: string
    name: string
    productNumber: string
    description?: string
    price?: number
    currentCost?: number
    isStockItem?: boolean
  }

  // Position and Hierarchy
  positionNumber: number
  level: number
  parentComponentId?: string

  // Quantities and Measurements
  quantity: number
  quantityPer: number
  uom?: string
  scrapFactor?: number

  // Component Type and Properties
  componentType: 'MATERIAL' | 'PHANTOM' | 'REFERENCE' | 'TOOL' | 'RESOURCE'
  isOptional: boolean
  isCritical: boolean

  // Validity
  effectiveFrom?: string
  effectiveTo?: string

  // Costing Information
  unitCost?: number
  totalCost?: number
  costingMethod?: 'STANDARD' | 'AVERAGE' | 'FIFO' | 'LIFO'

  // Supply Information
  leadTime?: number
  supplierName?: string
  supplierPartNumber?: string

  // Standard fields
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
}

export interface BomKPIData {
  totalBoms: {
    value: number
    trend: number
  }
  activeBoms: {
    value: number
    trend: number
  }
  totalComponents: {
    value: number
    trend: number
  }
  averageComplexity: {
    value: number
    trend: number
  }
}

export interface BomFilters {
  search: string
  bomType?: 'PRODUCTION' | 'ENGINEERING' | 'SALES' | 'COSTING'
  bomStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'OBSOLETE'
  parentProductId?: string
  activeOnly?: boolean
  complexityRange?: [number, number]
}

export interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

// Tree structure for BOM visualization
export interface BomTreeNode {
  key: string
  title: string
  productNumber: string
  quantity: number
  uom?: string
  level: number
  componentType: string
  isOptional: boolean
  isCritical: boolean
  unitCost?: number
  totalCost?: number
  children?: BomTreeNode[]

  // Additional display properties
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
}

// Detail view specific types
export type BomDetailTab = 'overview' | 'structure' | 'components' | 'validity' | 'system'

export interface BomDetailKPIData {
  totalComponents: {
    value: number
    trend: number
  }
  totalCost: {
    value: number
    trend: number
  }
  complexity: {
    value: number
    trend: number
  }
  criticalComponents: {
    value: number
    trend: number
  }
}

export interface BomValidityInfo {
  activeFrom?: string
  activeTo?: string
  validFrom?: string
  validTo?: string
  isCurrentlyActive: boolean
  isCurrentlyValid: boolean
  daysUntilExpiry?: number
  lifecycleStage: 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'OBSOLETE'
}

export interface BomSystemInfo {
  version: number
  recordState?: string
  processInstanceId?: string
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  lastModifiedBy?: string
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: string
}
