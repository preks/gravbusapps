/**
 * Mock Data Service for Asset Management
 * Provides temporary data storage and CRUD operations
 * Will be replaced with GraphQL integration in the future
 */

import { Asset, AssetAllocation, AssetStatus, AssetCategory, CompanyLocation } from '../types'

// Company locations
export const companyLocations: CompanyLocation[] = [
  { id: 'loc-001', name: 'Hamburg Office', city: 'Hamburg', country: 'Germany' },
  { id: 'loc-002', name: 'Berlin Office', city: 'Berlin', country: 'Germany' },
  { id: 'loc-003', name: 'Munich Office', city: 'Munich', country: 'Germany' },
  { id: 'loc-004', name: 'Vienna Office', city: 'Vienna', country: 'Austria' },
  { id: 'loc-005', name: 'Remote/Home Office', city: 'Remote', country: 'Various' }
]

// Helper function to calculate warranty expiry date
const calculateWarrantyExpiry = (acquisitionDate: string, warrantyMonths: number): string => {
  const date = new Date(acquisitionDate)
  date.setMonth(date.getMonth() + warrantyMonths)
  return date.toISOString().split('T')[0]
}

// Sample assets data
export const mockAssets: Asset[] = [
  {
    id: 'asset-001',
    category: AssetCategory.LAPTOP,
    producer: 'Apple',
    model: 'MacBook Pro 14" M3',
    serialNumber: 'MBP-2024-001',
    acquisitionDate: '2024-01-15',
    warrantyPeriodMonths: 36,
    warrantyExpiryDate: calculateWarrantyExpiry('2024-01-15', 36),
    inventoryValue: 2499,
    currency: 'EUR',
    status: AssetStatus.ALLOCATED,
    location: 'Hamburg Office',
    currentAllocationId: 'alloc-001',
    notes: 'Assigned to engineering team'
  },
  {
    id: 'asset-002',
    category: AssetCategory.LAPTOP,
    producer: 'Dell',
    model: 'XPS 15',
    serialNumber: 'DELL-2024-002',
    acquisitionDate: '2024-02-20',
    warrantyPeriodMonths: 24,
    warrantyExpiryDate: calculateWarrantyExpiry('2024-02-20', 24),
    inventoryValue: 1899,
    currency: 'EUR',
    status: AssetStatus.AVAILABLE,
    location: 'Berlin Office',
    notes: 'Available for new hires'
  },
  {
    id: 'asset-003',
    category: AssetCategory.MONITOR,
    producer: 'LG',
    model: 'UltraWide 34"',
    serialNumber: 'LG-MON-003',
    acquisitionDate: '2023-11-10',
    warrantyPeriodMonths: 36,
    warrantyExpiryDate: calculateWarrantyExpiry('2023-11-10', 36),
    inventoryValue: 799,
    currency: 'EUR',
    status: AssetStatus.ALLOCATED,
    location: 'Hamburg Office',
    currentAllocationId: 'alloc-002'
  },
  {
    id: 'asset-004',
    category: AssetCategory.MOBILE_PHONE,
    producer: 'Apple',
    model: 'iPhone 15 Pro',
    serialNumber: 'IPHONE-004',
    acquisitionDate: '2024-03-05',
    warrantyPeriodMonths: 12,
    warrantyExpiryDate: calculateWarrantyExpiry('2024-03-05', 12),
    inventoryValue: 1199,
    currency: 'EUR',
    status: AssetStatus.UNDER_REPAIR,
    location: 'Munich Office',
    notes: 'Battery replacement scheduled'
  },
  {
    id: 'asset-005',
    category: AssetCategory.LAPTOP,
    producer: 'HP',
    model: 'EliteBook 840',
    serialNumber: 'HP-2023-005',
    acquisitionDate: '2023-06-15',
    warrantyPeriodMonths: 36,
    warrantyExpiryDate: calculateWarrantyExpiry('2023-06-15', 36),
    inventoryValue: 1499,
    currency: 'EUR',
    status: AssetStatus.RETIRED,
    location: 'Vienna Office',
    notes: 'End of lifecycle - decommissioned'
  },
  {
    id: 'asset-006',
    category: AssetCategory.TABLET,
    producer: 'Apple',
    model: 'iPad Pro 12.9"',
    serialNumber: 'IPAD-006',
    acquisitionDate: '2024-01-20',
    warrantyPeriodMonths: 12,
    warrantyExpiryDate: calculateWarrantyExpiry('2024-01-20', 12),
    inventoryValue: 1099,
    currency: 'EUR',
    status: AssetStatus.AVAILABLE,
    location: 'Berlin Office'
  },
  {
    id: 'asset-007',
    category: AssetCategory.HEADSET,
    producer: 'Sony',
    model: 'WH-1000XM5',
    serialNumber: 'SONY-HEAD-007',
    acquisitionDate: '2024-02-10',
    warrantyPeriodMonths: 24,
    warrantyExpiryDate: calculateWarrantyExpiry('2024-02-10', 24),
    inventoryValue: 399,
    currency: 'EUR',
    status: AssetStatus.ALLOCATED,
    location: 'Remote/Home Office',
    currentAllocationId: 'alloc-003'
  },
  {
    id: 'asset-008',
    category: AssetCategory.DOCKING_STATION,
    producer: 'CalDigit',
    model: 'TS4 Thunderbolt 4',
    serialNumber: 'CAL-DOCK-008',
    acquisitionDate: '2024-01-25',
    warrantyPeriodMonths: 24,
    warrantyExpiryDate: calculateWarrantyExpiry('2024-01-25', 24),
    inventoryValue: 349,
    currency: 'EUR',
    status: AssetStatus.AVAILABLE,
    location: 'Hamburg Office'
  }
]

