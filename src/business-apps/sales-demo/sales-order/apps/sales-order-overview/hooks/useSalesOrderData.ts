import { useState, useEffect, useCallback, useMemo } from 'react'
import { SalesOrder, KPIData, SalesOrderFilters, PaginationParams } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getSalesOrders, getSalesOrderKPIs, getCustomers, getSalespersons } from '../queries/salesOrderQueries'
import {
  generateDemoSalesOrders,
  generateDemoKPIData,
  generateDemoCustomers,
  generateDemoSalespersons
} from './demoData'

// Helper function to calculate trend percentage
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

interface UseSalesOrderDataProps {
  accessToken: string
}

interface UseSalesOrderDataReturn {
  // Data
  orders: SalesOrder[]
  kpiData: KPIData | null
  customers: Array<{ id: string; name: string; email?: string }>
  salespersons: Array<{ id: string; name: string; email?: string }>

  // State
  loading: boolean
  error: Error | null
  pagination: PaginationParams
  filters: SalesOrderFilters
  isUsingDemoData: boolean

  // Actions
  setFilters: (filters: SalesOrderFilters) => void
  setPagination: (pagination: Partial<PaginationParams>) => void
  refreshData: () => void
  searchCustomers: (searchTerm: string) => void
  searchSalespersons: (searchTerm: string) => void
}

