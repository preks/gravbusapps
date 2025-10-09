// GraphQL queries for Product Management Overview

export const getProducts = `
  query GetProducts(
    $limit: Int!
    $offset: Int!
    $where: NwSalesProductBoolExp
    $orderBy: [NwSalesProductOrderBy!]
  ) {
    nwSalesProduct(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
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
    nwSalesProductAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const getProductKPIs = `
  query GetProductKPIs($where: NwSalesProductBoolExp) {
    # Total products count
    totalProducts: nwSalesProductAggregate(where: $where) {
      aggregate {
        count
      }
    }
    
    # Active products count
    activeProducts: nwSalesProductAggregate(
      where: { 
        _and: [
          $where,
          { stateCode: { _eq: "Active" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Product categories count (distinct product types)
    productCategories: nwSalesProductAggregate(
      where: $where,
      distinctOn: [productTypeCode]
    ) {
      aggregate {
        count
      }
    }
    
    # Average price calculation
    averagePrice: nwSalesProductAggregate(where: $where) {
      aggregate {
        avg {
          price
        }
      }
    }
  }
`

export const getProductCategories = `
  query GetProductCategories($limit: Int, $offset: Int) {
    nwSalesProduct(
      distinctOn: [productTypeCode]
      limit: $limit
      offset: $offset
      where: { productTypeCode: { _isNull: false } }
    ) {
      productTypeCode
    }
  }
`

export const searchProducts = `
  query SearchProducts(
    $searchTerm: String!
    $limit: Int!
    $offset: Int!
  ) {
    nwSalesProduct(
      where: {
        _or: [
          { name: { _ilike: $searchTerm } }
          { productNumber: { _ilike: $searchTerm } }
          { description: { _ilike: $searchTerm } }
          { supplierName: { _ilike: $searchTerm } }
        ]
      }
      limit: $limit
      offset: $offset
      orderBy: { name: ASC }
    ) {
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
    nwSalesProductAggregate(
      where: {
        _or: [
          { name: { _ilike: $searchTerm } }
          { productNumber: { _ilike: $searchTerm } }
          { description: { _ilike: $searchTerm } }
          { supplierName: { _ilike: $searchTerm } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
