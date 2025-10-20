import { useState, useEffect, useCallback, useMemo } from 'react'
import { BillOfMaterials, BomKPIData, BomFilters, PaginationParams } from '../../../types'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getBillOfMaterials, getBomKPIs } from '../queries/bomQuery'
import { generateDemoBoms, generateDemoBomKPIData } from './demoData'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

// Helper function to calculate trend percentage
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

interface UseBomDataProps {
  accessToken: string
}

interface UseBomDataReturn {
  boms: BillOfMaterials[]
  kpiData: BomKPIData | null
  loading: boolean
  error: Error | null
  isUsingDemoData: boolean
  filters: BomFilters
  pagination: PaginationParams
  setFilters: (filters: BomFilters) => void
  setPagination: (pagination: PaginationParams) => void
  refreshData: () => void
}

export const useBomData = ({ accessToken }: UseBomDataProps): UseBomDataReturn => {
  // GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // State
  const [boms, setBoms] = useState<BillOfMaterials[]>([])
  const [kpiData, setKpiData] = useState<BomKPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isUsingDemoData, setIsUsingDemoData] = useState(false)

  // Filters and pagination
  const [filters, setFilters] = useState<BomFilters>({
    search: '',
    bomType: undefined,
    bomStatus: undefined,
    parentProductId: undefined,
    activeOnly: undefined,
    complexityRange: undefined
  })

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // Build GraphQL where clause from filters - memoized to prevent loops
  const buildWhereClause = useMemo(() => {
    const conditions: any[] = []

    // Basic filters
    if (filters.bomType) {
      conditions.push({ bomType: { _eq: filters.bomType } })
    }

    if (filters.bomStatus) {
      conditions.push({ bomStatus: { _eq: filters.bomStatus } })
    }

    if (filters.parentProductId) {
      conditions.push({ parentProductId: { _eq: filters.parentProductId } })
    }

    if (filters.activeOnly) {
      const now = dayjs().toISOString()
      conditions.push({
        _and: [
          { bomStatus: { _eq: 'ACTIVE' } },
          {
            _or: [{ activeFrom: { _is_null: true } }, { activeFrom: { _lte: now } }]
          },
          {
            _or: [{ activeTo: { _is_null: true } }, { activeTo: { _gte: now } }]
          }
        ]
      })
    }

    if (filters.complexityRange) {
      conditions.push({
        componentCount: {
          _gte: filters.complexityRange[0],
          _lte: filters.complexityRange[1]
        }
      })
    }

    // Search filter
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      conditions.push({
        _or: [
          { name: { _ilike: searchTerm } },
          { businessKey: { _ilike: searchTerm } },
          { description: { _ilike: searchTerm } },
          { parentProduct: { name: { _ilike: searchTerm } } },
          { parentProduct: { productNumber: { _ilike: searchTerm } } }
        ]
      })
    }

    // Always exclude deleted records
    conditions.push({ isDeleted: { _neq: true } })

    return conditions.length > 0 ? { _and: conditions } : {}
  }, [filters])

  // Filter demo data based on current filters
  const filterDemoData = useCallback(
    (allBoms: BillOfMaterials[]) => {
      let filteredBoms = [...allBoms]

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredBoms = filteredBoms.filter(
          bom =>
            bom.name.toLowerCase().includes(searchTerm) ||
            bom.businessKey.toLowerCase().includes(searchTerm) ||
            (bom.description && bom.description.toLowerCase().includes(searchTerm)) ||
            (bom.parentProduct?.name && bom.parentProduct.name.toLowerCase().includes(searchTerm)) ||
            (bom.parentProduct?.productNumber && bom.parentProduct.productNumber.toLowerCase().includes(searchTerm))
        )
      }

      // Apply BOM type filter
      if (filters.bomType) {
        filteredBoms = filteredBoms.filter(bom => bom.bomType === filters.bomType)
      }

      // Apply BOM status filter
      if (filters.bomStatus) {
        filteredBoms = filteredBoms.filter(bom => bom.bomStatus === filters.bomStatus)
      }

      // Apply active only filter
      if (filters.activeOnly) {
        const now = dayjs()
        filteredBoms = filteredBoms.filter(bom => {
          const activeFrom = bom.activeFrom ? dayjs(bom.activeFrom) : null
          const activeTo = bom.activeTo ? dayjs(bom.activeTo) : null
          return (
            bom.bomStatus === 'ACTIVE' &&
            (!activeFrom || activeFrom.isBefore(now)) &&
            (!activeTo || activeTo.isAfter(now))
          )
        })
      }

      return filteredBoms
    },
    [filters]
  )

  // Load demo data function
  const loadDemoData = useCallback(() => {
    console.log('Loading demo data with filters:', filters)
    setIsUsingDemoData(true)

    // Generate all demo data first
    const allDemoData = generateDemoBoms(1, 1000) // Get all demo data

    // Apply filters to demo data
    const filteredBoms = filterDemoData(allDemoData.boms)

    // Paginate filtered results
    const startIndex = (pagination.page - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    const paginatedBoms = filteredBoms.slice(startIndex, endIndex)

    console.log(
      `Filtered demo data: ${filteredBoms.length} BOMs, showing ${paginatedBoms.length} on page ${pagination.page}`
    )

    setBoms(paginatedBoms)
    setPagination(prev => ({
      ...prev,
      total: filteredBoms.length
    }))

    // Load demo KPI data
    setKpiData(generateDemoBomKPIData())
  }, [pagination.page, pagination.pageSize, filters, filterDemoData])

  // Fetch BOMs data - stable reference to prevent loops
  const fetchBoms = useCallback(async () => {
    setLoading(true)
    setError(null)

    // If no access token, use demo data immediately
    if (!accessToken) {
      console.log('No access token, using demo data')
      loadDemoData()
      setLoading(false)
      return
    }

    try {
      const variables = {
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        where: buildWhereClause,
        orderBy: [{ updatedAt: 'DESC' }, { name: 'ASC' }]
      }

      const result = await graphqlClient.request(getBillOfMaterials, variables)

      if (result?.BillOfMaterials && result?.BillOfMaterialsAggregate) {
        const fetchedBoms = result.BillOfMaterials.map((bom: any) => ({
          ...bom,
          createdAt: bom.createdAt || new Date().toISOString(),
          updatedAt: bom.updatedAt || new Date().toISOString()
        }))

        // If we got real data, reset demo data flag
        setIsUsingDemoData(false)
        setBoms(fetchedBoms)
        setPagination(prev => ({
          ...prev,
          total: result.BillOfMaterialsAggregate.aggregate.count
        }))
      } else {
        throw new Error('Invalid response structure')
      }
    } catch (err) {
      console.error('Error fetching BOMs:', err)
      setError(err as Error)
      loadDemoData()
    } finally {
      setLoading(false)
    }
  }, [accessToken, buildWhereClause, pagination.page, pagination.pageSize, loadDemoData])

  // Fetch KPI data - stable reference to prevent loops
  const fetchKPIData = useCallback(async () => {
    // If no access token or already using demo data, skip KPI fetch
    if (!accessToken || isUsingDemoData) {
      if (!kpiData) {
        setKpiData(generateDemoBomKPIData())
      }
      return
    }

    try {
      const result = await graphqlClient.request(getBomKPIs, { where: buildWhereClause })

      if (result) {
        // Calculate trends (mock calculation for demo)
        const kpis: BomKPIData = {
          totalBoms: {
            value: result.totalBoms?.aggregate?.count || 0,
            trend: 8.5 // Mock trend data
          },
          activeBoms: {
            value: result.activeBoms?.aggregate?.count || 0,
            trend: 12.3 // Mock trend data
          },
          totalComponents: {
            value: result.totalComponents?.aggregate?.count || 0,
            trend: 15.7 // Mock trend data
          },
          averageComplexity: {
            value: Math.round((result.averageComplexity?.aggregate?.avg?.componentCount || 0) * 10) / 10,
            trend: -2.1 // Mock trend data
          }
        }

        setKpiData(kpis)
      }
    } catch (err) {
      console.error('Error fetching KPI data:', err)
      // Use demo KPI data on error
      setKpiData(generateDemoBomKPIData())
    }
  }, [accessToken, buildWhereClause, isUsingDemoData, kpiData])

  // Manual refresh function that bypasses the callback dependencies
  const refreshData = useCallback(() => {
    console.log('Manual refresh triggered')
    // Directly trigger a state update that will cause re-fetching
    setLoading(true)

    // Trigger both data fetches by calling them directly
    fetchBoms()
    fetchKPIData()
  }, [fetchBoms, fetchKPIData])

  // Effect to fetch data when key dependencies change
  useEffect(() => {
    console.log('Auto-fetching data due to dependency change')
    fetchBoms()
  }, [buildWhereClause, pagination.page, pagination.pageSize, accessToken])

  // Separate effect for KPI data - only when filters change
  useEffect(() => {
    console.log('Auto-fetching KPI data due to filter change')
    fetchKPIData()
  }, [buildWhereClause, accessToken, isUsingDemoData])

  // Effect to handle initial load and ensure we always have data
  useEffect(() => {
    // If we don't have any data and we're not loading, load demo data
    if (!loading && boms.length === 0 && !kpiData) {
      console.log('No data found, loading demo data as fallback')
      loadDemoData()
    }
  }, [loading, boms.length, kpiData, loadDemoData])

  return {
    boms,
    kpiData,
    loading,
    error,
    isUsingDemoData,
    filters,
    pagination,
    setFilters,
    setPagination,
    refreshData
  }
}
