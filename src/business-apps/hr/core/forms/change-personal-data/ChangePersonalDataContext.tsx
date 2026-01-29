import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, CATALOG_DATA_QUERY } from './ChangePersonalDataQueries'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { ChangePersonalDataContextData, EmployeeDataResponse, CatalogsDataResponse } from './types'

interface ChangePersonalDataContextValue {
  data: ChangePersonalDataContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ChangePersonalDataContext = createContext<ChangePersonalDataContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const ChangePersonalDataProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<ChangePersonalDataContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId: string | undefined = useMemo(() => {
    return (
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId
    )
  }, [additionalData, userInfo])

  const activeUserLocale = useMemo(() => getCurrentActiveUserLocale(), [])

  const fetchData = async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(!employeeId ? 'Missing employeeId' : 'Missing accessToken')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      // Fetch employee first with locale for catalog translations
      const empVariables = { idEmployee: employeeId, activeUserLocale }
      const employeeData = await graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables)
      setData({ employee: employeeData, catalogs: null })
      setIsLoading(false)

      // Fetch catalogs in background and merge
      try {
        const catalogVariables = { activeUserLocale }
        const catalogData = await graphqlClient.request<CatalogsDataResponse>(CATALOG_DATA_QUERY, catalogVariables)
        setData(prev => ({ employee: prev?.employee ?? null, catalogs: catalogData }))
      } catch (catalogErr: any) {
        setError(catalogErr?.message || 'Catalogs load failed')
      }
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [accessToken, employeeId, activeUserLocale])

  const value: ChangePersonalDataContextValue = {
    data,
    isLoading,
    error,
    refetch: fetchData
  }

  return <ChangePersonalDataContext.Provider value={value}>{children}</ChangePersonalDataContext.Provider>
}

export const useChangePersonalData = (): ChangePersonalDataContextValue => {
  const ctx = useContext(ChangePersonalDataContext)
  if (!ctx) {
    throw new Error('useChangePersonalData must be used within ChangePersonalDataProvider')
  }
  return ctx
}
