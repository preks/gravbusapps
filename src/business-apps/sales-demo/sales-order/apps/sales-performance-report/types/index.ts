// TypeScript interfaces for Sales Performance Report

export interface SalesPerformanceKPI {
  totalSales: {
    value: number
    trend: number
    period: string
    currency: string
  }
  averageOrderValue: {
    value: number
    trend: number
    period: string
    currency: string
  }
  numberOfOrders: {
    value: number
    trend: number
    period: string
  }
  growthVsPrevious: {
    value: number
    trend: number
    period: string
  }
}

export interface SalesPerformanceData {
  month: string
  currentPeriod: number
  previousPeriod: number
  growth: number
}

export interface ProductCategoryData {
  category: string
  sales: number
  orders: number
  averageValue: number
  growth: number
}

export interface RegionalSalesData {
  region: string
  sales: number
  orders: number
  growth: number
  marketShare: number
}

export interface SalesChannelData {
  channel: string
  sales: number
  orders: number
  conversionRate: number
  growth: number
}

export interface PipelineStageData {
  stage: string
  count: number
  value: number
  averageTime: number
  conversionRate: number
  dropOffRate: number
}

export interface PipelineMetrics {
  totalPipelineValue: number
  averageOpportunitySize: number
  conversionRate: number
  averageSalesCycle: number
  stagesData: PipelineStageData[]
}

export interface AgingOrderData {
  ageRange: string
  count: number
  value: number
  percentage: number
  status: 'normal' | 'warning' | 'critical'
}

export interface FulfillmentMetrics {
  onTimeDeliveryRate: number
  averageLeadTime: number
  averageFulfillmentTime: number
  totalOrdersShipped: number
  totalOrdersDelivered: number
}

export interface DeliveryModePerformance {
  mode: string
  onTimeRate: number
  averageTime: number
  cost: number
  volume: number
  customerSatisfaction: number
}

export interface CarrierPerformance {
  carrier: string
  onTimeRate: number
  averageTime: number
  cost: number
  volume: number
  damageRate: number
}

export interface GeographicPerformance {
  region: string
  onTimeRate: number
  averageTime: number
  volume: number
  challenges: string[]
}

export interface ManufacturingLeadTimeData {
  productCategory: string
  manufacturingTime: number
  deliveryTime: number
  totalLeadTime: number
  onTimeRate: number
}

export interface SalesPerformanceFilters {
  dateRange?: [string, string]
  region?: string
  productCategory?: string
  salesperson?: string
  customer?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

// Automotive parts categories
export const PRODUCT_CATEGORIES = [
  'Engine Components',
  'Brake Systems',
  'Suspension Parts',
  'Electrical Components',
  'Body Parts',
  'Transmission Parts',
  'Exhaust Systems',
  'Cooling Systems',
  'Fuel Systems',
  'Interior Components'
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

// Sales order pipeline stages
export const PIPELINE_STAGES = [
  'Draft',
  'Confirmed',
  'In Production',
  'Quality Check',
  'Shipped',
  'Invoiced',
  'Delivered',
  'Closed'
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

// Delivery modes
export const DELIVERY_MODES = ['Standard', 'Express', 'Rush', 'Overnight', 'Freight'] as const

export type DeliveryMode = (typeof DELIVERY_MODES)[number]

// Geographic regions
export const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East & Africa'] as const

export type Region = (typeof REGIONS)[number]

// Sales channels
export const SALES_CHANNELS = ['Direct Sales', 'Online Portal', 'Partner Network', 'Distributors', 'Retail'] as const

export type SalesChannel = (typeof SALES_CHANNELS)[number]
