import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, EMPLOYEE_COMPENSATION_QUERY } from './AdjustEmployeeSalaryQueries'
import type { AdjustEmployeeSalaryContextData, EmployeeDataResponse, EmployeeCompensationResponse } from './types'

interface AdjustEmployeeSalaryContextValue {
  data: AdjustEmployeeSalaryContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AdjustEmployeeSalaryContext = createContext<AdjustEmployeeSalaryContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const AdjustEmployeeSalaryProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<AdjustEmployeeSalaryContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId: string | undefined = useMemo(() => {
    // Extract employeeId with priority: externalContextData (from AppAction) > process payload > direct > userInfo
    const externalContext = (additionalData as any)?.externalContextData || {}
    return (
      externalContext?.employeeId || // From AppAction externalContextData (highest priority)
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
      additionalData?.employeeId ||
      userInfo?.employeeDetails?.employeeId
    )
  }, [additionalData, userInfo])

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(!employeeId ? 'Missing employeeId' : 'Missing accessToken')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      // Fetch employee data
      const empVariables = { idEmployee: employeeId }
      const employeeData = await graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables)
      setData({ employee: employeeData, compensation: null, catalogs: null })

      // Fetch compensation data
      try {
        const compensationData = await graphqlClient.request<EmployeeCompensationResponse>(
          EMPLOYEE_COMPENSATION_QUERY,
          empVariables
        )
        setData(prev => ({
          employee: prev?.employee ?? null,
          compensation: compensationData,
          catalogs: null
        }))
      } catch (compensationErr: any) {
        console.error('Failed to fetch compensation data:', compensationErr)
        setError(compensationErr?.message || 'Compensation data load failed')
        // Still set data with null compensation so form can render
        setData(prev => ({
          employee: prev?.employee ?? null,
          compensation: null,
          catalogs: null
        }))
      }
      setIsLoading(false)
    } catch (e: any) {
      console.error('Failed to fetch employee data:', e)
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: AdjustEmployeeSalaryContextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch: fetchData
    }),
    [data, isLoading, error, fetchData]
  )

  return <AdjustEmployeeSalaryContext.Provider value={value}>{children}</AdjustEmployeeSalaryContext.Provider>
}

export const useAdjustEmployeeSalary = (): AdjustEmployeeSalaryContextValue => {
  const ctx = useContext(AdjustEmployeeSalaryContext)
  if (!ctx) {
    throw new Error('useAdjustEmployeeSalary must be used within AdjustEmployeeSalaryProvider')
  }
  return ctx
}
