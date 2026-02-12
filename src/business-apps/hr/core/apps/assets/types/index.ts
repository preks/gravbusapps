export enum AssetStatus {
  AVAILABLE = 'AVAILABLE_ASSET',
  ALLOCATED = 'ALLOCATED_ASSET',
  UNDER_REPAIR = 'IN_REPAIR_ASSET',
  RETIRED = 'RETIRED_ASSET'
}

export interface Asset {
  id: string
  model: string
  serialNumber?: string
  acquisitionDate: string
  warrantyPeriodMonths: number
  inventoryValue: number
  assetStatus: AssetStatus
  notes?: string
  version: number
  isDeleted: boolean
  assetBrandRef: string
  assetCategoryRef: string
  currencyRef: string
  siteLocationId?: string
  assetBrand?: {
    id: string
    code: string
    value: string
    translations?: Array<{ localeCode: string; value: string; objectValue?: any }>
  }
  assetCategory?: {
    id: string
    code: string
    value: string
    translations?: Array<{ localeCode: string; value: string; objectValue?: any }>
  }
  currency?: { id: string; code: string; value: string }
  siteLocation?: { id: string; name: string }
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface CompanyLocation {
  id: string
  name: string
  city: string
  country: string
}

export interface AssetAllocation {
  id: string
  assetId: string
  employeeId: string
  startDate: string
  expectedEndDate?: string
  endDate?: string
  notes?: string
  version: number
  isDeleted: boolean
  startAssetConditionRef?: string
  endAssetConditionRef?: string
  employee?: { id: string; firstName: string; lastName: string; displayName: string }
  startAssetCondition?: { id: string; code: string; value: string }
  endAssetCondition?: { id: string; code: string; value: string }
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface AssetStatistics {
  totalAssets: number
  availableAssets: number
  allocatedAssets: number
  underRepairAssets: number
}

export interface AssetFilter {
  category?: string
  status?: AssetStatus
  employeeId?: string
  search?: string
}
