import { DetailedSalesOrder, SalesOrderItem } from '../types'

/**
 * Generates realistic demo data for sales order details
 * This data structure matches the expected GraphQL response format
 */
export const generateDemoSalesOrder = (orderId: string): DetailedSalesOrder => {
  const demoLineItems: SalesOrderItem[] = [
    {
      id: 'demo-item-1',
      salesOrderId: orderId,
      productId: 'prod-001',
      lineItemNumber: 1,
      description: 'Professional Laptop - Dell XPS 13',
      quantity: 2,
      quantityShipped: 0,
      quantityBackordered: 0,
      quantityCancelled: 0,
      pricePerUnit: 1299.99,
      unitPrice: 1299.99,
      manualDiscountAmount: 0,
      taxAmount: 207.99,
      baseAmount: 2599.98,
      extendedAmount: 2599.98,
      status: 'Pending',
      type: 'product',
      product: {
        id: 'prod-001',
        name: 'Dell XPS 13 Professional Laptop',
        code: 'DELL-XPS13-PRO'
      },
      shipToAddress: {
        name: 'Acme Corporation HQ',
        contactName: 'John Smith',
        line1: '123 Business Ave',
        line2: 'Suite 100',
        city: 'New York',
        stateOrProvince: 'NY',
        postalCode: '10001',
        country: 'United States',
        telephone: '+1-555-0123'
      },
      sequenceNumber: 1,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: 'demo-item-2',
      salesOrderId: orderId,
      productId: 'prod-002',
      lineItemNumber: 2,
      description: 'Wireless Mouse - Logitech MX Master 3',
      quantity: 2,
      quantityShipped: 0,
      quantityBackordered: 0,
      quantityCancelled: 0,
      pricePerUnit: 99.99,
      unitPrice: 99.99,
      manualDiscountAmount: 10.0,
      taxAmount: 14.4,
      baseAmount: 199.98,
      extendedAmount: 189.98,
      status: 'Pending',
      type: 'product',
      product: {
        id: 'prod-002',
        name: 'Logitech MX Master 3 Wireless Mouse',
        code: 'LOG-MX3-MOUSE'
      },
      shipToAddress: {
        name: 'Acme Corporation HQ',
        contactName: 'John Smith',
        line1: '123 Business Ave',
        line2: 'Suite 100',
        city: 'New York',
        stateOrProvince: 'NY',
        postalCode: '10001',
        country: 'United States',
        telephone: '+1-555-0123'
      },
      sequenceNumber: 2,
      createdAt: '2024-01-15T10:35:00Z',
      updatedAt: '2024-01-15T10:35:00Z'
    },
    {
      id: 'demo-comment-1',
      salesOrderId: orderId,
      lineItemNumber: 3,
      description: 'Special delivery instructions',
      quantity: 0,
      pricePerUnit: 0,
      unitPrice: 0,
      taxAmount: 0,
      baseAmount: 0,
      extendedAmount: 0,
      status: 'Active',
      type: 'comment',
      commentShort: 'Special Delivery Instructions',
      commentLong:
        'Please deliver to the main reception desk during business hours (9 AM - 5 PM). Contact John Smith at extension 1234 upon arrival.',
      sequenceNumber: 3,
      createdAt: '2024-01-15T10:40:00Z',
      updatedAt: '2024-01-15T10:40:00Z'
    },
    {
      id: 'demo-item-3',
      salesOrderId: orderId,
      productId: 'prod-003',
      lineItemNumber: 4,
      description: 'USB-C Docking Station',
      quantity: 1,
      quantityShipped: 0,
      quantityBackordered: 0,
      quantityCancelled: 0,
      pricePerUnit: 249.99,
      unitPrice: 249.99,
      manualDiscountAmount: 25.0,
      taxAmount: 18.0,
      baseAmount: 249.99,
      extendedAmount: 224.99,
      status: 'Pending',
      type: 'product',
      product: {
        id: 'prod-003',
        name: 'CalDigit TS3 Plus USB-C Dock',
        code: 'CAL-TS3-DOCK'
      },
      shipToAddress: {
        name: 'Acme Corporation HQ',
        contactName: 'John Smith',
        line1: '123 Business Ave',
        line2: 'Suite 100',
        city: 'New York',
        stateOrProvince: 'NY',
        postalCode: '10001',
        country: 'United States',
        telephone: '+1-555-0123'
      },
      sequenceNumber: 4,
      createdAt: '2024-01-15T10:45:00Z',
      updatedAt: '2024-01-15T10:45:00Z'
    }
  ]

  const totalAmount = demoLineItems
    .filter(item => item.type !== 'comment')
    .reduce((sum, item) => sum + item.extendedAmount, 0)

  const totalTaxAmount = demoLineItems
    .filter(item => item.type !== 'comment')
    .reduce((sum, item) => sum + (item.taxAmount || 0), 0)

  const totalDiscountAmount = demoLineItems
    .filter(item => item.type !== 'comment')
    .reduce((sum, item) => sum + (item.manualDiscountAmount || 0), 0)

  return {
    id: orderId,
    orderNumber: 'SO-2024-001234',
    orderDate: '2024-01-15T09:00:00Z',
    requestedShippingDate: '2024-01-20T00:00:00Z',
    requestedReceiptDate: '2024-01-22T00:00:00Z',
    totalAmount: totalAmount + totalTaxAmount,
    currency: 'EUR',
    status: 'Pending',
    statusCode: 'PENDING',
    processingStatus: 'In Review',
    description: 'Office equipment order for Q1 2024',
    // Additional CDM fields
    accountId: 'acc-demo-001',
    contactId: 'contact-demo-001',
    ownerId: 'owner-demo-001',
    salespersonId: 'sales-demo-001',
    totalDiscountAmount,
    totalTaxAmount,
    totalChargesAmount: 0,
    deliveryModeCode: 'STANDARD',
    deliveryTermsCode: 'FOB',
    invoiceAddressStreet: '123 Business Ave, Suite 100, New York, NY 10001',
    deliveryAddressStreet: '123 Business Ave, Suite 100, New York, NY 10001',
    paymentTermsName: 'Net 30',
    quotationNumber: 'QT-2024-000567',
    url: 'https://demo.salesorder.com/SO-2024-001234',
    isDeliveryAddressOrderSpecific: false,
    areTotalsUpdated: true,
    customer: {
      id: 'acc-demo-001',
      name: 'Acme Corporation',
      email: 'orders@acmecorp.com',
      contactName: 'John Smith',
      billingAddress: {
        line1: '123 Business Ave',
        line2: 'Suite 100',
        line3: '',
        city: 'New York',
        stateOrProvince: 'NY',
        postalCode: '10001',
        country: 'United States'
      }
    },
    salesperson: {
      id: 'sales-demo-001',
      name: 'Sarah Johnson',
      firstName: 'Sarah',
      lastName: 'Johnson'
    },
    items: demoLineItems,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    createdBy: {
      id: 'user-demo-001',
      name: 'Demo User'
    },
    updatedBy: {
      id: 'user-demo-002',
      name: 'System Admin'
    },
    contact: {
      id: 'contact-demo-001',
      firstName: 'John',
      lastName: 'Smith',
      jobTitle: 'Procurement Manager',
      phone: '+1-555-0123',
      accountId: 'acc-demo-001',
      accountName: 'Acme Corporation'
    },
    owner: {
      fullName: 'Sarah Johnson',
      firstName: 'Sarah',
      lastName: 'Johnson'
    },
    // Additional order-level fields
    paymentTerms: 'Net 30',
    shippingMethod: 'Standard Shipping',
    discountAmount: totalDiscountAmount,
    taxAmount: totalTaxAmount,
    freightAmount: 0,
    totalLineItemAmount: totalAmount
  }
}
