// GraphQL queries for BOM Management Overview

export const getBillOfMaterials = `
  query GetBillOfMaterials(
    $limit: Int!
    $offset: Int!
    $where: BillOfMaterialsBoolExp
    $orderBy: [BillOfMaterialsOrderBy!]
  ) {
    BillOfMaterials(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      id
      businessKey
      name
      description
      parentProductId
      parentProduct {
        id
        name
        productNumber
        description
      }
      bomType
      bomLevel
      bomStatus
      activeFrom
      activeTo
      validFrom
      validTo
      baseQuantity
      baseUom
      scrapFactor
      componentCount
      totalComponents
      version
      recordState
      processInstanceId
      createdBy
      updatedBy
      createdAt
      updatedAt
      isDeleted
      additionalProperties
    }
    BillOfMaterialsAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const getBomKPIs = `
  query GetBomKPIs($where: BillOfMaterialsBoolExp) {
    # Total BOMs count
    totalBoms: BillOfMaterialsAggregate(where: $where) {
      aggregate {
        count
      }
    }
    
    # Active BOMs count
    activeBoms: BillOfMaterialsAggregate(
      where: { 
        _and: [
          $where,
          { bomStatus: { _eq: "ACTIVE" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total components across all BOMs
    totalComponents: BomComponentAggregate(
      where: {
        billOfMaterials: $where,
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
        sum {
          quantity
        }
      }
    }
    
    # Average complexity (components per BOM)
    averageComplexity: BillOfMaterialsAggregate(where: $where) {
      aggregate {
        avg {
          componentCount
        }
      }
    }
  }
`

export const searchBillOfMaterials = `
  query SearchBillOfMaterials(
    $searchTerm: String!
    $limit: Int!
    $offset: Int!
  ) {
    BillOfMaterials(
      where: {
        _or: [
          { name: { _ilike: $searchTerm } }
          { businessKey: { _ilike: $searchTerm } }
          { description: { _ilike: $searchTerm } }
          { parentProduct: { name: { _ilike: $searchTerm } } }
          { parentProduct: { productNumber: { _ilike: $searchTerm } } }
        ]
      }
      limit: $limit
      offset: $offset
      orderBy: { name: ASC }
    ) {
      id
      businessKey
      name
      description
      parentProductId
      parentProduct {
        id
        name
        productNumber
        description
      }
      bomType
      bomLevel
      bomStatus
      activeFrom
      activeTo
      validFrom
      validTo
      baseQuantity
      baseUom
      scrapFactor
      componentCount
      totalComponents
      version
      recordState
      processInstanceId
      createdBy
      updatedBy
      createdAt
      updatedAt
      isDeleted
      additionalProperties
    }
    BillOfMaterialsAggregate(
      where: {
        _or: [
          { name: { _ilike: $searchTerm } }
          { businessKey: { _ilike: $searchTerm } }
          { description: { _ilike: $searchTerm } }
          { parentProduct: { name: { _ilike: $searchTerm } } }
          { parentProduct: { productNumber: { _ilike: $searchTerm } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const getBomsByParentProduct = `
  query GetBomsByParentProduct(
    $parentProductId: uuid!
    $limit: Int!
    $offset: Int!
  ) {
    BillOfMaterials(
      where: { parentProductId: { _eq: $parentProductId } }
      limit: $limit
      offset: $offset
      orderBy: { createdAt: DESC }
    ) {
      id
      businessKey
      name
      description
      bomType
      bomLevel
      bomStatus
      activeFrom
      activeTo
      validFrom
      validTo
      baseQuantity
      baseUom
      componentCount
      totalComponents
      version
      createdAt
      updatedAt
    }
  }
`

export const getBomStatusCounts = `
  query GetBomStatusCounts($where: BillOfMaterialsBoolExp) {
    active: BillOfMaterialsAggregate(
      where: { 
        _and: [
          $where,
          { bomStatus: { _eq: "ACTIVE" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    inactive: BillOfMaterialsAggregate(
      where: { 
        _and: [
          $where,
          { bomStatus: { _eq: "INACTIVE" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    pending: BillOfMaterialsAggregate(
      where: { 
        _and: [
          $where,
          { bomStatus: { _eq: "PENDING" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    obsolete: BillOfMaterialsAggregate(
      where: { 
        _and: [
          $where,
          { bomStatus: { _eq: "OBSOLETE" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const getBomTrendData = `
  query GetBomTrendData(
    $currentPeriodStart: timestamptz!
    $previousPeriodStart: timestamptz!
    $previousPeriodEnd: timestamptz!
  ) {
    # Current period data
    currentPeriod: BillOfMaterialsAggregate(
      where: { 
        createdAt: { _gte: $currentPeriodStart }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Previous period data for comparison
    previousPeriod: BillOfMaterialsAggregate(
      where: { 
        createdAt: { 
          _gte: $previousPeriodStart,
          _lt: $previousPeriodEnd
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
