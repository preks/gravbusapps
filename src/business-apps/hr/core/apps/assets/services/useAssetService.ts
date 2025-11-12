/**
 * Asset Service Hook
 *
 * This hook provides all asset-related GraphQL operations
 * replacing the mock data implementation.
 */

import { useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  GET_ASSETS,
  GET_ASSET_BY_ID,
  GET_ASSET_STATISTICS,
  INSERT_ASSET,
  UPDATE_ASSET,
  DELETE_ASSET,
  GET_EMPLOYEE_ASSETS_BY_ASSET,
  GET_CURRENT_ALLOCATION,
  ALLOCATE_ASSET,
  DEALLOCATE_ASSET,
  AssetQueryVariables,
  AssetByIdVariables,
  AssetStatisticsResponse,
  InsertAssetVariables,
  UpdateAssetVariables,
  DeleteAssetVariables,
  AllocateAssetVariables,
  DeallocateAssetVariables
} from '../queries/assetQueries'
import { Asset, AssetAllocation, AssetStatistics, AssetStatus } from '../types'

/**
 * Hook to provide asset service operations
 */
export const useAssetService = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  /**
   * Fetch all assets with optional filtering and pagination
   */
  const getAssets = useCallback(
    async (variables: AssetQueryVariables = {}) => {
      try {
        // Build where condition - only filter by isDeleted
        // Ensure we get all assets regardless of who created them
        // If variables.where is provided, merge it properly but ensure isDeleted filter is always present
        const baseWhere: any = { isDeleted: { _eq: false } }

        let finalWhere: any = baseWhere

        // If variables.where is provided, merge it with baseWhere using _and
        if (variables.where) {
          // Check if variables.where already has _and
          if (variables.where._and) {
            // Add baseWhere to the _and array if not already present
            finalWhere = {
              _and: [baseWhere, ...variables.where._and]
            }
          } else {
            // Merge baseWhere with variables.where
            finalWhere = {
              _and: [baseWhere, variables.where]
            }
          }
        }

        const defaultVariables: AssetQueryVariables = {
          where: finalWhere,
          orderBy: { createdAt: 'DESC' },
          limit: variables.limit,
          offset: variables.offset
        }

        // DEBUG: Log the query variables to verify we're not filtering by creator
        console.log('[useAssetService] Fetching assets with variables:', {
          where: JSON.stringify(defaultVariables.where, null, 2),
          limit: defaultVariables.limit,
          offset: defaultVariables.offset
        })

        const result = await graphQLClient.request<{
          Asset: any[]
          AssetAggregate: { aggregate: { count: number } }
        }>(GET_ASSETS, defaultVariables)

        // DEBUG: Log the results to see how many assets were returned
        console.log('[useAssetService] Received assets:', {
          count: result.Asset.length,
          totalCount: result.AssetAggregate.aggregate.count,
          sampleCreatedBy: result.Asset.slice(0, 3).map(a => ({ id: a.id, createdBy: a.createdBy }))
        })

        const assets: Asset[] = result.Asset.map((asset: any) => {
          if (asset.siteLocationId && !asset.siteLocation) {
            console.warn('[useAssetService] Asset has siteLocationId but no siteLocation relation:', {
              assetId: asset.id,
              siteLocationId: asset.siteLocationId,
              siteLocation: asset.siteLocation
            })
          }
          return {
            id: asset.id,
            model: asset.model,
            serialNumber: asset.serialNumber,
            acquisitionDate: asset.acquisitionDate,
            warrantyPeriodMonths: asset.warrantyPeriodMonths,
            inventoryValue: asset.inventoryValue,
            assetStatus: asset.assetStatus as AssetStatus,
            notes: asset.notes,
            version: asset.version,
            isDeleted: asset.isDeleted,
            assetBrandRef: asset.assetBrandRef,
            assetCategoryRef: asset.assetCategoryRef,
            currencyRef: asset.currencyRef,
            siteLocationId: asset.siteLocationId,
            assetBrand: asset.assetBrand,
            assetCategory: asset.assetCategory,
            currency: asset.currency,
            siteLocation: asset.siteLocation,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt
          }
        })

        return {
          assets,
          totalCount: result.AssetAggregate.aggregate.count
        }
      } catch (error) {
        console.error('Error fetching assets:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Fetch a single asset by ID
   */
  const getAssetById = useCallback(
    async (id: string) => {
      try {
        const result = await graphQLClient.request<{ Asset: any[] }>(GET_ASSET_BY_ID, { id } as AssetByIdVariables)

        if (!result.Asset || result.Asset.length === 0) {
          return null
        }

        const asset = result.Asset[0]
        if (asset.siteLocationId && !asset.siteLocation) {
          console.warn('[useAssetService] Asset by ID has siteLocationId but no siteLocation relation:', {
            assetId: asset.id,
            siteLocationId: asset.siteLocationId,
            siteLocation: asset.siteLocation
          })
        }
        return {
          id: asset.id,
          model: asset.model,
          serialNumber: asset.serialNumber,
          acquisitionDate: asset.acquisitionDate,
          warrantyPeriodMonths: asset.warrantyPeriodMonths,
          inventoryValue: asset.inventoryValue,
          assetStatus: asset.assetStatus as AssetStatus,
          notes: asset.notes,
          version: asset.version,
          isDeleted: asset.isDeleted,
          assetBrandRef: asset.assetBrandRef,
          assetCategoryRef: asset.assetCategoryRef,
          currencyRef: asset.currencyRef,
          siteLocationId: asset.siteLocationId,
          assetBrand: asset.assetBrand,
          assetCategory: asset.assetCategory,
          currency: asset.currency,
          siteLocation: asset.siteLocation,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        } as Asset
      } catch (error) {
        console.error('Error fetching asset by ID:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Fetch asset statistics
   */
  const getAssetStatistics = useCallback(async () => {
    try {
      const result = await graphQLClient.request<AssetStatisticsResponse>(GET_ASSET_STATISTICS)

      return {
        totalAssets: result.totalAssets.aggregate.count,
        allocatedAssets: result.allocatedAssets.aggregate.count,
        availableAssets: result.availableAssets.aggregate.count,
        underRepairAssets: 0, // Not in DB schema
        retiredAssets: result.retiredAssets.aggregate.count
      } as AssetStatistics
    } catch (error) {
      console.error('Error fetching asset statistics:', error)
      throw error
    }
  }, [graphQLClient])

  /**
   * Create a new asset
   */
  const createAsset = useCallback(
    async (assetData: Omit<Asset, 'id' | 'version' | 'isDeleted' | 'createdAt' | 'updatedAt'>) => {
      try {
        const variables: InsertAssetVariables = {
          asset: {
            model: assetData.model,
            serialNumber: assetData.serialNumber,
            acquisitionDate: assetData.acquisitionDate,
            warrantyPeriodMonths: assetData.warrantyPeriodMonths,
            inventoryValue: assetData.inventoryValue,
            assetStatus: AssetStatus.AVAILABLE,
            assetBrandRef: assetData.assetBrandRef,
            assetCategoryRef: assetData.assetCategoryRef,
            currencyRef: assetData.currencyRef,
            ...(assetData.siteLocationId && { siteLocationId: assetData.siteLocationId }),
            notes: assetData.notes
          }
        }

        const result = await graphQLClient.request<{ insert_Asset_one: any }>(INSERT_ASSET, variables)

        const asset = result.insert_Asset_one
        return {
          id: asset.id,
          model: asset.model,
          serialNumber: asset.serialNumber,
          acquisitionDate: asset.acquisitionDate,
          warrantyPeriodMonths: asset.warrantyPeriodMonths,
          inventoryValue: asset.inventoryValue,
          assetStatus: asset.assetStatus as AssetStatus,
          notes: asset.notes,
          version: asset.version,
          isDeleted: asset.isDeleted,
          assetBrandRef: asset.assetBrandRef,
          assetCategoryRef: asset.assetCategoryRef,
          currencyRef: asset.currencyRef,
          siteLocationId: asset.siteLocationId,
          assetBrand: asset.assetBrand,
          assetCategory: asset.assetCategory,
          currency: asset.currency,
          siteLocation: asset.siteLocation,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        } as Asset
      } catch (error) {
        console.error('Error creating asset:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Update an existing asset
   */
  const updateAsset = useCallback(
    async (id: string, version: number, updates: Partial<Asset>) => {
      try {
        const variables: UpdateAssetVariables = {
          id,
          version,
          changes: {
            ...(updates.assetStatus && { assetStatus: updates.assetStatus }),
            ...(updates.siteLocationId && { siteLocationId: updates.siteLocationId }),
            ...(updates.notes !== undefined && { notes: updates.notes }),
            ...(updates.currencyRef && { currencyRef: updates.currencyRef }),
            ...(updates.inventoryValue !== undefined && { inventoryValue: updates.inventoryValue }),
            ...(updates.assetBrandRef && { assetBrandRef: updates.assetBrandRef }),
            ...(updates.assetCategoryRef && { assetCategoryRef: updates.assetCategoryRef })
          }
        }

        const result = await graphQLClient.request<{ update_Asset: { returning: any[] } }>(UPDATE_ASSET, variables)

        const asset = result.update_Asset.returning[0]
        return {
          id: asset.id,
          model: asset.model,
          serialNumber: asset.serialNumber,
          acquisitionDate: asset.acquisitionDate,
          warrantyPeriodMonths: asset.warrantyPeriodMonths,
          inventoryValue: asset.inventoryValue,
          assetStatus: asset.assetStatus as AssetStatus,
          notes: asset.notes,
          version: asset.version,
          isDeleted: asset.isDeleted,
          assetBrandRef: asset.assetBrandRef,
          assetCategoryRef: asset.assetCategoryRef,
          currencyRef: asset.currencyRef,
          siteLocationId: asset.siteLocationId,
          assetBrand: asset.assetBrand,
          assetCategory: asset.assetCategory,
          currency: asset.currency,
          siteLocation: asset.siteLocation,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        } as Asset
      } catch (error) {
        console.error('Error updating asset:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Delete an asset
   */
  const deleteAsset = useCallback(
    async (id: string, version: number) => {
      try {
        const variables: DeleteAssetVariables = { id, version }
        await graphQLClient.request(DELETE_ASSET, variables)
      } catch (error) {
        console.error('Error deleting asset:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Get all allocations for a specific asset
   */
  const getAllocationsForAsset = useCallback(
    async (assetId: string) => {
      try {
        const result = await graphQLClient.request<{ EmployeeAsset: any[] }>(GET_EMPLOYEE_ASSETS_BY_ASSET, { assetId })

        const allocations: AssetAllocation[] = result.EmployeeAsset.map((alloc: any) => ({
          id: alloc.id,
          assetId: alloc.assetId,
          employeeId: alloc.employeeId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          startAssetCondition: alloc.startAssetCondition,
          endAssetCondition: alloc.endAssetCondition,
          createdAt: alloc.createdAt,
          updatedAt: alloc.updatedAt
        }))

        return allocations
      } catch (error) {
        console.error('Error fetching allocations for asset:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Get current allocation for an asset
   */
  const getCurrentAllocation = useCallback(
    async (assetId: string) => {
      try {
        const result = await graphQLClient.request<{ EmployeeAsset: any[] }>(GET_CURRENT_ALLOCATION, { assetId })

        if (!result.EmployeeAsset || result.EmployeeAsset.length === 0) {
          return null
        }

        const alloc = result.EmployeeAsset[0]
        return {
          id: alloc.id,
          assetId: alloc.assetId,
          employeeId: alloc.employeeId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          startAssetCondition: alloc.startAssetCondition,
          endAssetCondition: alloc.endAssetCondition,
          createdAt: alloc.createdAt,
          updatedAt: alloc.updatedAt
        } as AssetAllocation
      } catch (error) {
        console.error('Error fetching current allocation:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Allocate an asset to an employee
   */
  const allocateAsset = useCallback(
    async (allocationData: Omit<AssetAllocation, 'id' | 'version' | 'isDeleted' | 'createdAt' | 'updatedAt'>) => {
      try {
        const variables: AllocateAssetVariables = {
          allocation: {
            assetId: allocationData.assetId,
            employeeId: allocationData.employeeId,
            startDate: allocationData.startDate,
            expectedEndDate: allocationData.expectedEndDate,
            ...(allocationData.startAssetConditionRef && { conditionStart: allocationData.startAssetConditionRef })
          }
        }

        const result = await graphQLClient.request<{ insert_EmployeeAsset_one: any }>(ALLOCATE_ASSET, variables)

        const alloc = result.insert_EmployeeAsset_one
        return {
          id: alloc.id,
          assetId: alloc.assetId,
          employeeId: alloc.employeeId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          startAssetCondition: alloc.startAssetCondition,
          endAssetCondition: alloc.endAssetCondition,
          createdAt: alloc.createdAt,
          updatedAt: alloc.updatedAt
        } as AssetAllocation
      } catch (error) {
        console.error('Error allocating asset:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /**
   * Deallocate an asset (return it)
   */
  const deallocateAsset = useCallback(
    async (id: string, version: number, endDate: string, endAssetConditionRef?: string) => {
      try {
        const variables: DeallocateAssetVariables = {
          id,
          version,
          endDate,
          ...(endAssetConditionRef && { conditionEnd: endAssetConditionRef })
        }

        const result = await graphQLClient.request<{ update_EmployeeAsset: { returning: any[] } }>(
          DEALLOCATE_ASSET,
          variables
        )

        const alloc = result.update_EmployeeAsset.returning[0]
        return {
          id: alloc.id,
          assetId: alloc.assetId,
          employeeId: alloc.employeeId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          startAssetCondition: alloc.startAssetCondition,
          endAssetCondition: alloc.endAssetCondition,
          createdAt: alloc.createdAt,
          updatedAt: alloc.updatedAt
        } as AssetAllocation
      } catch (error) {
        console.error('Error deallocating asset:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  return useMemo(
    () => ({
      getAssets,
      getAssetById,
      getAssetStatistics,
      createAsset,
      updateAsset,
      deleteAsset,
      getAllocationsForAsset,
      getCurrentAllocation,
      allocateAsset,
      deallocateAsset
    }),
    [
      getAssets,
      getAssetById,
      getAssetStatistics,
      createAsset,
      updateAsset,
      deleteAsset,
      getAllocationsForAsset,
      getCurrentAllocation,
      allocateAsset,
      deallocateAsset
    ]
  )
}
