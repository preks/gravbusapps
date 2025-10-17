import { useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { expenseSettingsClient } from '../utils/ExpenseSettingsClient'
import { MileageRuleFormData } from '../types/ExpenseRuleTypes'

export interface UseMileageRuleOperationsResult {
  createMileageRule: (data: MileageRuleFormData) => Promise<any>
  updateMileageRule: (id: string, data: MileageRuleFormData, version?: number) => Promise<any>
  deleteMileageRule: (id: string, version?: number) => Promise<any>
}

/**
 * Lightweight hook for mileage rule CRUD operations only.
 * Does not load any data - only provides operation functions.
 */
export const useMileageRuleOperations = (context: BusinessAppContextProps): UseMileageRuleOperationsResult => {
  // Initialize client with access token
  useEffect(() => {
    if (context.accessToken) {
      expenseSettingsClient.setAccessToken(context.accessToken)
    }
  }, [context.accessToken])

  const createMileageRule = useCallback(async (data: MileageRuleFormData) => {
    try {
      const result = await expenseSettingsClient.saveMileageRule(data)
      return result
    } catch (error) {
      console.error('Error creating mileage rule:', error)
      throw error
    }
  }, [])

  const updateMileageRule = useCallback(async (id: string, data: MileageRuleFormData, version?: number) => {
    try {
      // Include id and version in the data for update operation
      const updateData = {
        ...data,
        id,
        ...(version !== undefined && { version })
      }
      const result = await expenseSettingsClient.saveMileageRule(updateData)
      return result
    } catch (error) {
      console.error('Error updating mileage rule:', error)
      throw error
    }
  }, [])

  const deleteMileageRule = useCallback(async (id: string, version?: number) => {
    try {
      const result = await expenseSettingsClient.deleteMileageRule(id, version)
      return result
    } catch (error) {
      console.error('Error deleting mileage rule:', error)
      throw error
    }
  }, [])

  return {
    createMileageRule,
    updateMileageRule,
    deleteMileageRule
  }
}
