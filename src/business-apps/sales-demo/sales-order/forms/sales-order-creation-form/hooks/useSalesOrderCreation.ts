import { useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  getCustomersForCreation,
  getProducts,
  createSalesOrder,
  createSalesOrderItems,
  getNextSalesOrderNumber,
  convertQuoteToSalesOrder
} from '../queries/salesOrderCreationQueries'
import { Quote, Customer, Product, SalesOrderFormData, AIGenerationRequest, AIGenerationResponse } from '../types'

interface UseSalesOrderCreationProps {
  accessToken: string
}

// Mock data for quotes
const MOCK_QUOTES: Quote[] = [
  {
    id: '1',
    quoteNumber: 'QT-2024-001',
    quoteName: 'Office Equipment Package',
    customer: { id: 'c1', name: 'TechCorp Solutions' },
    totalAmount: 15750.0,
    currency: 'USD',
    createdDate: '2024-01-15',
    validUntil: '2024-02-15',
    status: 'Approved',
    items: [
      {
        id: 'qi1',
        lineNumber: 1,
        description: 'Ergonomic office chair with lumbar support',
        quantity: 5,
        unitPrice: 450.0,
        totalAmount: 2250.0,
        product: { id: 'p1', name: 'Office Chair Model X', code: 'OCX-001' }
      },
      {
        id: 'qi2',
        lineNumber: 2,
        description: 'Business laptop with extended warranty',
        quantity: 3,
        unitPrice: 1200.0,
        totalAmount: 3600.0,
        product: { id: 'p2', name: 'Laptop Dell Inspiron 15', code: 'DI15-001' }
      },
      {
        id: 'qi3',
        lineNumber: 3,
        description: 'Standing desk converter',
        quantity: 4,
        unitPrice: 350.0,
        totalAmount: 1400.0,
        product: { id: 'p3', name: 'Standing Desk Pro', code: 'SDP-001' }
      }
    ]
  },
  {
    id: '2',
    quoteNumber: 'QT-2024-002',
    quoteName: 'Software Licensing Package',
    customer: { id: 'c2', name: 'Global Manufacturing Inc' },
    totalAmount: 8500.0,
    currency: 'USD',
    createdDate: '2024-01-20',
    validUntil: '2024-03-20',
    status: 'Pending',
    items: [
      {
        id: 'qi4',
        lineNumber: 1,
        description: 'Enterprise software license - 50 users',
        quantity: 1,
        unitPrice: 5000.0,
        totalAmount: 5000.0,
        product: { id: 'p4', name: 'Enterprise Suite Pro', code: 'ESP-050' }
      },
      {
        id: 'qi5',
        lineNumber: 2,
        description: 'Annual support and maintenance',
        quantity: 1,
        unitPrice: 1500.0,
        totalAmount: 1500.0,
        product: { id: 'p5', name: 'Support Package Annual', code: 'SPA-001' }
      }
    ]
  },
  {
    id: '3',
    quoteNumber: 'QT-2024-003',
    quoteName: 'Marketing Materials Bundle',
    customer: { id: 'c3', name: 'Creative Agency Ltd' },
    totalAmount: 3200.0,
    currency: 'USD',
    createdDate: '2024-01-25',
    validUntil: '2024-02-25',
    status: 'Draft',
    items: [
      {
        id: 'qi6',
        lineNumber: 1,
        description: 'Professional brochure design and printing',
        quantity: 1000,
        unitPrice: 2.5,
        totalAmount: 2500.0,
        product: { id: 'p6', name: 'Brochure Design Package', code: 'BDP-001' }
      },
      {
        id: 'qi7',
        lineNumber: 2,
        description: 'Business card design and printing',
        quantity: 500,
        unitPrice: 1.4,
        totalAmount: 700.0,
        product: { id: 'p7', name: 'Business Card Premium', code: 'BCP-001' }
      }
    ]
  },
  {
    id: '4',
    quoteNumber: 'QT-2024-004',
    quoteName: 'Industrial Equipment Quote',
    customer: { id: 'c4', name: 'Heavy Industries Corp' },
    totalAmount: 45000.0,
    currency: 'USD',
    createdDate: '2024-02-01',
    validUntil: '2024-04-01',
    status: 'Approved',
    items: [
      {
        id: 'qi8',
        lineNumber: 1,
        description: 'Industrial conveyor system - 50ft',
        quantity: 1,
        unitPrice: 25000.0,
        totalAmount: 25000.0,
        product: { id: 'p8', name: 'Conveyor System Pro 50', code: 'CSP-050' }
      },
      {
        id: 'qi9',
        lineNumber: 2,
        description: 'Safety equipment package',
        quantity: 1,
        unitPrice: 8000.0,
        totalAmount: 8000.0,
        product: { id: 'p9', name: 'Safety Equipment Bundle', code: 'SEB-001' }
      },
      {
        id: 'qi10',
        lineNumber: 3,
        description: 'Installation and training services',
        quantity: 1,
        unitPrice: 12000.0,
        totalAmount: 12000.0,
        product: { id: 'p10', name: 'Installation Service Pro', code: 'ISP-001' }
      }
    ]
  },
  {
    id: '5',
    quoteNumber: 'QT-2024-005',
    quoteName: 'IT Infrastructure Upgrade',
    customer: { id: 'c5', name: 'Regional Bank Systems' },
    totalAmount: 28750.0,
    currency: 'USD',
    createdDate: '2024-02-05',
    validUntil: '2024-03-05',
    status: 'Expired',
    items: [
      {
        id: 'qi11',
        lineNumber: 1,
        description: 'Enterprise server rack system',
        quantity: 2,
        unitPrice: 8500.0,
        totalAmount: 17000.0,
        product: { id: 'p11', name: 'Server Rack Enterprise', code: 'SRE-001' }
      },
      {
        id: 'qi12',
        lineNumber: 2,
        description: 'Network security appliance',
        quantity: 1,
        unitPrice: 6500.0,
        totalAmount: 6500.0,
        product: { id: 'p12', name: 'Security Appliance Pro', code: 'SAP-001' }
      },
      {
        id: 'qi13',
        lineNumber: 3,
        description: 'Backup and disaster recovery solution',
        quantity: 1,
        unitPrice: 5250.0,
        totalAmount: 5250.0,
        product: { id: 'p13', name: 'Backup Solution Enterprise', code: 'BSE-001' }
      }
    ]
  }
]

