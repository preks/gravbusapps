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
  GET_EMPLOYEE_ASSET_BY_ID,
  GET_ASSET_IDS_BY_EMPLOYEE_IDS,
  GET_ASSET_IDS_WITH_ALLOCATION_HISTORY,
  ALLOCATE_ASSET,
  AssetQueryVariables,
  AssetByIdVariables,
  AssetStatisticsResponse,
  InsertAssetVariables,
  UpdateAssetVariables,
  DeleteAssetVariables,
  AllocateAssetVariables,
  AssetIdsWithAllocationHistoryVariables
} from '../queries/assetQueries'
import { Asset, AssetAllocation, AssetStatistics, AssetStatus } from '../types'
import { AssetProcessClient } from './AssetProcessClient'

export const useAssetService = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const getAssets = useCallback(
    async (variables: AssetQueryVariables = {}) => {
      try {
        const baseWhere: any = { isDeleted: { _eq: false } }

        let finalWhere: any = baseWhere

        if (variables.where) {
          if (variables.where._and) {
            finalWhere = {
              _and: [baseWhere, ...variables.where._and]
            }
          } else {
            finalWhere = {
              _and: [baseWhere, variables.where]
            }
          }
        }

        // Employee filter (or any id filter): restrict to these asset IDs only
        if (variables.assetIds !== undefined) {
          const idCondition = { id: { _in: variables.assetIds } }
          finalWhere =
            finalWhere._and != null ? { _and: [...finalWhere._and, idCondition] } : { _and: [finalWhere, idCondition] }
        }

        const defaultVariables: AssetQueryVariables = {
          where: finalWhere,
          orderBy: variables.orderBy || [{ createdAt: 'DESC' }],
          limit: variables.limit,
          offset: variables.offset
        }

        const result = await graphQLClient.request<{
          Asset: any[]
          AssetAggregate: { aggregate: { count: number } }
        }>(GET_ASSETS, defaultVariables)

        const assets: Asset[] = result.Asset.map((asset: any) => {
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
            updatedAt: asset.updatedAt,
            disposalStatus: asset.disposalStatus,
            disposalOutcomeRef: asset.disposalOutcomeRef,
            disposalDate: asset.disposalDate,
            disposalReason: asset.disposalReason,
            responsibleEmployeeId: asset.responsibleEmployeeId,
            performerEmployeeId: asset.performerEmployeeId,
            requireSanitization: asset.requireSanitization,
            sanitizationMethodRef: asset.sanitizationMethodRef,
            sanitizationExecutionDate: asset.sanitizationExecutionDate,
            responsibleEmployee: asset.responsibleEmployee,
            performerEmployee: asset.performerEmployee
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

  const getAssetById = useCallback(
    async (id: string) => {
      try {
        const result = await graphQLClient.request<{ Asset: any[] }>(GET_ASSET_BY_ID, { id } as AssetByIdVariables)

        if (!result.Asset || result.Asset.length === 0) {
          return null
        }

        const asset = result.Asset[0]

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
          updatedAt: asset.updatedAt,
          disposalStatus: asset.disposalStatus,
          disposalOutcomeRef: asset.disposalOutcomeRef,
          disposalDate: asset.disposalDate,
          disposalReason: asset.disposalReason,
          responsibleEmployeeId: asset.responsibleEmployeeId,
          performerEmployeeId: asset.performerEmployeeId,
          requireSanitization: asset.requireSanitization,
          sanitizationMethodRef: asset.sanitizationMethodRef,
          sanitizationExecutionDate: asset.sanitizationExecutionDate,
          responsibleEmployee: asset.responsibleEmployee,
          performerEmployee: asset.performerEmployee
        } as Asset
      } catch (error) {
        console.error('Error fetching asset by ID:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  const getAssetStatistics = useCallback(async () => {
    try {
      const result = await graphQLClient.request<AssetStatisticsResponse>(GET_ASSET_STATISTICS)

      return {
        totalAssets: result.totalAssets.aggregate.count,
        allocatedAssets: result.allocatedAssets.aggregate.count,
        availableAssets: result.availableAssets.aggregate.count,
        underRepairAssets: result.underRepairAssets.aggregate.count,
        retiredAssets: result.retiredAssets.aggregate.count
      } as AssetStatistics
    } catch (error) {
      console.error('Error fetching asset statistics:', error)
      throw error
    }
  }, [graphQLClient])

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

  const getAllocationsForAsset = useCallback(
    async (assetId: string) => {
      try {
        const result = await graphQLClient.request<{ EmployeeAsset: any[] }>(GET_EMPLOYEE_ASSETS_BY_ASSET, { assetId })

        const allocations: AssetAllocation[] = result.EmployeeAsset.map((alloc: any) => ({
          id: alloc.id,
          assetId: alloc.assetId,
          employeeId: alloc.employeeId,
          roomId: alloc.roomId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          room: alloc.room,
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
          roomId: alloc.roomId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          room: alloc.room,
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

  const getEmployeeAssetById = useCallback(
    async (allocationId: string): Promise<AssetAllocation | null> => {
      try {
        const result = await graphQLClient.request<{ EmployeeAsset: any[] }>(GET_EMPLOYEE_ASSET_BY_ID, {
          id: allocationId
        })
        if (!result.EmployeeAsset || result.EmployeeAsset.length === 0) return null
        const alloc = result.EmployeeAsset[0]
        return {
          id: alloc.id,
          assetId: alloc.assetId,
          employeeId: alloc.employeeId,
          roomId: alloc.roomId,
          startDate: alloc.startDate,
          expectedEndDate: alloc.expectedEndDate,
          endDate: alloc.endDate,
          notes: alloc.notes,
          version: alloc.version,
          isDeleted: alloc.isDeleted,
          startAssetConditionRef: alloc.startAssetConditionRef,
          endAssetConditionRef: alloc.endAssetConditionRef,
          employee: alloc.employee,
          room: alloc.room,
          startAssetCondition: alloc.startAssetCondition,
          endAssetCondition: alloc.endAssetCondition,
          createdAt: alloc.createdAt,
          updatedAt: alloc.updatedAt
        } as AssetAllocation
      } catch (error) {
        console.error('Error fetching allocation by id:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /** Returns asset IDs that have a current allocation to one of the given employee IDs. */
  const getAssetIdsByEmployeeIds = useCallback(
    async (employeeIds: string[]): Promise<string[]> => {
      if (!employeeIds.length) return []
      try {
        const result = await graphQLClient.request<{ EmployeeAsset: { assetId: string }[] }>(
          GET_ASSET_IDS_BY_EMPLOYEE_IDS,
          { employeeIds }
        )
        const ids = result.EmployeeAsset?.map(row => row.assetId) ?? []
        return [...new Set(ids)]
      } catch (error) {
        console.error('Error fetching asset IDs by employee IDs:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  /** Returns asset IDs that have any allocation history. */
  const getAssetIdsWithAllocationHistory = useCallback(
    async (assetIds: string[]): Promise<string[]> => {
      if (!assetIds.length) return []

      try {
        const uniqueAssetIds = [...new Set(assetIds)]
        const result = await graphQLClient.request<{ EmployeeAsset: { assetId: string }[] }>(
          GET_ASSET_IDS_WITH_ALLOCATION_HISTORY,
          { assetIds: uniqueAssetIds } as AssetIdsWithAllocationHistoryVariables
        )
        const ids = result.EmployeeAsset?.map(row => row.assetId) ?? []
        return [...new Set(ids)]
      } catch (error) {
        console.error('Error fetching asset IDs with allocation history:', error)
        throw error
      }
    },
    [graphQLClient]
  )

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

  const deallocateAsset = useCallback(
    async (id: string, version: number, endDate: string, endAssetConditionRef?: string) => {
      try {
        const client = new AssetProcessClient()
        client.setAccessToken(context.accessToken)
        await client.updateEmployeeAsset({
          id,
          version,
          endDate,
          ...(endAssetConditionRef && { endAssetConditionRef })
        })
        return { id, version, endDate } as AssetAllocation
      } catch (error) {
        console.error('Error deallocating asset:', error)
        throw error
      }
    },
    [context.accessToken]
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
      getEmployeeAssetById,
      getAssetIdsByEmployeeIds,
      getAssetIdsWithAllocationHistory,
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
      getEmployeeAssetById,
      getAssetIdsByEmployeeIds,
      getAssetIdsWithAllocationHistory,
      allocateAsset,
      deallocateAsset
    ]
  )
}
