// TypeScript interfaces for Product Detail View

export interface DetailedProduct {
  id: string
  name: string
  productNumber: string
  description?: string
  productUrl?: string

  // Product Type and Structure
  productTypeCode?: string
  productStructure?: string
  isKit?: boolean
  isStockItem?: boolean

  // Product Hierarchy
  parentProductId?: string
  hierarchyPath?: string

  // Vendor Information
  vendorId?: string
  vendorName?: string
  vendorPartNumber?: string
  supplierName?: string

  // Pricing and Costing
  price: number
  priceBase?: number
  standardCost?: number
  standardCostBase?: number
  currentCost?: number
  currentCostBase?: number
  exchangeRate?: number
  currencyId?: string
  currency?: string

  // Units of Measure
  defaultUomId?: string
  defaultUomScheduleId?: string

  // Inventory Attributes
  quantityOnHand?: number
  quantityDecimal?: number
  stockVolume?: number
  stockWeight?: number
  size?: string

  // Validity Dates
  validFromDate?: string
  validToDate?: string

  // Classification and Categorization
  subjectId?: string
  priceLevelId?: string
  stateCode?: string
  statusCode?: string

  // Audit fields
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  version?: number
  isDeleted?: boolean
  recordState?: string
  processInstanceId?: string
  additionalProperties?: any
}

export interface ProductInventoryLocation {
  id: string
  locationName: string
  warehouseCode: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  reorderPoint: number
  maxStockLevel: number
  lastStockMovement?: string
  locationStatus: 'Active' | 'Inactive' | 'Maintenance'
}

export interface ProductPriceHistory {
  id: string
  effectiveDate: string
  price: number
  priceType: 'List' | 'Cost' | 'Discount' | 'Promotional'
  currency: string
  reason?: string
  changedBy?: string
}

export interface ProductSalesMetrics {
  totalRevenue: number
  totalQuantitySold: number
  averageOrderValue: number
  topCustomers: Array<{
    customerId: string
    customerName: string
    totalPurchases: number
    lastPurchaseDate: string
  }>
  salesTrend: Array<{
    period: string
    revenue: number
    quantity: number
  }>
}

export interface ProductSupplierInfo {
  id: string
  supplierName: string
  supplierCode: string
  contactPerson?: string
  email?: string
  phone?: string
  leadTime: number
  minimumOrderQuantity: number
  lastPurchaseDate?: string
  totalPurchaseValue: number
  performanceRating: number
  status: 'Active' | 'Inactive' | 'Preferred'
}

export interface ProductDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  documentType: 'Image' | 'Specification' | 'Manual' | 'Certificate' | 'Other'
  uploadDate: string
  uploadedBy?: string
  url?: string
  description?: string
}

export interface ProductKPIData {
  currentStock: {
    value: number
    trend: number
    status: 'Low' | 'Normal' | 'High'
  }
  monthlyRevenue: {
    value: number
    trend: number
    currency: string
  }
  averageMargin: {
    value: number
    trend: number
  }
  salesVelocity: {
    value: number
    trend: number
    unit: string
  }
}

export interface ProductStockMovement {
  id: string
  movementDate: string
  movementType: 'In' | 'Out' | 'Transfer' | 'Adjustment'
  quantity: number
  reason: string
  reference?: string
  location?: string
  performedBy?: string
}

export interface ProductCrossReference {
  id: string
  relatedProductId: string
  relatedProductName: string
  relatedProductNumber: string
  relationshipType: 'Cross-sell' | 'Up-sell' | 'Substitute' | 'Accessory' | 'Bundle'
  strength: number // 1-10 scale
}

export interface ProductLifecycleInfo {
  stage: 'Introduction' | 'Growth' | 'Maturity' | 'Decline' | 'Discontinued'
  launchDate?: string
  discontinuationDate?: string
  replacementProductId?: string
  lifecycleNotes?: string
}

export interface ProductQualityInfo {
  lastInspectionDate?: string
  qualityRating: number
  defectRate: number
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'Under Review'
  certifications: Array<{
    name: string
    issuedBy: string
    validUntil?: string
    status: 'Valid' | 'Expired' | 'Pending'
  }>
}

// Tab types for the detail view
export type ProductDetailTab =
  | 'overview'
  | 'product-info'
  | 'inventory-stock'
  | 'pricing-costs'
  | 'supplier-vendor'
  | 'sales-performance'
  | 'documents-media'

export interface ProductDetailViewProps {
  productId: string
  onBack?: () => void
}
