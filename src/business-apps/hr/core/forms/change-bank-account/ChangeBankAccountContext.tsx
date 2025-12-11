import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY, CATALOG_DATA_QUERY } from './ChangeBankAccountQueries'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface EmployeeDataResponse {
  EmployeeBankAccount: Array<any>
  EmployeeAddress: Array<any>
  Employee: Array<any>
}

interface CatalogsDataResponse {
  countries: Array<any>
  currency: Array<any>
  routingNumber: Array<any>
}

interface ChangeBankAccountContextData {
  employee: EmployeeDataResponse | null
  catalogs: CatalogsDataResponse | null
}

interface ChangeBankAccountContextValue {
  data: ChangeBankAccountContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ChangeBankAccountContext = createContext<ChangeBankAccountContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const ChangeBankAccountProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<ChangeBankAccountContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId: string | undefined = useMemo(() => {
    return (
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
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
      const empVariables = { idEmployee: employeeId } as any
      const employeeData = await graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables)
      setData({ employee: employeeData, catalogs: null })
      setIsLoading(false)

      // Fetch catalogs in background and merge
      try {
        const catalogVariables = { activeUserLocale } as any
        const catalogData = await graphqlClient.request<CatalogsDataResponse>(CATALOG_DATA_QUERY, catalogVariables)
        setData(prev => ({ employee: prev?.employee ?? null, catalogs: catalogData }))
      } catch (catalogErr: any) {
        setError(catalogErr?.message || 'Catalogs load failed')
      }
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }, [accessToken, employeeId, activeUserLocale, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: ChangeBankAccountContextValue = {
    data,
    isLoading,
    error,
    refetch: fetchData
  }

  return <ChangeBankAccountContext.Provider value={value}>{children}</ChangeBankAccountContext.Provider>
}

export const useChangeBankAccount = () => {
  const ctx = useContext(ChangeBankAccountContext)
  if (!ctx) throw new Error('useChangeBankAccount must be used within ChangeBankAccountProvider')
  return ctx
}

export default ChangeBankAccountContext
