import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ASSETS } from '../queries/employeeAssetQueries'

export interface EmployeeAsset {
  id: string
  startDate: string
  endDate?: string
  expectedEndDate?: string
  notes?: string
  startAssetConditionRef?: string
  endAssetConditionRef?: string
  asset: {
    id: string
    model: string
    serialNumber: string
    assetStatus: string
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
  }
  startAssetCondition?: {
    id: string
    code: string
    value: string
  }
  endAssetCondition?: {
    id: string
    code: string
    value: string
  }
}

interface EmployeeAssetsResponse {
  EmployeeAsset: EmployeeAsset[]
}

export const useEmployeeAssets = (accessToken: string, employeeId: string) => {
  const [assets, setAssets] = useState<EmployeeAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAssets = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<EmployeeAssetsResponse>(GET_EMPLOYEE_ASSETS, {
        employeeId
      })

      setAssets(result.EmployeeAsset || [])
    } catch (err) {
      console.error('Error fetching employee assets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch assets')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, employeeId, accessToken])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  return {
    assets,
    isLoading,
    error,
    refetch: fetchAssets
  }
}
