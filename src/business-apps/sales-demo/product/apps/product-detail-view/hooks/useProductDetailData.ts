import { useState, useEffect, useCallback } from 'react'
import {
  DetailedProduct,
  ProductKPIData,
  ProductInventoryLocation,
  ProductPriceHistory,
  ProductSalesMetrics,
  ProductSupplierInfo,
  ProductDocument,
  ProductStockMovement
} from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  getProductDetails,
  getProductKPIs,
  getProductInventoryLocations,
  getProductPriceHistory,
  getProductSalesMetrics,
  getProductSuppliers,
  getProductDocuments,
  getProductStockMovements
} from '../queries/productDetailQuery'
import {
  generateDemoProductDetail,
  generateDemoProductKPIs,
  generateDemoInventoryLocations,
  generateDemoPriceHistory,
  generateDemoSalesMetrics,
  generateDemoSupplierInfo,
  generateDemoDocuments,
  generateDemoStockMovements
} from './demoProductDetailData'

interface UseProductDetailDataProps {
  accessToken: string
  productId: string
}

interface UseProductDetailDataReturn {
  // Data
  product: DetailedProduct | null
  kpiData: ProductKPIData | null
  inventoryLocations: ProductInventoryLocation[]
  priceHistory: ProductPriceHistory[]
  salesMetrics: ProductSalesMetrics | null
  suppliers: ProductSupplierInfo[]
  documents: ProductDocument[]
  stockMovements: ProductStockMovement[]

  // State
  loading: boolean
  error: Error | null
  isUsingDemoData: boolean

  // Actions
  refreshData: () => void
}