/**
 * Get all company locations
 */
export const getCompanyLocations = (): CompanyLocation[] => {
  return companyLocations
}

// Sample allocation history
export const mockAllocations: AssetAllocation[] = [
  {
    id: 'alloc-001',
    assetId: 'asset-001',
    employeeId: 'emp-001',
    employeeName: 'John Doe',
    startDate: '2024-01-20',
    expectedEndDate: '2027-01-20',
    conditionStart: 'Excellent - Brand new device'
  },
  {
    id: 'alloc-002',
    assetId: 'asset-003',
    employeeId: 'emp-002',
    employeeName: 'Jane Smith',
    startDate: '2023-12-01',
    expectedEndDate: '2026-12-01',
    conditionStart: 'Good - Previous user maintained well'
  },
  {
    id: 'alloc-003',
    assetId: 'asset-007',
    employeeId: 'emp-003',
    employeeName: 'Mike Johnson',
    startDate: '2024-02-15',
    expectedEndDate: '2027-02-15',
    conditionStart: 'Excellent'
  },
  {
    id: 'alloc-004',
    assetId: 'asset-005',
    employeeId: 'emp-001',
    employeeName: 'John Doe',
    startDate: '2021-06-20',
    expectedEndDate: '2024-06-20',
    endDate: '2024-06-15',
    conditionStart: 'Good',
    conditionEnd: 'Fair - Normal wear and tear after 3 years'
  }
]

// LocalStorage keys
const ASSETS_STORAGE_KEY = 'asset-management-assets'
const ALLOCATIONS_STORAGE_KEY = 'asset-management-allocations'

/**
 * Initialize localStorage with mock data if not already present
 */
export const initializeMockData = (): void => {
  if (!localStorage.getItem(ASSETS_STORAGE_KEY)) {
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(mockAssets))
  }
  if (!localStorage.getItem(ALLOCATIONS_STORAGE_KEY)) {
    localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(mockAllocations))
  }
}

/**
 * Get all assets from localStorage
 */
