// GraphQL queries and mutations for Product Form

// Mutation to create a new product
export const createProduct = `
  mutation CreateProduct($input: NwSalesProductInsertInput!) {
    insert_nwSalesProduct_one(object: $input) {
      id
      name
      productNumber
      description
      price
      priceBase
      currentCost
      currentCostBase
      supplierName
      productTypeCode
      productStructure
      isKit
      isStockItem
      stateCode
      statusCode
      quantityOnHand
      validFromDate
      validToDate
      createdAt
      updatedAt
      isDeleted
    }
  }
`

// Mutation to update an existing product
export const updateProduct = `
  mutation UpdateProduct($id: uuid!, $input: NwSalesProductSetInput!) {
    update_nwSalesProduct_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      name
      productNumber
      description
      price
      priceBase
      currentCost
      currentCostBase
      supplierName
      productTypeCode
      productStructure
      isKit
      isStockItem
      stateCode
      statusCode
      quantityOnHand
      validFromDate
      validToDate
      createdAt
      updatedAt
      isDeleted
      version
    }
  }
`

// Query to get a single product by ID (for editing)
export const getProductById = `
  query GetProductById($id: uuid!) {
    nwSalesProduct_by_pk(id: $id) {
      id
      name
      productNumber
      description
      price
      priceBase
      currentCost
      currentCostBase
      supplierName
      productTypeCode
      productStructure
      isKit
      isStockItem
      stateCode
      statusCode
      quantityOnHand
      validFromDate
      validToDate
      createdAt
      updatedAt
      isDeleted
      version
    }
  }
`

// Query to check if product number already exists (for validation)
export const checkProductNumberExists = `
  query CheckProductNumberExists($productNumber: String!, $excludeId: uuid) {
    nwSalesProduct(
      where: {
        productNumber: { _eq: $productNumber }
        id: { _neq: $excludeId }
        isDeleted: { _neq: true }
      }
    ) {
      id
      productNumber
    }
  }
`

// Query to get product type codes from catalog (if available)
export const getProductTypeCodes = `
  query GetProductTypeCodes {
    nwSalesProduct(
      distinctOn: [productTypeCode]
      where: { 
        productTypeCode: { _isNull: false }
        isDeleted: { _neq: true }
      }
    ) {
      productTypeCode
    }
  }
`

// Query to get suppliers list (if available)
export const getSuppliers = `
  query GetSuppliers($searchTerm: String, $limit: Int = 20) {
    nwSalesProduct(
      distinctOn: [supplierName]
      where: {
        supplierName: { 
          _isNull: false
          _ilike: $searchTerm
        }
        isDeleted: { _neq: true }
      }
      limit: $limit
    ) {
      supplierName
    }
  }
`

// Query to generate next product number (if auto-generation is needed)
export const getNextProductNumber = `
  query GetNextProductNumber($prefixPattern: String = "PRD%") {
    nwSalesProductAggregate(
      where: {
        productNumber: { _like: $prefixPattern }
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