export const useSalesOrderCreation = ({ accessToken }: UseSalesOrderCreationProps) => {
  const client = useGraphqlClient(accessToken)

  // Loading states
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  // Data states - initialize quotes with mock data
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Search for quotes - using mock data with filtering
  const searchQuotes = useCallback(async (searchTerm: string = '', limit: number = 20, offset: number = 0) => {
    setQuotesLoading(true)
    setError(null)

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))

      // Filter mock quotes based on search term
      let filteredQuotes = MOCK_QUOTES
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filteredQuotes = MOCK_QUOTES.filter(
          quote =>
            quote.quoteNumber.toLowerCase().includes(searchLower) ||
            quote.quoteName.toLowerCase().includes(searchLower) ||
            quote.customer.name.toLowerCase().includes(searchLower)
        )
      }

      // Apply pagination
      const paginatedQuotes = filteredQuotes.slice(offset, offset + limit)
      setQuotes(paginatedQuotes)
    } catch (err) {
      console.error('Error searching quotes:', err)
      setError('Failed to search quotes')
    } finally {
      setQuotesLoading(false)
    }
  }, [])

  // Search for customers using Account query
  const searchCustomers = useCallback(
    async (searchTerm: string = '', limit: number = 20, offset: number = 0) => {
      setCustomersLoading(true)
      setError(null)

      try {
        const variables = {
          search: searchTerm ? `%${searchTerm}%` : '%',
          limit,
          offset
        }

        const response = await client.request(getCustomersForCreation, variables)

        const transformedCustomers: Customer[] =
          response.Account?.map((account: any) => ({
            id: account.id,
            name: account.name,
            ownerEmployee: account.ownerEmployee
              ? {
                  displayName: account.ownerEmployee.displayName
                }
              : undefined
          })) || []

        setCustomers(transformedCustomers)
      } catch (err) {
        console.error('Error searching customers:', err)
        setError('Failed to search customers')
      } finally {
        setCustomersLoading(false)
      }
    },
    [client]
  )

  // Search for products
  const searchProducts = useCallback(
    async (searchTerm: string = '', limit: number = 20, offset: number = 0) => {
      setProductsLoading(true)
      setError(null)

      try {
        const variables = {
          searchTerm: searchTerm ? `%${searchTerm}%` : '%',
          limit,
          offset
        }

        const response = await client.request(getProducts, variables)

        const transformedProducts: Product[] =
          response.nwSalesProduct?.map((product: any) => ({
            id: product.id,
            name: product.name,
            productNumber: product.productNumber,
            description: product.description,
            price: product.price || 0,
            priceBase: product.priceBase,
            currentCost: product.currentCost || 0,
            currentCostBase: product.currentCostBase,
            supplierName: product.supplierName,
            // Legacy fields for backward compatibility
            code: product.productNumber,
            unitPrice: product.price || 0,
            currency: 'USD' // Default currency
          })) || []

        setProducts(transformedProducts)
      } catch (err) {
        console.error('Error searching products:', err)
        setError('Failed to search products')
      } finally {
        setProductsLoading(false)
      }
    },
    [client]
  )

  // Get quote details - using mock data
  const getQuoteDetailsById = useCallback(async (quoteId: string): Promise<Quote | null> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200))

      // Find quote in mock data
      const quote = MOCK_QUOTES.find(q => q.id === quoteId)
      return quote || null
    } catch (err) {
      console.error('Error getting quote details:', err)
      setError('Failed to get quote details')
      return null
    }
  }, [])

  // Generate sales order with AI
  const generateWithAI = useCallback(async (request: AIGenerationRequest): Promise<AIGenerationResponse> => {
    setGeneratingAI(true)
    setError(null)

    try {
      // This is a placeholder for AI generation
      // In a real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call

      // Mock AI response
      const mockResponse: AIGenerationResponse = {
        success: true,
        orderData: {
          customerId: '',
          orderDate: new Date().toISOString().split('T')[0],
          items: [
            {
              description: 'AI Generated Product',
              quantity: 1,
              unitPrice: 100,
              totalAmount: 100,
              lineNumber: 1
            }
          ],
          subtotal: 100,
          taxAmount: 20,
          totalAmount: 120,
          currency: 'EUR'
        },
        confidence: 0.85
      }

      return mockResponse
    } catch (err) {
      console.error('Error generating with AI:', err)
      return {
        success: false,
        error: 'Failed to generate sales order with AI'
      }
    } finally {
      setGeneratingAI(false)
    }
  }, [])

  // Create sales order
  const createOrder = useCallback(
    async (formData: SalesOrderFormData): Promise<string | null> => {
      setCreatingOrder(true)
      setError(null)

      try {
        // Generate sales order number
        const orderNumberResponse = await client.request(getNextSalesOrderNumber)
        const orderCount = orderNumberResponse.nwSalesSalesOrderAggregate?.aggregate?.count || 0
        const salesOrderNumber = `SO-${String(orderCount + 1).padStart(6, '0')}`

        // Prepare sales order input
        const salesOrderInput = {
          salesOrderNumber,
          accountId: formData.customerId,
          contactId: formData.contactId,
          orderDate: formData.orderDate,
          requestedShippingDate: formData.requestedShippingDate,
          requestedReceiptDate: formData.requestedReceiptDate,
          totalAmount: formData.totalAmount,
          currencyCode: formData.currency,
          statusCode: 'DRAFT',
          quotationNumber: formData.quotationNumber
        }

        // Create sales order
        const orderResponse = await client.request(createSalesOrder, { input: salesOrderInput })
        const orderId = orderResponse.insert_NwSalesSalesOrder_one?.id

        if (!orderId) {
          throw new Error('Failed to create sales order')
        }

        // Prepare sales order items
        const salesOrderItems = formData.items.map((item, index) => ({
          salesOrderId: orderId,
          lineItemNumber: index + 1,
          description: item.description,
          quantity: item.quantity,
          baseAmount: item.unitPrice,
          extendedAmount: item.totalAmount,
          productId: item.productId
        }))

        // Create sales order items
        await client.request(createSalesOrderItems, { items: salesOrderItems })

        return orderId
      } catch (err) {
        console.error('Error creating sales order:', err)
        setError('Failed to create sales order')
        return null
      } finally {
        setCreatingOrder(false)
      }
    },
    [client]
  )

  // Convert quote to sales order
  const convertQuote = useCallback(
    async (quote: Quote, formData: Partial<SalesOrderFormData>): Promise<string | null> => {
      setCreatingOrder(true)
      setError(null)

      try {
        // Generate sales order number
        const orderNumberResponse = await client.request(getNextSalesOrderNumber)
        const orderCount = orderNumberResponse.nwSalesSalesOrderAggregate?.aggregate?.count || 0
        const salesOrderNumber = `SO-${String(orderCount + 1).padStart(6, '0')}`

        // Prepare sales order input
        const salesOrderInput = {
          salesOrderNumber,
          accountId: quote.customer.id,
          orderDate: formData.orderDate || new Date().toISOString().split('T')[0],
          requestedShippingDate: formData.requestedShippingDate,
          requestedReceiptDate: formData.requestedReceiptDate,
          totalAmount: quote.totalAmount,
          currencyCode: quote.currency,
          statusCode: 'DRAFT',
          quotationNumber: quote.quoteNumber
        }

        // Prepare sales order items from quote
        const salesOrderItems = quote.items.map(item => ({
          lineItemNumber: item.lineNumber,
          description: item.description,
          quantity: item.quantity,
          baseAmount: item.unitPrice,
          extendedAmount: item.totalAmount,
          productId: item.product?.id,
          quoteDetailId: item.id
        }))

        // Convert quote to sales order
        const response = await client.request(convertQuoteToSalesOrder, {
          salesOrderInput,
          salesOrderItems,
          quoteId: quote.id
        })

        return response.insert_NwSalesSalesOrder_one?.id || null
      } catch (err) {
        console.error('Error converting quote to sales order:', err)
        setError('Failed to convert quote to sales order')
        return null
      } finally {
        setCreatingOrder(false)
      }
    },
    [client]
  )

  // Clear error function
  const clearError = useCallback(() => setError(null), [])

  return {
    // Data
    quotes,
    customers,
    products,

    // Loading states
    quotesLoading,
    customersLoading,
    productsLoading,
    creatingOrder,
    generatingAI,

    // Error state
    error,

    // Actions
    searchQuotes,
    searchCustomers,
    searchProducts,
    getQuoteDetailsById,
    generateWithAI,
    createOrder,
    convertQuote,
    clearError
  }
}
