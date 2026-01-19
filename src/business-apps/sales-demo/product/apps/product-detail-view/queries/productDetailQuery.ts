// GraphQL queries for Product Detail View

export const getProductDetails = `
  query GetProductDetails($productId: uuid!) {
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      name
      productNumber
      description
      productUrl
      productTypeCode
      productStructure
      isKit
      isStockItem
      parentProductId
      hierarchyPath
      vendorId
      vendorName
      vendorPartNumber
      supplierName
      price
      priceBase
      standardCost
      standardCostBase
      currentCost
      currentCostBase
      exchangeRate
      currencyId
      defaultUomId
      defaultUomScheduleId
      quantityOnHand
      quantityDecimal
      stockVolume
      stockWeight
      size
      validFromDate
      validToDate
      subjectId
      priceLevelId
      stateCode
      statusCode
      createdBy
      updatedBy
      createdAt
      updatedAt
      version
      isDeleted
      recordState
      processInstanceId
      additionalProperties
    }
  }
`

export const getProductInventoryLocations = `
  query GetProductInventoryLocations($productId: uuid!) {
    # This would be a separate inventory table in a real system
    # For now, we'll simulate this in demo data
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      quantityOnHand
    }
  }
`

export const getProductPriceHistory = `
  query GetProductPriceHistory($productId: uuid!, $limit: Int = 20) {
    # This would be a separate price history table in a real system
    # For now, we'll simulate this in demo data
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      price
      priceBase
      currentCost
      currentCostBase
    }
  }
`

export const getProductSalesMetrics = `
  query GetProductSalesMetrics($productId: uuid!) {
    # This would join with sales order items table
    nwSalesSalesOrderItem(
      where: { productId: { _eq: $productId } }
      limit: 100
    ) {
      id
      quantity
      baseAmount
      extendedAmount
      createdAt
      salesOrder {
        id
        salesOrderNumber
        orderDate
        sales_order_account {
          id
          name
        }
      }
    }
  }
`

export const getProductSuppliers = `
  query GetProductSuppliers($productId: uuid!) {
    # This would be a separate supplier-product relationship table
    # For now, we'll use the main product supplier info
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      supplierName
      vendorName
      vendorPartNumber
    }
  }
`

export const getProductDocuments = `
  query GetProductDocuments($productId: uuid!) {
    # This would be a separate product documents table
    # For now, we'll simulate this in demo data
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      name
      description
    }
  }
`

export const getRelatedProducts = `
  query GetRelatedProducts($productId: uuid!, $limit: Int = 10) {
    # Get products in the same category or with similar attributes
    nwSalesProduct(
      where: {
        _and: [
          { id: { _neq: $productId } }
          { isDeleted: { _eq: false } }
          { stateCode: { _eq: "Active" } }
        ]
      }
      limit: $limit
      orderBy: { name: ASC }
    ) {
      id
      name
      productNumber
      productTypeCode
      price
      priceBase
    }
  }
`

export const getProductStockMovements = `
  query GetProductStockMovements($productId: uuid!, $limit: Int = 50) {
    # This would be a separate stock movements table
    # For now, we'll simulate this in demo data
    nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      quantityOnHand
      updatedAt
    }
  }
`

export const getProductKPIs = `
  query GetProductKPIs($productId: uuid!) {
    # Current product info
    product: nwSalesProduct(where: { id: { _eq: $productId } }) {
      id
      quantityOnHand
      price
      currentCost
    }
    
    # Sales data for this product
    salesData: nwSalesSalesOrderItem(
      where: { productId: { _eq: $productId } }
      orderBy: { createdAt: DESC }
      limit: 100
    ) {
      quantity
      baseAmount
      extendedAmount
      createdAt
    }
  }
`
