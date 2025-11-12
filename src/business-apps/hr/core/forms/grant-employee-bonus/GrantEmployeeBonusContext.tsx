import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, CATALOG_DATA_QUERY } from './GrantEmployeeBonusQueries'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { GrantEmployeeBonusContextData, EmployeeDataResponse, CatalogsDataResponse } from './types'

interface GrantEmployeeBonusContextValue {
  data: GrantEmployeeBonusContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const GrantEmployeeBonusContext = createContext<GrantEmployeeBonusContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const GrantEmployeeBonusProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<GrantEmployeeBonusContextData | null>(null)
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

  const activeUserLocale = useMemo(() => getCurrentActiveUserLocale(), [])

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(!employeeId ? 'Missing employeeId' : 'Missing accessToken')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const empVariables = { idEmployee: employeeId }
      const employeeData = await graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables)
      setData({ employee: employeeData, catalogs: null })

      try {
        const catalogVariables = { activeUserLocale }
        const catalogData = await graphqlClient.request<CatalogsDataResponse>(CATALOG_DATA_QUERY, catalogVariables)
        setData(prev => ({ employee: prev?.employee ?? null, catalogs: catalogData }))
      } catch (catalogErr: any) {
        setError(catalogErr?.message || 'Catalogs load failed')
      }
      setIsLoading(false)
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }, [accessToken, employeeId, activeUserLocale, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: GrantEmployeeBonusContextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch: fetchData
    }),
    [data, isLoading, error, fetchData]
  )

  return <GrantEmployeeBonusContext.Provider value={value}>{children}</GrantEmployeeBonusContext.Provider>
}

export const useGrantEmployeeBonus = (): GrantEmployeeBonusContextValue => {
  const ctx = useContext(GrantEmployeeBonusContext)
  if (!ctx) {
    throw new Error('useGrantEmployeeBonus must be used within GrantEmployeeBonusProvider')
  }
  return ctx
}
