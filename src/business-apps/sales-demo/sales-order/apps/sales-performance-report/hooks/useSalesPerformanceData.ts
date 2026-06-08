import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  SalesPerformanceKPI,
  SalesPerformanceData,
  ProductCategoryData,
  RegionalSalesData,
  PipelineMetrics,
  FulfillmentMetrics,
  SalesPerformanceFilters,
  PaginationParams,
  PRODUCT_CATEGORIES,
  REGIONS
} from '../types'

// Helper function to calculate trend percentage
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// Helper function to generate mock automotive data
const generateMockAutomotiveData = (): {
  kpiData: SalesPerformanceKPI
  performanceData: SalesPerformanceData[]
  productCategoryData: ProductCategoryData[]
  regionalData: RegionalSalesData[]
  pipelineMetrics: PipelineMetrics
  fulfillmentMetrics: FulfillmentMetrics
} => {
  // Generate realistic KPI data
  const currentSales = 2850000 // $2.85M
  const previousSales = 2650000 // $2.65M
  const currentOrders = 1240
  const previousOrders = 1180

  const kpiData: SalesPerformanceKPI = {
    totalSales: {
      value: currentSales,
      trend: calculateTrend(currentSales, previousSales),
      period: 'vs last 6 months',
      currency: 'USD'
    },
    averageOrderValue: {
      value: currentSales / currentOrders,
      trend: calculateTrend(currentSales / currentOrders, previousSales / previousOrders),
      period: 'vs last 6 months',
      currency: 'USD'
    },
    numberOfOrders: {
      value: currentOrders,
      trend: calculateTrend(currentOrders, previousOrders),
      period: 'vs last 6 months'
    },
    growthVsPrevious: {
      value: calculateTrend(currentSales, previousSales),
      trend: calculateTrend(currentSales, previousSales),
      period: 'vs last 6 months'
    }
  }

  // Generate 6-month performance data
  const performanceData: SalesPerformanceData[] = []
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  months.forEach((month, index) => {
    const currentPeriod = 450000 + Math.random() * 100000 + index * 15000
    const previousPeriod = currentPeriod * (0.85 + Math.random() * 0.2)
    performanceData.push({
      month,
      currentPeriod,
      previousPeriod,
      growth: calculateTrend(currentPeriod, previousPeriod)
    })
  })

  // Generate product category data
  const productCategoryData: ProductCategoryData[] = PRODUCT_CATEGORIES.slice(0, 5).map((category, index) => {
    const sales = 500000 - index * 80000 + Math.random() * 50000
    const orders = Math.floor(sales / 2300)
    return {
      category,
      sales,
      orders,
      averageValue: sales / orders,
      growth: -5 + Math.random() * 25
    }
  })

  // Generate regional data
  const regionalData: RegionalSalesData[] = REGIONS.map((region, index) => {
    const sales = 600000 - index * 100000 + Math.random() * 80000
    const orders = Math.floor(sales / 2400)
    return {
      region,
      sales,
      orders,
      growth: -3 + Math.random() * 20,
      marketShare: 35 - index * 6 + Math.random() * 5
    }
  })

  // Generate pipeline metrics
  const pipelineMetrics: PipelineMetrics = {
    totalPipelineValue: 4200000,
    averageOpportunitySize: 2850,
    conversionRate: 68.5,
    averageSalesCycle: 45,
    stagesData: [
      { stage: 'Draft', count: 85, value: 242250, averageTime: 3, conversionRate: 92, dropOffRate: 8 },
      { stage: 'Confirmed', count: 78, value: 222300, averageTime: 5, conversionRate: 89, dropOffRate: 11 },
      { stage: 'In Production', count: 69, value: 196650, averageTime: 18, conversionRate: 94, dropOffRate: 6 },
      { stage: 'Quality Check', count: 65, value: 185250, averageTime: 2, conversionRate: 98, dropOffRate: 2 },
      { stage: 'Shipped', count: 64, value: 182400, averageTime: 7, conversionRate: 96, dropOffRate: 4 },
      { stage: 'Invoiced', count: 61, value: 173850, averageTime: 3, conversionRate: 95, dropOffRate: 5 },
      { stage: 'Delivered', count: 58, value: 165300, averageTime: 2, conversionRate: 100, dropOffRate: 0 },
      { stage: 'Closed', count: 58, value: 165300, averageTime: 1, conversionRate: 100, dropOffRate: 0 }
    ]
  }

  // Generate fulfillment metrics
  const fulfillmentMetrics: FulfillmentMetrics = {
    onTimeDeliveryRate: 87.3,
    averageLeadTime: 28.5,
    averageFulfillmentTime: 21.2,
    totalOrdersShipped: 1156,
    totalOrdersDelivered: 1089
  }

  return {
    kpiData,
    performanceData,
    productCategoryData,
    regionalData,
    pipelineMetrics,
    fulfillmentMetrics
  }
}

interface UseSalesPerformanceDataProps {
  accessToken: string
}

interface UseSalesPerformanceDataReturn {
  kpiData: SalesPerformanceKPI | null
  performanceData: SalesPerformanceData[]
  productCategoryData: ProductCategoryData[]
  regionalData: RegionalSalesData[]
  pipelineMetrics: PipelineMetrics | null
  fulfillmentMetrics: FulfillmentMetrics | null
  loading: boolean
  error: Error | null
  filters: SalesPerformanceFilters
  pagination: PaginationParams
  setFilters: (filters: SalesPerformanceFilters) => void
  setPagination: (pagination: PaginationParams) => void
  refreshData: () => void
}

export const useSalesPerformanceData = ({
  accessToken
}: UseSalesPerformanceDataProps): UseSalesPerformanceDataReturn => {
  // State
  const [kpiData, setKpiData] = useState<SalesPerformanceKPI | null>(null)
  const [performanceData, setPerformanceData] = useState<SalesPerformanceData[]>([])
  const [productCategoryData, setProductCategoryData] = useState<ProductCategoryData[]>([])
  const [regionalData, setRegionalData] = useState<RegionalSalesData[]>([])
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null)
  const [fulfillmentMetrics, setFulfillmentMetrics] = useState<FulfillmentMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const [filters, setFiltersState] = useState<SalesPerformanceFilters>({
    dateRange: [dayjs().subtract(6, 'months').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')]
  })

  const [pagination, setPaginationState] = useState<PaginationParams>({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      // For now, use mock data since we're focusing on UI implementation
      // In production, this would make actual GraphQL requests
      const mockData = generateMockAutomotiveData()

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      setKpiData(mockData.kpiData)
      setPerformanceData(mockData.performanceData)
      setProductCategoryData(mockData.productCategoryData)
      setRegionalData(mockData.regionalData)
      setPipelineMetrics(mockData.pipelineMetrics)
      setFulfillmentMetrics(mockData.fulfillmentMetrics)

      setPaginationState(prev => ({ ...prev, total: 1240 }))
    } catch (err) {
      console.error('Error fetching sales performance data:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, filters])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Wrapper functions for state setters
  const setFilters = useCallback((newFilters: SalesPerformanceFilters) => {
    setFiltersState(newFilters)
  }, [])

  const setPagination = useCallback((newPagination: PaginationParams) => {
    setPaginationState(newPagination)
  }, [])

  const refreshData = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    kpiData,
    performanceData,
    productCategoryData,
    regionalData,
    pipelineMetrics,
    fulfillmentMetrics,
    loading,
    error,
    filters,
    pagination,
    setFilters,
    setPagination,
    refreshData
  }
}
