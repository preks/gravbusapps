/**
 * GraphQL queries and mutations for Asset Management
 *
 * This file contains all GraphQL operations for the Asset and EmployeeAsset tables
 * in the nw_employee schema.
 */

// Asset fragment with all fields matching actual database schema
export const ASSET_FIELDS = `
  id
  model
  serialNumber
  acquisitionDate
  warrantyPeriodMonths
  inventoryValue
  assetStatus
  notes
  createdAt
  updatedAt
  version
  isDeleted
  assetBrandRef
  assetCategoryRef
  currencyRef
  siteLocationId
  currency {
    id
    code
    value
  }
  assetBrand {
    id
    code
    value
  }
  assetCategory {
    id
    code
    value
  }
  siteLocation {
    id
    name
  }
`

// EmployeeAsset fragment with all fields matching actual database schema
export const EMPLOYEE_ASSET_FIELDS = `
  id
  assetId
  employeeId
  startDate
  expectedEndDate
  endDate
  notes
  createdAt
  updatedAt
  version
  isDeleted
  startAssetConditionRef
  endAssetConditionRef
  employee {
    id
    firstName
    lastName
    displayName
  }
  startAssetCondition {
    id
    code
    value
  }
  endAssetCondition {
    id
    code
    value
  }
`

/**
 * Query to fetch all assets with optional filtering
 */
export const GET_ASSETS = `
  query GetAssets(
    $limit: Int
    $offset: Int
    $where: AssetBoolExp
    $orderBy: [AssetOrderBy!]
  ) {
    Asset(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      ${ASSET_FIELDS}
    }
    AssetAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

/**
 * Query to fetch a single asset by ID
 */
export const GET_ASSET_BY_ID = `
  query GetAssetById($id: uuid!) {
    Asset(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      ${ASSET_FIELDS}
    }
  }
`

/**
 * Query to fetch asset statistics
 */
export const GET_ASSET_STATISTICS = `
  query GetAssetStatistics {
    totalAssets: AssetAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    allocatedAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _eq: "ALLOCATED_ASSET" }
      }
    ) {
      aggregate {
        count
      }
    }
    availableAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _eq: "AVAILABLE_ASSET" }
      }
    ) {
      aggregate {
        count
      }
    }
    retiredAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _eq: "RETIRED_ASSET" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

/**
 * Mutation to insert a new asset
 */
export const INSERT_ASSET = `
  mutation InsertAsset($asset: AssetInsertInput!) {
    insert_Asset_one(object: $asset) {
      ${ASSET_FIELDS}
    }
  }
`

/**
 * Mutation to update an existing asset
 */
export const UPDATE_ASSET = `
  mutation UpdateAsset($id: uuid!, $version: Int!, $changes: AssetSetInput!) {
    update_Asset(
      where: { id: { _eq: $id }, version: { _eq: $version } }
      _set: $changes
    ) {
      returning {
        ${ASSET_FIELDS}
      }
    }
  }
`

/**
 * Mutation to soft delete an asset
 */
export const DELETE_ASSET = `
  mutation DeleteAsset($id: uuid!, $version: Int!) {
    update_Asset(
      where: { id: { _eq: $id }, version: { _eq: $version } }
      _set: { isDeleted: true }
    ) {
      returning {
        id
      }
    }
  }
`

/**
 * Query to fetch employee assets (allocations) for a specific asset
 */
export const GET_EMPLOYEE_ASSETS_BY_ASSET = `
  query GetEmployeeAssetsByAsset($assetId: uuid!) {
    EmployeeAsset(
      where: { assetId: { _eq: $assetId }, isDeleted: { _eq: false } }
      orderBy: { startDate: DESC }
    ) {
      ${EMPLOYEE_ASSET_FIELDS}
    }
  }
`

/**
 * Query to fetch current allocation for an asset
 */
export const GET_CURRENT_ALLOCATION = `
  query GetCurrentAllocation($assetId: uuid!) {
    EmployeeAsset(
      where: {
        assetId: { _eq: $assetId }
        isDeleted: { _eq: false }
        endDate: { _isNull: true }
      }
      limit: 1
    ) {
      ${EMPLOYEE_ASSET_FIELDS}
    }
  }
`

/**
 * Mutation to allocate an asset to an employee
 */
export const ALLOCATE_ASSET = `
  mutation AllocateAsset($allocation: EmployeeAssetInsertInput!) {
    insert_EmployeeAsset_one(object: $allocation) {
      ${EMPLOYEE_ASSET_FIELDS}
    }
  }
`

/**
 * Mutation to deallocate an asset (set end date)
 */
export const DEALLOCATE_ASSET = `
  mutation DeallocateAsset(
    $id: uuid!
    $version: Int!
    $endDate: date!
    $conditionEnd: String
  ) {
    update_EmployeeAsset(
      where: { id: { _eq: $id }, version: { _eq: $version } }
      _set: { endDate: $endDate, conditionEnd: $conditionEnd }
    ) {
      returning {
        ${EMPLOYEE_ASSET_FIELDS}
      }
    }
  }
`

// TypeScript interfaces for query variables and responses
export interface AssetQueryVariables {
  limit?: number
  offset?: number
  where?: any
  orderBy?: any
}

export interface AssetByIdVariables {
  id: string
}

export interface AssetStatisticsResponse {
  totalAssets: { aggregate: { count: number } }
  allocatedAssets: { aggregate: { count: number } }
  availableAssets: { aggregate: { count: number } }
  underRepairAssets: { aggregate: { count: number } }
  retiredAssets: { aggregate: { count: number } }
}

export interface InsertAssetVariables {
  asset: {
    model: string
    serialNumber: string
    acquisitionDate: string
    warrantyPeriodMonths: number
    inventoryValue: number
    assetStatus: string
    assetBrandRef: string
    assetCategoryRef: string
    currencyRef: string
    siteLocationId?: string
    notes?: string
  }
}

export interface UpdateAssetVariables {
  id: string
  version: number
  changes: {
    assetStatus?: string
    siteLocationId?: string
    notes?: string
    currencyRef?: string
    inventoryValue?: number
    assetBrandRef?: string
    assetCategoryRef?: string
  }
}

export interface DeleteAssetVariables {
  id: string
  version: number
}

export interface AllocateAssetVariables {
  allocation: {
    assetId: string
    employeeId: string
    startDate: string
    expectedEndDate?: string
    conditionStart?: string
  }
}

export interface DeallocateAssetVariables {
  id: string
  version: number
  endDate: string
  conditionEnd?: string
}
