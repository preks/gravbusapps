// GraphQL queries for Sales Order Creation Form

// Query to search for quotes (placeholder - assuming quotes exist in the system)
export const getQuotes = `
  query GetQuotes($searchTerm: String, $limit: Int!, $offset: Int!) {
    nwSalesQuote(
      where: {
        _or: [
          { quoteNumber: { _ilike: $searchTerm } }
          { quote_account: { name: { _ilike: $searchTerm } } }
        ]
        statusCode: { _neq: "CANCELLED" }
      }
      limit: $limit
      offset: $offset
      orderBy: { createdAt: DESC }
    ) {
      id
      quoteNumber
      totalAmount
      currencyCode
      createdAt
      validUntil
      statusCode
      quote_account {
        id
        name
      }
      quote_items {
        id
        lineNumber
        description
        quantity
        unitPrice
        totalAmount
        product {
          id
          name
          code
        }
      }
    }
  }
`

// Query to get accounts for customer selection with account manager info
export const getCustomersForCreation = `
  query GetAccounts($search: String, $limit: Int, $offset: Int) {
    Account(where: {name: {_ilike: $search}}, limit: $limit, offset: $offset) {
      id
      name
      ownerEmployee {
        displayName
      }
    }
  }
`

// Query to search for products
export const getProducts = `
  query GetProducts($searchTerm: String, $limit: Int, $offset: Int) {
    nwSalesProduct(
      where: {
        _or: [
          { name: { _ilike: $searchTerm } }
          { productNumber: { _ilike: $searchTerm } }
          { description: { _ilike: $searchTerm } }
        ]
      }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      productNumber
      price
      priceBase
      currentCost
      currentCostBase
      supplierName
    }
  }
`

// Query to get a specific quote with all details
export const getQuoteDetails = `
  query GetQuoteDetails($quoteId: uuid!) {
    nwSalesQuote(where: { id: { _eq: $quoteId } }) {
      id
      quoteNumber
      totalAmount
      currencyCode
      createdAt
      validUntil
      statusCode
      notes
      quote_account {
        id
        name
        contact {
          firstName
          lastName
          email
          phone
        }
        addresses {
          id
          addressType
          addressLine
          city
          postalCode
          regionRef
          country {
            value
            code
          }
        }
      }
      quote_items {
        id
        lineNumber
        description
        quantity
        unitPrice
        totalAmount
        product {
          id
          name
          code
          description
          unitPrice
          currencyCode
        }
      }
    }
  }
`

// Mutation to create a new sales order
export const createSalesOrder = `
  mutation CreateSalesOrder($input: NwSalesSalesOrderInsertInput!) {
    insert_NwSalesSalesOrder_one(object: $input) {
      id
      salesOrderNumber
      totalAmount
      currencyCode
      statusCode
      createdAt
    }
  }
`

// Mutation to create sales order items
export const createSalesOrderItems = `
  mutation CreateSalesOrderItems($items: [NwSalesSalesOrderItemInsertInput!]!) {
    insert_NwSalesSalesOrderItem(objects: $items) {
      affected_rows
      returning {
        salesOrderDetailId
        lineItemNumber
        description
        quantity
        baseAmount
        extendedAmount
      }
    }
  }
`

// Query to get the next sales order number
export const getNextSalesOrderNumber = `
  query GetNextSalesOrderNumber {
    nwSalesSalesOrderAggregate {
      aggregate {
        count
      }
    }
  }
`

// Query to validate customer exists
export const validateCustomer = `
  query ValidateCustomer($customerId: uuid!) {
    nwCrmAccount(where: { id: { _eq: $customerId } }) {
      id
      name
      isDeleted
    }
  }
`

// Query to validate product exists and get current price
export const validateProduct = `
  query ValidateProduct($productId: uuid!) {
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      name
      code
      unitPrice
      currencyCode
      isActive
      isDeleted
    }
  }
`

// Mutation to convert quote to sales order
export const convertQuoteToSalesOrder = `
  mutation ConvertQuoteToSalesOrder(
    $salesOrderInput: NwSalesSalesOrderInsertInput!
    $salesOrderItems: [NwSalesSalesOrderItemInsertInput!]!
    $quoteId: uuid!
  ) {
    # Create the sales order
    insert_NwSalesSalesOrder_one(object: $salesOrderInput) {
      id
      salesOrderNumber
      totalAmount
      currencyCode
      statusCode
      createdAt
    }
    
    # Create the sales order items
    insert_NwSalesSalesOrderItem(objects: $salesOrderItems) {
      affected_rows
      returning {
        salesOrderDetailId
        lineItemNumber
        description
        quantity
        baseAmount
        extendedAmount
      }
    }
    
    # Update quote status to converted
    update_NwSalesQuote(
      where: { id: { _eq: $quoteId } }
      _set: { statusCode: "CONVERTED" }
    ) {
      affected_rows
    }
  }
`
