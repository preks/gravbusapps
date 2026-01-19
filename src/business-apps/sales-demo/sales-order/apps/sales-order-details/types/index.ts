// TypeScript interfaces for Sales Order Details

export interface SalesOrderItem {
  id: string
  salesOrderId?: string
  productId?: string
  lineItemNumber: number
  description: string
  quantity: number
  quantityShipped?: number
  quantityBackordered?: number
  quantityCancelled?: number
  // Fixed field name to match database schema
  pricePerUnit: number
  unitPrice?: number // Keep for backward compatibility
  manualDiscountAmount?: number
  taxAmount?: number
  baseAmount: number
  extendedAmount: number
  status?: string // Line item status
  // Comment line item fields
  type?: 'product' | 'comment' // Line item type
  commentShort?: string // Short comment text
  commentLong?: string // Long comment text
  // Additional CDM fields
  isPriceOverridden?: boolean
  isProductOverridden?: boolean
  requestDeliveryBy?: string
  parentBundleId?: string
  productAssociationId?: string
  productTypeCode?: string
  pricingErrorCode?: string
  salesRepId?: string
  shipToAddressId?: string
  shipToFreightTermsCode?: string
  isCopied?: boolean
  quoteDetailId?: string
  salesOrderIsPriceLocked?: boolean
  salesOrderStateCode?: string
  propertyConfigurationStatus?: string
  // Audit fields
  createdOnBehalfBy?: string
  modifiedOnBehalfBy?: string
  overriddenCreatedOn?: string
  importSequenceNumber?: number
  ownerId?: string
  ownerIdType?: string
  owningBusinessUnit?: string
  owningUser?: string
  owningTeam?: string
  timeZoneRuleVersionNumber?: number
  utcConversionTimeZoneCode?: number
  versionNumber?: number
  product?: {
    id: string
    name: string
    code?: string
  }
  salesRep?: {
    id: string
    firstName?: string
    lastName?: string
  }
  shipToAddress?: {
    id?: string
    name?: string
    contactName?: string
    line1?: string
    line2?: string
    line3?: string
    city?: string
    stateOrProvince?: string
    postalCode?: string
    country?: string
    telephone?: string
    freightTermsCode?: string
    // Address entity fields
    street?: string
    zipCode?: string
    countryRef?: string
  }
  transactionCurrencyId?: string
  currencyCode?: string // Keep for backward compatibility
  exchangeRate?: number
  sequenceNumber?: number
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  version?: number
  isDeleted?: boolean
  recordState?: string
  processInstanceId?: string
  additionalProperties?: any
}

export interface DetailedSalesOrder {
  id: string
  orderNumber: string
  orderDate: string
  requestedShippingDate?: string
  requestedReceiptDate?: string
  totalAmount: number
  currency: string
  status: string
  statusCode: string
  processingStatus?: string
  description?: string
  // Additional CDM fields from database schema
  accountId?: string
  contactId?: string
  ownerId?: string
  salespersonId?: string
  totalDiscountAmount?: number
  totalTaxAmount?: number
  totalChargesAmount?: number
  deliveryModeCode?: string
  deliveryTermsCode?: string
  invoiceAddressStreet?: string
  deliveryAddressStreet?: string
  paymentTermsName?: string
  quotationNumber?: string
  url?: string
  isDeliveryAddressOrderSpecific?: boolean
  areTotalsUpdated?: boolean
  customer: {
    id: string
    name: string
    email?: string
    contactName?: string
    billingAddress?: {
      line1?: string
      line2?: string
      line3?: string
      city?: string
      stateOrProvince?: string
      postalCode?: string
      country?: string
    }
  }
  salesperson: {
    id: string
    name: string
    firstName?: string
    lastName?: string
  }
  items: SalesOrderItem[]
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
  }
  updatedBy?: {
    id: string
    name: string
  }
  // Contact information (when available)
  contact?: {
    id: string
    firstName?: string
    lastName?: string
    jobTitle?: string
    phone?: string
    accountId?: string
    accountName?: string
  }
  // Owner information
  owner?: {
    fullName?: string
    firstName?: string
    lastName?: string
  }
  // Additional order-level fields (keeping for backward compatibility)
  paymentTerms?: string
  shippingMethod?: string
  discountAmount?: number
  taxAmount?: number
  freightAmount?: number
  totalLineItemAmount?: number
}

export interface SalesOrderDetailsFilters {
  orderId: string
}

export interface SalesOrderDetailsResponse {
  order: DetailedSalesOrder | null
  loading: boolean
  error: Error | null
}
