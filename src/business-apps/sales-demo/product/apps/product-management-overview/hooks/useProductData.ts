import { useState, useEffect, useCallback, useMemo } from 'react'
import { Product, ProductKPIData, ProductFilters, PaginationParams } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getProducts, getProductKPIs } from '../queries/productQuery'
import { generateDemoProducts, generateDemoProductKPIData } from './demoData'

// Helper function to calculate trend percentage
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

interface UseProductDataProps {
  accessToken: string
}

interface UseProductDataReturn {
  // Data
  products: Product[]
  kpiData: ProductKPIData | null

  // State
  loading: boolean
  error: Error | null
  isUsingDemoData: boolean

  // Filters and pagination
  filters: ProductFilters
  pagination: PaginationParams

  // Actions
  setFilters: (filters: ProductFilters) => void
  setPagination: (pagination: PaginationParams) => void
  refreshData: () => void
}

export const useProductData = ({ accessToken }: UseProductDataProps): UseProductDataReturn => {
  // GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // State
  const [products, setProducts] = useState<Product[]>([])
  const [kpiData, setKpiData] = useState<ProductKPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isUsingDemoData, setIsUsingDemoData] = useState(false)

  // Filters and pagination
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    productType: undefined,
    stateCode: undefined,
    isKit: undefined,
    isStockItem: undefined,
    priceRange: undefined
  })

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // Build GraphQL where clause based on filters
  const buildWhereClause = useCallback(() => {
    const conditions: any[] = []

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`
      conditions.push({
        _or: [
          { name: { _ilike: searchTerm } },
          { productNumber: { _ilike: searchTerm } },
          { description: { _ilike: searchTerm } },
          { supplierName: { _ilike: searchTerm } }
        ]
      })
    }

    // Product type filter
    if (filters.productType) {
      conditions.push({ productTypeCode: { _eq: filters.productType } })
    }

    // State code filter
    if (filters.stateCode) {
      conditions.push({ stateCode: { _eq: filters.stateCode } })
    }

    // Kit filter
    if (filters.isKit !== undefined) {
      conditions.push({ isKit: { _eq: filters.isKit } })
    }

    // Stock item filter
    if (filters.isStockItem !== undefined) {
      conditions.push({ isStockItem: { _eq: filters.isStockItem } })
    }

    // Price range filter
    if (filters.priceRange && filters.priceRange.length === 2) {
      conditions.push({
        price: {
          _gte: filters.priceRange[0],
          _lte: filters.priceRange[1]
        }
      })
    }

    // Always exclude deleted products
    conditions.push({ isDeleted: { _eq: false } })

    return conditions.length > 0 ? { _and: conditions } : {}
  }, [filters])

  // Fetch products data
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setIsUsingDemoData(false)

      const whereClause = buildWhereClause()
      const offset = (pagination.page - 1) * pagination.pageSize

      const variables = {
        limit: pagination.pageSize,
        offset: offset,
        where: whereClause,
        orderBy: [{ name: 'ASC' }]
      }

      const result = await graphqlClient.request(getProducts, variables)

      if (result?.nwSalesProduct && result?.nwSalesProductAggregate) {
        const fetchedProducts = result.nwSalesProduct.map((product: any) => ({
          ...product,
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: product.updatedAt || new Date().toISOString()
        }))

        setProducts(fetchedProducts)
        setPagination(prev => ({
          ...prev,
          total: result.nwSalesProductAggregate.aggregate.count
        }))
      } else {
        throw new Error('Invalid response structure')
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err as Error)
      setIsUsingDemoData(true)

      // Use demo data
      const demoData = generateDemoProducts(pagination.page, pagination.pageSize)
      setProducts(demoData.products)
      setPagination(prev => ({
        ...prev,
        total: demoData.total
      }))
    } finally {
      setLoading(false)
    }
  }, [graphqlClient, buildWhereClause, pagination.page, pagination.pageSize])

  // Fetch KPI data
  const fetchKPIData = useCallback(async () => {
    try {
      const whereClause = buildWhereClause()
      const variables = { where: whereClause }

      const result = await graphqlClient.request(getProductKPIs, variables)

      if (result) {
        const kpis: ProductKPIData = {
          totalProducts: {
            value: result.totalProducts?.aggregate?.count || 0,
            trend: calculateTrend(result.totalProducts?.aggregate?.count || 0, 45), // Mock previous value
            period: 'vs last month'
          },
          activeProducts: {
            value: result.activeProducts?.aggregate?.count || 0,
            trend: calculateTrend(result.activeProducts?.aggregate?.count || 0, 40), // Mock previous value
            period: 'vs last month'
          },
          productCategories: {
            value: result.productCategories?.aggregate?.count || 0,
            trend: 0,
            period: 'vs last month'
          },
          averagePrice: {
            value: result.averagePrice?.aggregate?.avg?.price || 0,
            trend: calculateTrend(result.averagePrice?.aggregate?.avg?.price || 0, 1200), // Mock previous value
            period: 'vs last month',
            currency: 'EUR'
          }
        }

        setKpiData(kpis)
      }
    } catch (err) {
      console.error('Error fetching KPI data:', err)
      // Use demo KPI data on error
      setKpiData(generateDemoProductKPIData())
    }
  }, [graphqlClient, buildWhereClause])

  // Refresh data
  const refreshData = useCallback(() => {
    fetchProducts()
    fetchKPIData()
  }, [fetchProducts, fetchKPIData])

  // Effect to fetch data when dependencies change
  useEffect(() => {
    if (accessToken) {
      refreshData()
    }
  }, [accessToken, refreshData])

  // Memoized return value
  const returnValue = useMemo(
    () => ({
      // Data
      products,
      kpiData,

      // State
      loading,
      error,
      isUsingDemoData,

      // Filters and pagination
      filters,
      pagination,

      // Actions
      setFilters,
      setPagination,
      refreshData
    }),
    [products, kpiData, loading, error, isUsingDemoData, filters, pagination, refreshData]
  )

  return returnValue
}
