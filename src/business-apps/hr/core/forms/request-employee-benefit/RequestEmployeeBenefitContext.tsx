import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { EMPLOYEE_DATA_QUERY, GET_COUNTRY_CURRENCY_QUERY } from './RequestEmployeeBenefitQueries'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import { fetchBenefitProvidersForBenefit } from './utils/fetchBenefitProviders'
import type { RequestEmployeeBenefitContextData, EmployeeDataResponse } from './types'

interface RequestEmployeeBenefitContextValue {
  data: RequestEmployeeBenefitContextData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const RequestEmployeeBenefitContext = createContext<RequestEmployeeBenefitContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const RequestEmployeeBenefitProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken || '')
  const [data, setData] = useState<RequestEmployeeBenefitContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Extract employee ID from context
  const employeeId = useMemo(() => {
    const externalContext = (additionalData as any)?.externalContextData
    return (
      externalContext?.employeeId ||
      (additionalData as any)?.psi_taskPayload?.employeeId ||
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      (additionalData as any)?.employeeId ||
      userInfo?.employeeDetails?.employeeId ||
      ''
    )
  }, [additionalData, userInfo])

  // Extract selected benefit from context or payload
  const selectedBenefit = useMemo(() => {
    const externalContext = (additionalData as any)?.externalContextData
    return (
      externalContext?.benefit ||
      (additionalData as any)?.benefit ||
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.benefit ||
      null
    )
  }, [additionalData])

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

      // Initialize with employee data
      setData({
        employee: employeeData,
        benefitProviders: [],
        countryCurrency: { currencyRef: null, currencyCode: '' },
        selectedBenefit: selectedBenefit
      })

      // Fetch benefit providers and country currency in parallel
      try {
        let providers: any[] = []
        let currencyRef: string | null = null
        let currencyCode = ''

        if (selectedBenefit) {
          // Fetch benefit providers
          providers = await fetchBenefitProvidersForBenefit(catalogClient, selectedBenefit)

          // Fetch country currency from parent country catalog entry
          const countryId = selectedBenefit?.catalogEntry?.parentEntryId
          if (countryId) {
            try {
              const countryRes = await graphqlClient.request<any>(GET_COUNTRY_CURRENCY_QUERY, { id: countryId })
              const raw = countryRes?.CatalogEntry?.[0]?.objectValue
              if (raw) {
                let obj: any = raw
                if (typeof raw === 'string') {
                  try {
                    obj = JSON.parse(raw)
                  } catch {
                    obj = raw
                  }
                }
                const currencyRefValue: string | undefined = obj?.currency || obj?.defaultCurrency || obj?.currencyRef
                if (currencyRefValue && typeof currencyRefValue === 'string') {
                  currencyRef = currencyRefValue
                  currencyCode = extractCurrencyCode(currencyRefValue)
                }
              }
            } catch {
              // Ignore currency fetch errors
            }
          }
        }

        setData(prev => ({
          ...prev!,
          benefitProviders: providers,
          countryCurrency: { currencyRef, currencyCode }
        }))
      } catch (error_: any) {
        setError(error_?.message || 'Data load failed')
      }

      setIsLoading(false)
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }, [accessToken, employeeId, selectedBenefit, graphqlClient, catalogClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: RequestEmployeeBenefitContextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch: fetchData
    }),
    [data, isLoading, error, fetchData]
  )

  return <RequestEmployeeBenefitContext.Provider value={value}>{children}</RequestEmployeeBenefitContext.Provider>
}

export const useRequestEmployeeBenefit = (): RequestEmployeeBenefitContextValue => {
  const ctx = useContext(RequestEmployeeBenefitContext)
  if (!ctx) {
    throw new Error('useRequestEmployeeBenefit must be used within RequestEmployeeBenefitProvider')
  }
  return ctx
}
