/**
 * Asset Management Types and Interfaces
 * Defines all TypeScript types for the Asset Management system
 */

export enum AssetStatus {
  UNKNOWN = 'UNKNOWN_ASSET_STATUS',
  AVAILABLE = 'AVAILABLE_ASSET',
  ALLOCATED = 'ALLOCATED_ASSET',
  UNDER_REPAIR = 'IN_REPAIR_ASSET',
  RETIRED = 'RETIRED_ASSET'
}

export interface Asset {
  id: string
  model: string
  serialNumber: string
  acquisitionDate: string
  warrantyPeriodMonths: number
  inventoryValue: number
  assetStatus: AssetStatus
  notes?: string
  version: number
  isDeleted: boolean
  // Catalog references
  assetBrandRef: string // FK to catalog_entry (producer/brand)
  assetCategoryRef: string // FK to catalog_entry
  currencyRef: string // FK to catalog_entry
  siteLocationId?: string // FK to site_location
  // Expanded relations (from GraphQL)
  assetBrand?: { id: string; code: string; value: string }
  assetCategory?: { id: string; code: string; value: string }
  currency?: { id: string; code: string; value: string }
  siteLocation?: { id: string; name: string }
  // Audit fields
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
  // Catalog references
  startAssetConditionRef?: string // FK to catalog_entry
  endAssetConditionRef?: string // FK to catalog_entry
  // Expanded relations (from GraphQL)
  employee?: { id: string; firstName: string; lastName: string; displayName: string }
  startAssetCondition?: { id: string; code: string; value: string }
  endAssetCondition?: { id: string; code: string; value: string }
  // Audit fields
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface AssetStatistics {
  totalAssets: number
  availableAssets: number
  allocatedAssets: number
  retiredAssets: number
  underRepairAssets: number
}

export interface AssetFilter {
  category?: string // Catalog value from AssetCategory catalog
  status?: AssetStatus
  employeeId?: string
  search?: string
}
