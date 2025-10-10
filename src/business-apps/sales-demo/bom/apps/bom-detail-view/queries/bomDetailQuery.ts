// GraphQL queries for BOM Detail View

export const getBomDetails = `
  query GetBomDetails($bomId: uuid!) {
    BillOfMaterials(where: { id: { _eq: $bomId } }) {
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
        price
        currentCost
        isStockItem
        supplierName
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
  }
`

export const getBomComponents = `
  query GetBomComponents($bomId: uuid!, $limit: Int = 100, $offset: Int = 0) {
    BomComponent(
      where: { bomId: { _eq: $bomId }, isDeleted: { _neq: true } }
      orderBy: [{ level: ASC }, { positionNumber: ASC }]
      limit: $limit
      offset: $offset
    ) {
      id
      bomId
      componentProductId
      componentProduct {
        id
        name
        productNumber
        description
        price
        currentCost
        isStockItem
        supplierName
        productTypeCode
      }
      positionNumber
      level
      parentComponentId
      quantity
      quantityPer
      uom
      scrapFactor
      componentType
      isOptional
      isCritical
      effectiveFrom
      effectiveTo
      unitCost
      totalCost
      costingMethod
      leadTime
      supplierName
      supplierPartNumber
      createdAt
      updatedAt
      isDeleted
    }
    BomComponentAggregate(
      where: { bomId: { _eq: $bomId }, isDeleted: { _neq: true } }
    ) {
      aggregate {
        count
        sum {
          quantity
          totalCost
        }
        avg {
          unitCost
          leadTime
        }
      }
    }
  }
`

export const getBomKPIs = `
  query GetBomKPIs($bomId: uuid!) {
    # BOM basic info
    bom: BillOfMaterials(where: { id: { _eq: $bomId } }) {
      id
      componentCount
      totalComponents
      baseQuantity
      scrapFactor
    }
    
    # Component statistics
    components: BomComponentAggregate(
      where: { bomId: { _eq: $bomId }, isDeleted: { _neq: true } }
    ) {
      aggregate {
        count
        sum {
          quantity
          totalCost
        }
        avg {
          unitCost
          leadTime
        }
      }
    }
    
    # Critical components count
    criticalComponents: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        isCritical: { _eq: true },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Optional components count
    optionalComponents: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        isOptional: { _eq: true },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Component types breakdown
    materialComponents: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "MATERIAL" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
    
    phantomComponents: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "PHANTOM" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
    
    referenceComponents: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "REFERENCE" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const getBomHierarchy = `
  query GetBomHierarchy($bomId: uuid!) {
    # Get all components with their relationships
    BomComponent(
      where: { bomId: { _eq: $bomId }, isDeleted: { _neq: true } }
      orderBy: [{ level: ASC }, { positionNumber: ASC }]
    ) {
      id
      componentProductId
      componentProduct {
        id
        name
        productNumber
        description
        price
        currentCost
        isStockItem
      }
      positionNumber
      level
      parentComponentId
      quantity
      quantityPer
      uom
      componentType
      isOptional
      isCritical
      unitCost
      totalCost
      leadTime
      supplierName
    }
  }
`

export const getBomCostBreakdown = `
  query GetBomCostBreakdown($bomId: uuid!) {
    # Cost breakdown by component type
    materialCosts: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "MATERIAL" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        sum {
          totalCost
        }
        count
      }
    }
    
    phantomCosts: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "PHANTOM" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        sum {
          totalCost
        }
        count
      }
    }
    
    referenceCosts: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "REFERENCE" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        sum {
          totalCost
        }
        count
      }
    }
    
    toolCosts: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "TOOL" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        sum {
          totalCost
        }
        count
      }
    }
    
    resourceCosts: BomComponentAggregate(
      where: { 
        bomId: { _eq: $bomId }, 
        componentType: { _eq: "RESOURCE" },
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        sum {
          totalCost
        }
        count
      }
    }
  }
`

export const getBomValidityInfo = `
  query GetBomValidityInfo($bomId: uuid!) {
    BillOfMaterials(where: { id: { _eq: $bomId } }) {
      id
      bomStatus
      activeFrom
      activeTo
      validFrom
      validTo
      version
      recordState
      processInstanceId
      createdBy
      updatedBy
      createdAt
      updatedAt
    }
  }
`

export const getBomSystemInfo = `
  query GetBomSystemInfo($bomId: uuid!) {
    BillOfMaterials(where: { id: { _eq: $bomId } }) {
      id
      version
      recordState
      processInstanceId
      createdBy
      updatedBy
      createdAt
      updatedAt
      additionalProperties
    }
  }
`

export const getBomUsageInfo = `
  query GetBomUsageInfo($bomId: uuid!) {
    # Find where this BOM's parent product is used as a component
    usedInBoms: BomComponent(
      where: { 
        componentProductId: { 
          _in: [
            { 
              _select: { 
                parentProductId: {} 
              } 
              _from: { 
                BillOfMaterials: { 
                  where: { id: { _eq: $bomId } } 
                } 
              } 
            }
          ]
        },
        isDeleted: { _neq: true }
      }
    ) {
      id
      bomId
      billOfMaterials {
        id
        businessKey
        name
        parentProduct {
          name
          productNumber
        }
      }
      quantity
      componentType
      isOptional
      isCritical
    }
  }
`
