import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ADDRESS, CATALOG_DATA_QUERY } from './ChangeEmployeeAddressQueries'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface EmployeeAddressDataResponse {
  EmployeeAddress: Array<any>
  EmployeeBankAccount: Array<any>
}

interface CatalogsDataResponse {
  countries: Array<any>
  regions: Array<any>
  counties: Array<any>
}

interface ChangeEmployeeAddressContextData {
  address: EmployeeAddressDataResponse | null
  catalogs: CatalogsDataResponse | null
}

interface ChangeEmployeeAddressContextValue {
  data: ChangeEmployeeAddressContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  refetchAddresses: () => Promise<void>
}

const ChangeEmployeeAddressContext = createContext<ChangeEmployeeAddressContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const ChangeEmployeeAddressProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<ChangeEmployeeAddressContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId: string | undefined = useMemo(() => {
    return (
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
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
      // Fetch employee addresses first
      const addrVariables = { id: employeeId } as any
      const addressData = await graphqlClient.request<EmployeeAddressDataResponse>(GET_EMPLOYEE_ADDRESS, addrVariables)
      setData({ address: addressData, catalogs: null })
      setIsLoading(false)

      // Fetch catalogs in background and merge
      try {
        const catalogVariables = { activeUserLocale } as any
        const catalogData = await graphqlClient.request<CatalogsDataResponse>(CATALOG_DATA_QUERY, catalogVariables)
        setData(prev => ({ address: prev?.address ?? null, catalogs: catalogData }))
      } catch (catalogErr: any) {
        setError(catalogErr?.message || 'Catalogs load failed')
      }
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }

  const refetchAddresses = async () => {
    if (!accessToken || !employeeId) return
    try {
      const addrVariables = { id: employeeId } as any
      const addressData = await graphqlClient.request<EmployeeAddressDataResponse>(GET_EMPLOYEE_ADDRESS, addrVariables)
      setData(prev => ({ address: addressData, catalogs: prev?.catalogs ?? null }))
    } catch {
      // swallow errors here; primary fetch handles messaging
    }
  }

  useEffect(() => {
    fetchData()
  }, [accessToken, employeeId, activeUserLocale])

  const value: ChangeEmployeeAddressContextValue = {
    data,
    isLoading,
    error,
    refetch: fetchData,
    refetchAddresses
  }

  return <ChangeEmployeeAddressContext.Provider value={value}>{children}</ChangeEmployeeAddressContext.Provider>
}

export const useChangeEmployeeAddress = (): ChangeEmployeeAddressContextValue => {
  const ctx = useContext(ChangeEmployeeAddressContext)
  if (!ctx) {
    throw new Error('useChangeEmployeeAddress must be used within ChangeEmployeeAddressProvider')
  }
  return ctx
}