export const useProductDetailData = ({
  accessToken,
  productId
}: UseProductDetailDataProps): UseProductDetailDataReturn => {
  // GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // State
  const [product, setProduct] = useState<DetailedProduct | null>(null)
  const [kpiData, setKpiData] = useState<ProductKPIData | null>(null)
  const [inventoryLocations, setInventoryLocations] = useState<ProductInventoryLocation[]>([])
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>([])
  const [salesMetrics, setSalesMetrics] = useState<ProductSalesMetrics | null>(null)
  const [suppliers, setSuppliers] = useState<ProductSupplierInfo[]>([])
  const [documents, setDocuments] = useState<ProductDocument[]>([])
  const [stockMovements, setStockMovements] = useState<ProductStockMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isUsingDemoData, setIsUsingDemoData] = useState(false)

  // Fetch product details
  const fetchProductDetails = useCallback(async () => {
    if (!productId) return

    setLoading(true)
    setError(null)
    setIsUsingDemoData(false)

    try {
      // Fetch main product details
      const productData = await graphqlClient.request(getProductDetails, { productId })

      if (productData?.nwSalesProduct?.[0]) {
        const productInfo = productData.nwSalesProduct[0]

        // Transform the data to match our interface
        const transformedProduct: DetailedProduct = {
          id: productInfo.id,
          name: productInfo.name,
          productNumber: productInfo.productNumber,
          description: productInfo.description,
          productUrl: productInfo.productUrl,
          productTypeCode: productInfo.productTypeCode,
          productStructure: productInfo.productStructure,
          isKit: productInfo.isKit,
          isStockItem: productInfo.isStockItem,
          parentProductId: productInfo.parentProductId,
          hierarchyPath: productInfo.hierarchyPath,
          vendorId: productInfo.vendorId,
          vendorName: productInfo.vendorName,
          vendorPartNumber: productInfo.vendorPartNumber,
          supplierName: productInfo.supplierName,
          price: productInfo.price || 0,
          priceBase: productInfo.priceBase,
          standardCost: productInfo.standardCost,
          standardCostBase: productInfo.standardCostBase,
          currentCost: productInfo.currentCost,
          currentCostBase: productInfo.currentCostBase,
          exchangeRate: productInfo.exchangeRate,
          currencyId: productInfo.currencyId,
          currency: 'EUR', // Default currency
          defaultUomId: productInfo.defaultUomId,
          defaultUomScheduleId: productInfo.defaultUomScheduleId,
          quantityOnHand: productInfo.quantityOnHand,
          quantityDecimal: productInfo.quantityDecimal,
          stockVolume: productInfo.stockVolume,
          stockWeight: productInfo.stockWeight,
          size: productInfo.size,
          validFromDate: productInfo.validFromDate,
          validToDate: productInfo.validToDate,
          subjectId: productInfo.subjectId,
          priceLevelId: productInfo.priceLevelId,
          stateCode: productInfo.stateCode,
          statusCode: productInfo.statusCode,
          createdBy: productInfo.createdBy,
          updatedBy: productInfo.updatedBy,
          createdAt: productInfo.createdAt || new Date().toISOString(),
          updatedAt: productInfo.updatedAt || new Date().toISOString(),
          version: productInfo.version,
          isDeleted: productInfo.isDeleted,
          recordState: productInfo.recordState,
          processInstanceId: productInfo.processInstanceId,
          additionalProperties: productInfo.additionalProperties
        }

        setProduct(transformedProduct)

        // Fetch additional data in parallel
        await Promise.all([
          fetchKPIData(),
          fetchInventoryLocations(),
          fetchPriceHistory(),
          fetchSalesMetrics(),
          fetchSuppliers(),
          fetchDocuments(),
          fetchStockMovements()
        ])
      } else {
        throw new Error('Product not found')
      }
    } catch (err) {
      console.error('Error fetching product details:', err)
      setError(err as Error)
      setIsUsingDemoData(true)

      // Use demo data
      setProduct(generateDemoProductDetail(productId))
      setKpiData(generateDemoProductKPIs(productId))
      setInventoryLocations(generateDemoInventoryLocations(productId))
      setPriceHistory(generateDemoPriceHistory(productId))
      setSalesMetrics(generateDemoSalesMetrics(productId))
      setSuppliers(generateDemoSupplierInfo(productId))
      setDocuments(generateDemoDocuments(productId))
      setStockMovements(generateDemoStockMovements(productId))
    } finally {
      setLoading(false)
    }
  }, [graphqlClient, productId])

  // Fetch KPI data
  const fetchKPIData = useCallback(async () => {
    try {
      const kpiResult = await graphqlClient.request(getProductKPIs, { productId })

      if (kpiResult) {
        // Transform KPI data
        const kpis: ProductKPIData = {
          currentStock: {
            value: kpiResult.product?.[0]?.quantityOnHand || 0,
            trend: 5.2, // Mock trend calculation
            status: 'Normal'
          },
          monthlyRevenue: {
            value: 45750.0, // Mock calculation from sales data
            trend: 12.8,
            currency: 'EUR'
          },
          averageMargin: {
            value: 49.8, // Mock margin calculation
            trend: 2.1
          },
          salesVelocity: {
            value: 8.5, // Mock velocity calculation
            trend: 15.3,
            unit: 'units/month'
          }
        }

        setKpiData(kpis)
      }
    } catch (err) {
      console.error('Error fetching KPI data:', err)
      // Use demo data on error
      setKpiData(generateDemoProductKPIs(productId))
    }
  }, [graphqlClient, productId])

  // Fetch inventory locations
  const fetchInventoryLocations = useCallback(async () => {
    try {
      await graphqlClient.request(getProductInventoryLocations, { productId })
      // For now, use demo data as the real schema doesn't have inventory locations
      setInventoryLocations(generateDemoInventoryLocations(productId))
    } catch (err) {
      console.error('Error fetching inventory locations:', err)
      setInventoryLocations(generateDemoInventoryLocations(productId))
    }
  }, [graphqlClient, productId])

  // Fetch price history
  const fetchPriceHistory = useCallback(async () => {
    try {
      await graphqlClient.request(getProductPriceHistory, { productId })
      // For now, use demo data as the real schema doesn't have price history
      setPriceHistory(generateDemoPriceHistory(productId))
    } catch (err) {
      console.error('Error fetching price history:', err)
      setPriceHistory(generateDemoPriceHistory(productId))
    }
  }, [graphqlClient, productId])

  // Fetch sales metrics
  const fetchSalesMetrics = useCallback(async () => {
    try {
      const salesData = await graphqlClient.request(getProductSalesMetrics, { productId })

      if (salesData?.nwSalesSalesOrderItem) {
        // Transform sales data to metrics
        const items = salesData.nwSalesSalesOrderItem
        const totalRevenue = items.reduce((sum: number, item: any) => sum + (item.extendedAmount || 0), 0)
        const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)

        const metrics: ProductSalesMetrics = {
          totalRevenue,
          totalQuantitySold: totalQuantity,
          averageOrderValue: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
          topCustomers: [], // Would need to aggregate by customer
          salesTrend: [] // Would need to group by time period
        }

        setSalesMetrics(metrics)
      } else {
        setSalesMetrics(generateDemoSalesMetrics(productId))
      }
    } catch (err) {
      console.error('Error fetching sales metrics:', err)
      setSalesMetrics(generateDemoSalesMetrics(productId))
    }
  }, [graphqlClient, productId])

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      await graphqlClient.request(getProductSuppliers, { productId })
      // For now, use demo data as the real schema doesn't have detailed supplier info
      setSuppliers(generateDemoSupplierInfo(productId))
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setSuppliers(generateDemoSupplierInfo(productId))
    }
  }, [graphqlClient, productId])

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      await graphqlClient.request(getProductDocuments, { productId })
      // For now, use demo data as the real schema doesn't have documents
      setDocuments(generateDemoDocuments(productId))
    } catch (err) {
      console.error('Error fetching documents:', err)
      setDocuments(generateDemoDocuments(productId))
    }
  }, [graphqlClient, productId])

  // Fetch stock movements
  const fetchStockMovements = useCallback(async () => {
    try {
      await graphqlClient.request(getProductStockMovements, { productId })
      // For now, use demo data as the real schema doesn't have stock movements
      setStockMovements(generateDemoStockMovements(productId))
    } catch (err) {
      console.error('Error fetching stock movements:', err)
      setStockMovements(generateDemoStockMovements(productId))
    }
  }, [graphqlClient, productId])

  // Refresh data function
  const refreshData = useCallback(() => {
    fetchProductDetails()
  }, [fetchProductDetails])

  // Effect to fetch data when productId changes
  useEffect(() => {
    if (productId && accessToken) {
      fetchProductDetails()
    }
  }, [productId, accessToken, fetchProductDetails])

  return {
    product,
    kpiData,
    inventoryLocations,
    priceHistory,
    salesMetrics,
    suppliers,
    documents,
    stockMovements,
    loading,
    error,
    isUsingDemoData,
    refreshData
  }
}