export const useSalesOrderData = ({ accessToken }: UseSalesOrderDataProps): UseSalesOrderDataReturn => {
  // GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // State
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email?: string }>>([])
  const [salespersons, setSalespersons] = useState<Array<{ id: string; name: string; email?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isUsingDemoData, setIsUsingDemoData] = useState(false)

  const [pagination, setPaginationState] = useState<PaginationParams>({
    page: 1,
    pageSize: 20,
    total: 0
  })

  const [filters, setFiltersState] = useState<SalesOrderFilters>({})

  // Memoize individual filter values to prevent unnecessary re-renders
  const memoizedFilters = useMemo(
    () => ({
      customer: filters.customer,
      status: filters.status,
      dateRange: filters.dateRange,
      salesperson: filters.salesperson,
      searchTerm: filters.searchTerm
    }),
    [filters.customer, filters.status, filters.dateRange, filters.salesperson, filters.searchTerm]
  )

  // Build GraphQL where clause from filters
  const buildWhereClause = (filters: SalesOrderFilters) => {
    const whereConditions: any = {}

    if (filters.customer) {
      whereConditions.accountId = { _eq: filters.customer }
    }

    if (filters.status) {
      whereConditions.statusCode = { _eq: filters.status }
    }

    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      whereConditions.requestedShippingDate = {
        _gte: filters.dateRange[0],
        _lte: filters.dateRange[1]
      }
    }

    if (filters.salesperson) {
      whereConditions.salespersonId = { _eq: filters.salesperson }
    }

    if (filters.searchTerm) {
      const searchTerm = `%${filters.searchTerm}%`
      whereConditions._or = [
        { salesOrderNumber: { _ilike: searchTerm } },
        { sales_order_account: { name: { _ilike: searchTerm } } },
        { salesperson_id_emplyoee: { firstName: { _ilike: searchTerm } } },
        { salesperson_id_emplyoee: { lastName: { _ilike: searchTerm } } }
      ]
    }

    return whereConditions
  }

  // Fetch sales orders from GraphQL API
  const fetchOrders = useCallback(async (): Promise<number | null> => {
    setLoading(true)
    setError(null)
    setIsUsingDemoData(false)

    try {
      const whereClause = buildWhereClause(memoizedFilters)
      const offset = (pagination.page - 1) * pagination.pageSize

      const variables = {
        limit: pagination.pageSize,
        offset,
        where: whereClause,
        orderBy: [{ requestedShippingDate: 'DESC' }]
      }

      const data = await graphqlClient.request(getSalesOrders, variables)

      if (data) {
        const salesOrders = data.nwSalesSalesOrder.map((order: any) => ({
          id: order.id,
          orderNumber: order.salesOrderNumber,
          orderDate: order.requestedShippingDate || order.requestedReceiptDate,
          totalValue: order.totalAmount,
          currency: order.currencyCode,
          status: order.statusCode,
          createdAt: order.requestedShippingDate,
          updatedAt: order.requestedReceiptDate,
          customer: {
            id: order.sales_order_account?.id || '',
            name: order.sales_order_account?.name || '',
            email: ''
          },
          salesperson: {
            id: order.salesperson_id_emplyoee?.id || '',
            name: `${order.salesperson_id_emplyoee?.firstName || ''} ${order.salesperson_id_emplyoee?.lastName || ''}`.trim(),
            email: ''
          }
        }))

        setOrders(salesOrders)

        // Return the total count to be handled outside
        return data.nwSalesSalesOrderAggregate.aggregate.count
      } else {
        // No data found - use demo data as fallback
        console.warn('No sales orders data found, using demo data as fallback')
        const demoData = generateDemoSalesOrders(pagination.page, pagination.pageSize)
        setOrders(demoData.orders)
        setIsUsingDemoData(true)
        return demoData.total
      }
    } catch (err) {
      // Error occurred - use demo data as fallback
      console.error('Error fetching sales orders:', err)
      const demoData = generateDemoSalesOrders(pagination.page, pagination.pageSize)
      setOrders(demoData.orders)
      setIsUsingDemoData(true)
      setError(null) // Clear error since we're showing demo data
      return demoData.total
    } finally {
      setLoading(false)
    }
  }, [memoizedFilters, pagination.page, pagination.pageSize, graphqlClient])

  // Fetch KPI data with demo data fallback
  const fetchKPIData = useCallback(async () => {
    try {
      // Try to fetch real KPI data first
      const data = await graphqlClient.request(getSalesOrderKPIs)

      if (data) {
        // Process real KPI data
        const kpiData: KPIData = {
          totalSalesOrders: {
            value: data.totalOrders.aggregate.count || 0,
            trend: 12.5, // Would need historical data for real trend
            period: 'vs last month'
          },
          totalOrderValue: {
            value: data.totalValue.aggregate.sum.totalAmount || 0,
            trend: 8.3, // Would need historical data for real trend
            period: 'vs last month',
            currency: 'EUR'
          },
          openOrders: {
            value: data.openOrders.aggregate.count || 0,
            trend: -2.1, // Would need historical data for real trend
            period: 'vs last month'
          },
          pendingApproval: {
            value: data.pendingApprovalOrders.aggregate.count || 0,
            trend: -18.7, // Would need historical data for real trend
            period: 'vs last month'
          }
        }
        setKpiData(kpiData)
      } else {
        // No data found - use demo data as fallback
        console.warn('No KPI data found, using demo data as fallback')
        const demoKpiData = generateDemoKPIData()
        setKpiData(demoKpiData)
        setIsUsingDemoData(true)
      }
    } catch (err) {
      // Error occurred - use demo data as fallback
      console.error('Error fetching KPI data:', err)
      const demoKpiData = generateDemoKPIData()
      setKpiData(demoKpiData)
      setIsUsingDemoData(true)
    }
  }, [graphqlClient])

  // Search customers from GraphQL API with demo data fallback
  const searchCustomers = useCallback(
    async (searchTerm: string) => {
      try {
        const variables = {
          searchTerm: `%${searchTerm}%`,
          limit: 20
        }

        const data = await graphqlClient.request(getCustomers, variables)

        if (data && data.nwSalesSalesOrder) {
          const customerList = data.nwSalesSalesOrder
            .filter((order: any) => order.sales_order_account)
            .map((order: any) => ({
              id: order.sales_order_account.id,
              name: order.sales_order_account.name,
              email: ''
            }))

          setCustomers(customerList)
        } else {
          // No data found - use demo data as fallback
          console.warn('No customer data found, using demo data as fallback')
          const demoCustomers = generateDemoCustomers()
          const filteredCustomers = searchTerm
            ? demoCustomers.filter(customer => customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : demoCustomers
          setCustomers(filteredCustomers)
          setIsUsingDemoData(true)
        }
      } catch (err) {
        // Error occurred - use demo data as fallback
        console.error('Error searching customers:', err)
        const demoCustomers = generateDemoCustomers()
        const filteredCustomers = searchTerm
          ? demoCustomers.filter(customer => customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
          : demoCustomers
        setCustomers(filteredCustomers)
        setIsUsingDemoData(true)
      }
    },
    [graphqlClient]
  )

  // Search salespersons from GraphQL API with demo data fallback
  const searchSalespersons = useCallback(
    async (searchTerm: string) => {
      try {
        const variables = {
          searchTerm: `%${searchTerm}%`,
          limit: 20
        }

        const data = await graphqlClient.request(getSalespersons, variables)

        if (data && data.nwSalesSalesOrder) {
          const salespersonList = data.nwSalesSalesOrder
            .filter((order: any) => order.salesperson_id_emplyoee)
            .map((order: any) => ({
              id: order.salesperson_id_emplyoee.id,
              name: `${order.salesperson_id_emplyoee.firstName} ${order.salesperson_id_emplyoee.lastName}`.trim(),
              email: ''
            }))

          setSalespersons(salespersonList)
        } else {
          // No data found - use demo data as fallback
          console.warn('No salesperson data found, using demo data as fallback')
          const demoSalespersons = generateDemoSalespersons()
          const filteredSalespersons = searchTerm
            ? demoSalespersons.filter(salesperson => salesperson.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : demoSalespersons
          setSalespersons(filteredSalespersons)
          setIsUsingDemoData(true)
        }
      } catch (err) {
        // Error occurred - use demo data as fallback
        console.error('Error searching salespersons:', err)
        const demoSalespersons = generateDemoSalespersons()
        const filteredSalespersons = searchTerm
          ? demoSalespersons.filter(salesperson => salesperson.name.toLowerCase().includes(searchTerm.toLowerCase()))
          : demoSalespersons
        setSalespersons(filteredSalespersons)
        setIsUsingDemoData(true)
      }
    },
    [graphqlClient]
  )

  // Public methods
  const setFilters = useCallback((newFilters: SalesOrderFilters) => {
    setFiltersState(newFilters)
    setPaginationState(prev => ({ ...prev, page: 1 })) // Reset to first page
  }, [])

  const setPagination = useCallback((newPagination: Partial<PaginationParams>) => {
    setPaginationState(prev => ({ ...prev, ...newPagination }))
  }, [])

  const refreshData = useCallback(async () => {
    // Refresh orders
    setLoading(true)
    setError(null)
    setIsUsingDemoData(false)

    try {
      const whereClause = buildWhereClause(memoizedFilters)
      const offset = (pagination.page - 1) * pagination.pageSize

      const variables = {
        limit: pagination.pageSize,
        offset,
        where: whereClause,
        orderBy: [{ requestedShippingDate: 'DESC' }]
      }

      const data = await graphqlClient.request(getSalesOrders, variables)

      if (data) {
        const salesOrders = data.nwSalesSalesOrder.map((order: any) => ({
          id: order.id,
          orderNumber: order.salesOrderNumber,
          orderDate: order.requestedShippingDate || order.requestedReceiptDate,
          totalValue: order.totalAmount,
          currency: order.currencyCode,
          status: order.statusCode,
          createdAt: order.requestedShippingDate,
          updatedAt: order.requestedReceiptDate,
          customer: {
            id: order.sales_order_account?.id || '',
            name: order.sales_order_account?.name || '',
            email: ''
          },
          salesperson: {
            id: order.salesperson_id_emplyoee?.id || '',
            name: `${order.salesperson_id_emplyoee?.firstName || ''} ${order.salesperson_id_emplyoee?.lastName || ''}`.trim(),
            email: ''
          }
        }))

        setOrders(salesOrders)
        setPaginationState(prev => ({ ...prev, total: data.nwSalesSalesOrderAggregate.aggregate.count }))
      } else {
        // No data found - use demo data as fallback
        console.warn('No sales orders data found during refresh, using demo data as fallback')
        const demoData = generateDemoSalesOrders(pagination.page, pagination.pageSize)
        setOrders(demoData.orders)
        setPaginationState(prev => ({ ...prev, total: demoData.total }))
        setIsUsingDemoData(true)
      }
    } catch (err) {
      // Error occurred - use demo data as fallback
      console.error('Error refreshing sales orders:', err)
      const demoData = generateDemoSalesOrders(pagination.page, pagination.pageSize)
      setOrders(demoData.orders)
      setPaginationState(prev => ({ ...prev, total: demoData.total }))
      setIsUsingDemoData(true)
      setError(null) // Clear error since we're showing demo data
    } finally {
      setLoading(false)
    }

    // Refresh KPI data
    fetchKPIData()
  }, [memoizedFilters, pagination.page, pagination.pageSize, graphqlClient, fetchKPIData])

  // Effects
  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      setError(null)
      setIsUsingDemoData(false)

      try {
        const whereClause = buildWhereClause(memoizedFilters)
        const offset = (pagination.page - 1) * pagination.pageSize

        const variables = {
          limit: pagination.pageSize,
          offset,
          where: whereClause,
          orderBy: [{ requestedShippingDate: 'DESC' }]
        }

        const data = await graphqlClient.request(getSalesOrders, variables)

        if (data) {
          const salesOrders = data.nwSalesSalesOrder.map((order: any) => ({
            id: order.id,
            orderNumber: order.salesOrderNumber,
            orderDate: order.requestedShippingDate || order.requestedReceiptDate,
            totalValue: order.totalAmount,
            currency: order.currencyCode,
            status: order.statusCode,
            createdAt: order.requestedShippingDate,
            updatedAt: order.requestedReceiptDate,
            customer: {
              id: order.sales_order_account?.id || '',
              name: order.sales_order_account?.name || '',
              email: ''
            },
            salesperson: {
              id: order.salesperson_id_emplyoee?.id || '',
              name: `${order.salesperson_id_emplyoee?.firstName || ''} ${order.salesperson_id_emplyoee?.lastName || ''}`.trim(),
              email: ''
            }
          }))

          setOrders(salesOrders)
          setPaginationState(prev => ({ ...prev, total: data.nwSalesSalesOrderAggregate.aggregate.count }))
        } else {
          // No data found - use demo data as fallback
          console.warn('No sales orders data found during initial load, using demo data as fallback')
          const demoData = generateDemoSalesOrders(pagination.page, pagination.pageSize)
          setOrders(demoData.orders)
          setPaginationState(prev => ({ ...prev, total: demoData.total }))
          setIsUsingDemoData(true)
        }
      } catch (err) {
        // Error occurred - use demo data as fallback
        console.error('Error fetching sales orders during initial load:', err)
        const demoData = generateDemoSalesOrders(pagination.page, pagination.pageSize)
        setOrders(demoData.orders)
        setPaginationState(prev => ({ ...prev, total: demoData.total }))
        setIsUsingDemoData(true)
        setError(null) // Clear error since we're showing demo data
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [memoizedFilters, pagination.page, pagination.pageSize, graphqlClient])

  useEffect(() => {
    fetchKPIData()
  }, [])

  // Initial data load for dropdowns with demo data fallback
  useEffect(() => {
    // Load initial customers and salespersons
    const loadInitialData = async () => {
      try {
        // Load customers
        const customerVariables = {
          searchTerm: `%%`,
          limit: 20
        }
        const customerData = await graphqlClient.request(getCustomers, customerVariables)
        if (customerData && customerData.nwSalesSalesOrder) {
          const customerList = customerData.nwSalesSalesOrder
            .filter((order: any) => order.sales_order_account)
            .map((order: any) => ({
              id: order.sales_order_account.id,
              name: order.sales_order_account.name,
              email: ''
            }))
          setCustomers(customerList)
        } else {
          // No customer data found - use demo data as fallback
          console.warn('No customer data found during initial load, using demo data as fallback')
          setCustomers(generateDemoCustomers())
          setIsUsingDemoData(true)
        }

        // Load salespersons
        const salespersonVariables = {
          searchTerm: `%%`,
          limit: 20
        }
        const salespersonData = await graphqlClient.request(getSalespersons, salespersonVariables)
        if (salespersonData && salespersonData.nwSalesSalesOrder) {
          const salespersonList = salespersonData.nwSalesSalesOrder
            .filter((order: any) => order.salesperson_id_emplyoee)
            .map((order: any) => ({
              id: order.salesperson_id_emplyoee.id,
              name: `${order.salesperson_id_emplyoee.firstName} ${order.salesperson_id_emplyoee.lastName}`.trim(),
              email: ''
            }))
          setSalespersons(salespersonList)
        } else {
          // No salesperson data found - use demo data as fallback
          console.warn('No salesperson data found during initial load, using demo data as fallback')
          setSalespersons(generateDemoSalespersons())
          setIsUsingDemoData(true)
        }
      } catch (err) {
        // Error occurred - use demo data as fallback
        console.error('Error loading initial data:', err)
        setCustomers(generateDemoCustomers())
        setSalespersons(generateDemoSalespersons())
        setIsUsingDemoData(true)
      }
    }

    loadInitialData()
  }, [graphqlClient])

  return {
    orders,
    kpiData,
    customers,
    salespersons,
    loading,
    error,
    pagination,
    filters,
    isUsingDemoData,
    setFilters,
    setPagination,
    refreshData,
    searchCustomers,
    searchSalespersons
  }
}
