import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY } from './DeactivateEmployeeBenefitQueries'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { extractSelectedBenefit } from '@/business-apps/hr/core/utils/benefitExtractionUtils'
import type { DeactivateEmployeeBenefitContextData, EmployeeDataResponse } from './types'

interface DeactivateEmployeeBenefitContextValue {
  data: DeactivateEmployeeBenefitContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DeactivateEmployeeBenefitContext = createContext<DeactivateEmployeeBenefitContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const DeactivateEmployeeBenefitProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<DeactivateEmployeeBenefitContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Extract employee ID from context using utility
  const employeeId = useMemo(() => extractEmployeeId(additionalData, userInfo), [additionalData, userInfo])

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(employeeId ? 'Missing accessToken' : 'Missing employeeId')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch employee data
      const empVariables = { idEmployee: employeeId }
      const employeeData = await graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables)

      // Extract selected benefit using utility
      const benefit = extractSelectedBenefit(additionalData)

      // Set data with employee and selected benefit
      setData({
        employee: employeeData,
        selectedBenefit: benefit
      })

      setIsLoading(false)
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient, additionalData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: DeactivateEmployeeBenefitContextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch: fetchData
    }),
    [data, isLoading, error, fetchData]
  )

  return <DeactivateEmployeeBenefitContext.Provider value={value}>{children}</DeactivateEmployeeBenefitContext.Provider>
}

export const useDeactivateEmployeeBenefit = (): DeactivateEmployeeBenefitContextValue => {
  const ctx = useContext(DeactivateEmployeeBenefitContext)
  if (!ctx) {
    throw new Error('useDeactivateEmployeeBenefit must be used within DeactivateEmployeeBenefitProvider')
  }
  return ctx
}
