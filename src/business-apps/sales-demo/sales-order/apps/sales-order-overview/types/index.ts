// TypeScript interfaces for Sales Order Overview

export interface SalesOrder {
  id: string
  orderNumber: string
  orderDate: string
  customer: {
    id: string
    name: string
    email?: string
  }
  totalValue: number
  currency: string
  status: 'Draft' | 'Released' | 'Invoiced' | 'Cancelled'
  salesperson: {
    id: string
    name: string
    email?: string
  }
  createdAt: string
  updatedAt: string
  items?: number // Optional field for number of items in the order
}

export interface KPIData {
  totalSalesOrders: {
    value: number
    trend: number
    period: string
  }
  totalOrderValue: {
    value: number
    trend: number
    period: string
    currency: string
  }
  openOrders: {
    value: number
    trend: number
    period: string
  }
  pendingApproval: {
    value: number
    trend: number
    period: string
  }
}

export interface SalesOrderFilters {
  customer?: string
  status?: 'Draft' | 'Released' | 'Invoiced' | 'Cancelled'
  dateRange?: [string, string]
  salesperson?: string
  searchTerm?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

export interface SalesOrderResponse {
  orders: SalesOrder[]
  pagination: PaginationParams
  kpiData: KPIData
}

export interface AIActionItem {
  id: string
  icon: string
  message: string
  priority: 'high' | 'medium' | 'low'
  actionType: 'approval' | 'monitoring' | 'suggestion' | 'reminder'
}