export const getAssets = (): Asset[] => {
  const stored = localStorage.getItem(ASSETS_STORAGE_KEY)
  return stored ? JSON.parse(stored) : mockAssets
}

/**
 * Get all allocations from localStorage
 */
export const getAllocations = (): AssetAllocation[] => {
  const stored = localStorage.getItem(ALLOCATIONS_STORAGE_KEY)
  return stored ? JSON.parse(stored) : mockAllocations
}

/**
 * Save assets to localStorage
 */
export const saveAssets = (assets: Asset[]): void => {
  localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets))
}

/**
 * Save allocations to localStorage
 */
export const saveAllocations = (allocations: AssetAllocation[]): void => {
  localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations))
}

/**
 * Get asset by ID
 */
export const getAssetById = (id: string): Asset | undefined => {
  const assets = getAssets()
  return assets.find(asset => asset.id === id)
}

/**
 * Get allocations for a specific asset
 */
export const getAllocationsForAsset = (assetId: string): AssetAllocation[] => {
  const allocations = getAllocations()
  return allocations.filter(alloc => alloc.assetId === assetId)
}

/**
 * Get current allocation for an asset
 */
export const getCurrentAllocation = (assetId: string): AssetAllocation | undefined => {
  const allocations = getAllocations()
  return allocations.find(alloc => alloc.assetId === assetId && !alloc.endDate)
}

/**
 * Add new asset
 */
export const addAsset = (asset: Asset): void => {
  const assets = getAssets()
  assets.push(asset)
  saveAssets(assets)
}

/**
 * Create new asset (returns the created asset)
 */
export const createAsset = (
  assetData: Omit<Asset, 'id' | 'status' | 'currentAllocationId' | 'warrantyExpiryDate'>
): Asset => {
  const calculateWarrantyExpiry = (acquisitionDate: string, warrantyMonths: number): string => {
    const date = new Date(acquisitionDate)
    date.setMonth(date.getMonth() + warrantyMonths)
    return date.toISOString().split('T')[0]
  }

  const newAsset: Asset = {
    id: `asset-${Date.now()}`,
    ...assetData,
    status: AssetStatus.AVAILABLE,
    warrantyExpiryDate: calculateWarrantyExpiry(assetData.acquisitionDate, assetData.warrantyPeriodMonths),
    currentAllocationId: undefined
  }

  const assets = getAssets()
  assets.push(newAsset)
  saveAssets(assets)

  return newAsset
}

/**
 * Update asset
 */
export const updateAsset = (id: string, updates: Partial<Asset>): void => {
  const assets = getAssets()
  const index = assets.findIndex(a => a.id === id)
  if (index !== -1) {
    assets[index] = { ...assets[index], ...updates }
    saveAssets(assets)
  }
}

/**
 * Delete asset
 */
export const deleteAsset = (id: string): void => {
  const assets = getAssets()
  const filtered = assets.filter(a => a.id !== id)
  saveAssets(filtered)
}

/**
 * Allocate asset to employee
 */
export const allocateAsset = (allocation: AssetAllocation): void => {
  const allocations = getAllocations()
  allocations.push(allocation)
  saveAllocations(allocations)

  // Update asset status
  updateAsset(allocation.assetId, {
    status: AssetStatus.ALLOCATED,
    currentAllocationId: allocation.id
  })
}

/**
 * Deallocate asset (return from employee)
 */
export const deallocateAsset = (allocationId: string, endDate: string, conditionEnd?: string): void => {
  const allocations = getAllocations()
  const index = allocations.findIndex(a => a.id === allocationId)

  if (index !== -1) {
    allocations[index] = {
      ...allocations[index],
      endDate,
      conditionEnd
    }
    saveAllocations(allocations)

    // Update asset status
    const assetId = allocations[index].assetId
    updateAsset(assetId, {
      status: AssetStatus.AVAILABLE,
      currentAllocationId: undefined
    })
  }
}
