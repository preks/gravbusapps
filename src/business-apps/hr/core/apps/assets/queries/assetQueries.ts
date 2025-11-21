import { AssetStatus } from '../types'

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
  createdBy
  updatedBy
  currency {
    id
    code
    value
  }
  assetBrand {
    id
    code
    value
    translations {
      localeCode
      value
      objectValue
    }
  }
  assetCategory {
    id
    code
    value
    translations {
      localeCode
      value
      objectValue
    }
  }
  siteLocation {
    id
    name
  }
`

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

export const GET_ASSET_BY_ID = `
  query GetAssetById($id: uuid!) {
    Asset(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      ${ASSET_FIELDS}
    }
  }
`

export const GET_ASSET_STATISTICS = `
  query GetAssetStatistics {
    totalAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _neq: "${AssetStatus.RETIRED}" }
      }
    ) {
      aggregate {
        count
      }
    }
    allocatedAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _eq: "${AssetStatus.ALLOCATED}" }
      }
    ) {
      aggregate {
        count
      }
    }
    availableAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _eq: "${AssetStatus.AVAILABLE}" }
      }
    ) {
      aggregate {
        count
      }
    }
    underRepairAssets: AssetAggregate(
      where: {
        isDeleted: { _eq: false }
        assetStatus: { _eq: "${AssetStatus.UNDER_REPAIR}" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const INSERT_ASSET = `
  mutation InsertAsset($asset: AssetInsertInput!) {
    insert_Asset_one(object: $asset) {
      ${ASSET_FIELDS}
    }
  }
`

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

export const ALLOCATE_ASSET = `
  mutation AllocateAsset($allocation: EmployeeAssetInsertInput!) {
    insert_EmployeeAsset_one(object: $allocation) {
      ${EMPLOYEE_ASSET_FIELDS}
    }
  }
`
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
