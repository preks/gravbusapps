// TypeScript interfaces for Product Management Overview

export interface Product {
  id: string
  name: string
  productNumber: string
  description?: string
  price: number
  priceBase?: number
  currentCost?: number
  currentCostBase?: number
  supplierName?: string
  currency?: string
  productTypeCode?: string
  productStructure?: string
  isKit?: boolean
  isStockItem?: boolean
  stateCode?: string
  statusCode?: string
  quantityOnHand?: number
  validFromDate?: string
  validToDate?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
}

export interface ProductKPIData {
  totalProducts: {
    value: number
    trend: number
    period: string
  }
  activeProducts: {
    value: number
    trend: number
    period: string
  }
  productCategories: {
    value: number
    trend: number
    period: string
  }
  averagePrice: {
    value: number
    trend: number
    period: string
    currency: string
  }
}

export interface ProductFilters {
  search?: string
  productType?: string
  stateCode?: string
  isKit?: boolean
  isStockItem?: boolean
  priceRange?: [number, number]
}

export interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

export interface ProductResponse {
  products: Product[]
  pagination: PaginationParams
  kpiData: ProductKPIData
}

export interface ProductCategory {
  id: string
  name: string
  productCount: number
}

// Product status types
export type ProductStatus = 'Active' | 'Inactive' | 'Draft' | 'Discontinued'

// Product type codes
export const PRODUCT_TYPE_CODES = ['Service', 'Goods', 'License', 'Subscription', 'Bundle', 'Kit'] as const

export type ProductTypeCode = (typeof PRODUCT_TYPE_CODES)[number]

// Product structure types
export const PRODUCT_STRUCTURES = ['Standalone', 'Bundle', 'Kit', 'Component'] as const

export type ProductStructure = (typeof PRODUCT_STRUCTURES)[number]
