import { useState, useEffect, useCallback } from 'react'
import { DetailedSalesOrder, SalesOrderItem } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getSalesOrderDetails, getSalesOrderItems } from '../queries/salesOrderDetailsQueries'
import { generateDemoSalesOrder } from './demoData'

interface UseSalesOrderDetailsProps {
  accessToken: string
  orderId: string
}

interface UseSalesOrderDetailsReturn {
  // Data
  order: DetailedSalesOrder | null

  // State
  loading: boolean
  error: Error | null
  isUsingDemoData: boolean

  // Actions
  refreshData: () => void
}

export const useSalesOrderDetails = ({
  accessToken,
  orderId
}: UseSalesOrderDetailsProps): UseSalesOrderDetailsReturn => {
  // GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // State
  const [order, setOrder] = useState<DetailedSalesOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isUsingDemoData, setIsUsingDemoData] = useState(false)

  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Fetch sales order details and items
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return

    setLoading(true)
    setError(null)
    setIsUsingDemoData(false)

    try {
      // Fetch order details
      const orderData = await graphqlClient.request(getSalesOrderDetails, { orderId })

      // Fetch order items
      const itemsData = await graphqlClient.request(getSalesOrderItems, { orderId })

      if (orderData?.nwSalesSalesOrder?.[0]) {
        const orderInfo = orderData.nwSalesSalesOrder[0]
        const items = itemsData?.nwSalesSalesOrderItem || []

        // Transform order data
        const transformedOrder: DetailedSalesOrder = {
          id: orderInfo.id,
          orderNumber: orderInfo.salesOrderNumber,
          orderDate: orderInfo.orderDate || orderInfo.requestedShippingDate || orderInfo.requestedReceiptDate,
          requestedShippingDate: orderInfo.requestedShippingDate,
          requestedReceiptDate: orderInfo.requestedReceiptDate,
          totalAmount: orderInfo.totalAmount,
          currency: orderInfo.currencyCode,
          status: orderInfo.statusCode,
          statusCode: orderInfo.statusCode,
          processingStatus: orderInfo.processingStatus,
          // Additional order metadata
          areTotalsUpdated: orderInfo.areTotalsUpdated,
          version: orderInfo.version,
          recordState: orderInfo.recordState,
          isDeleted: orderInfo.isDeleted,
          processInstanceId: orderInfo.processInstanceId,
          // Financial details
          totalTaxAmount: orderInfo.totalTaxAmount,
          totalDiscountAmount: orderInfo.totalDiscountAmount,
          totalChargesAmount: orderInfo.totalChargesAmount,
          // Delivery information
          deliveryModeCode: orderInfo.deliveryModeCode,
          deliveryTermsCode: orderInfo.deliveryTermsCode,
          isDeliveryAddressOrderSpecific: orderInfo.isDeliveryAddressOrderSpecific,
          deliveryAddressStreet: orderInfo.deliveryAddressStreet,
          invoiceAddressStreet: orderInfo.invoiceAddressStreet,
          // References
          quotationNumber: orderInfo.quotationNumber,
          url: orderInfo.url,
          paymentTermsName: orderInfo.paymentTermsName,
          // IDs
          accountId: orderInfo.sales_order_account?.id,
          contactId: orderInfo.contactId,
          ownerId: orderInfo.ownerId,
          salespersonId: orderInfo.salespersonId,
          customer: {
            id: orderInfo.sales_order_account?.id || '',
            name: orderInfo.sales_order_account?.name || '',
            email: orderInfo.sales_order_account?.contact?.email || '',
            contactName: orderInfo.sales_order_account?.contact
              ? `${orderInfo.sales_order_account.contact.firstName || ''} ${orderInfo.sales_order_account.contact.lastName || ''}`.trim()
              : '',
            billingAddress: orderInfo.sales_order_account?.addresses?.[0]
              ? {
                  line1: orderInfo.sales_order_account.addresses[0].addressLine,
                  city: orderInfo.sales_order_account.addresses[0].city,
                  stateOrProvince: orderInfo.sales_order_account.addresses[0].regionRef, // Map regionRef to stateOrProvince for backward compatibility
                  postalCode: orderInfo.sales_order_account.addresses[0].postalCode,
                  country: orderInfo.sales_order_account.addresses[0].country?.value
                }
              : undefined
          },
          salesperson: {
            id: orderInfo.salesperson_id_emplyoee?.id || '',
            name:
              orderInfo.salesperson_id_emplyoee?.displayName ||
              `${orderInfo.salesperson_id_emplyoee?.firstName || ''} ${orderInfo.salesperson_id_emplyoee?.lastName || ''}`.trim(),
            firstName: orderInfo.salesperson_id_emplyoee?.firstName,
            lastName: orderInfo.salesperson_id_emplyoee?.lastName
          },
          items: items.map(
            (item: any): SalesOrderItem => ({
              id: item.salesOrderDetailId,
              lineItemNumber: item.lineItemNumber,
              description: item.description,
              quantity: item.quantity,
              quantityShipped: item.quantityShipped,
              quantityBackordered: item.quantityBackordered,
              quantityCancelled: item.quantityCancelled,
              pricePerUnit: item.product?.price || 0,
              unitPrice: item.product?.price || 0, // Keep for backward compatibility
              baseAmount: item.baseAmount,
              extendedAmount: item.extendedAmount,
              // Status field
              status: item.salesOrderStateCode,
              // Comment fields
              taxAmount: item.taxAmount,
              type: item.type,
              commentShort: item.commentShort,
              commentLong: item.commentLong,
              // Product information - FIXED: Now properly mapped!
              productId: item.productId,
              product: item.product
                ? {
                    id: item.product.id,
                    name: item.product.name,
                    code: item.product.productNumber, // Map productNumber to code for backward compatibility
                    description: item.product.description,
                    unitPrice: item.product.price,
                    currencyCode: 'EUR' // Default currency since not available in product
                  }
                : undefined,
              salesRep: undefined,
              shipToAddress: {
                name: item.shipToName,
                contactName: item.shipToContactName,
                line1: item.shipToLine1,
                line2: item.shipToLine2,
                line3: item.shipToLine3,
                city: item.shipToCity,
                stateOrProvince: item.shipToStateOrProvince,
                postalCode: item.shipToPostalCode,
                country: item.shipToCountry,
                telephone: item.shipToTelephone
              },
              sequenceNumber: item.sequenceNumber,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            })
          ),
          createdAt: orderInfo.createdAt,
          updatedAt: orderInfo.updatedAt,
          updatedBy: orderInfo.updatedBy
            ? {
                id: orderInfo.updatedBy,
                name: orderInfo.updatedBy
              }
            : undefined,
          // Contact information (when available)
          contact: orderInfo.contact
            ? {
                id: orderInfo.contact.id,
                firstName: orderInfo.contact.firstName,
                lastName: orderInfo.contact.lastName,
                jobTitle: orderInfo.contact.jobTitle,
                phone: orderInfo.contact.phone,
                accountId: orderInfo.contact.accountId,
                accountName: orderInfo.contact.account?.name
              }
            : undefined,
          // Owner information
          owner: orderInfo.owner
            ? {
                fullName: orderInfo.owner.fullName,
                firstName: orderInfo.owner.firstName,
                lastName: orderInfo.owner.lastName
              }
            : undefined
        }

        setOrder(transformedOrder)
      } else {
        // No order found - use demo data as fallback
        console.warn('Sales order not found, using demo data as fallback')
        const demoOrder = generateDemoSalesOrder(orderId)
        setOrder(demoOrder)
        setIsUsingDemoData(true)
      }
    } catch (err) {
      // Error occurred - use demo data as fallback
      console.error('Error fetching sales order data:', err)
      const demoOrder = generateDemoSalesOrder(orderId)
      setOrder(demoOrder)
      setIsUsingDemoData(true)
      setError(null) // Clear error since we're showing demo data
    } finally {
      setLoading(false)
    }
  }, [graphqlClient, orderId])

  // Refresh data function
  const refreshData = useCallback(() => {
    fetchOrderDetails()
  }, [fetchOrderDetails])

  // Effect to fetch data when orderId changes
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId, fetchOrderDetails])

  return {
    order,
    loading,
    error,
    isUsingDemoData,
    refreshData
  }
}
