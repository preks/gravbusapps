import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  EMPLOYEE_DATA_QUERY,
  GET_COUNTRY_CURRENCY_QUERY,
  GET_EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY
} from './RequestEmployeeBenefitQueries'
import { fetchBenefitProvidersForBenefit } from './utils/fetchBenefitProviders'
import { fetchCountryCurrency } from './utils/fetchCountryCurrency'
import { fetchEmployeeBankAccountCurrency } from './utils/fetchEmployeeBankAccountCurrency'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { extractSelectedBenefit } from '@/business-apps/hr/core/utils/benefitExtractionUtils'
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
  const [data, setData] = useState<RequestEmployeeBenefitContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Extract employee ID from context using utility
  const employeeId = useMemo(() => extractEmployeeId(additionalData, userInfo), [additionalData, userInfo])

  // Extract selected benefit using utility
  const selectedBenefit = useMemo(() => extractSelectedBenefit(additionalData), [additionalData])

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

      const nextData: RequestEmployeeBenefitContextData = {
        employee: employeeData,
        benefitProviders: [],
        countryCurrency: { currencyRef: null, currencyCode: '' },
        selectedBenefit: selectedBenefit
      }

      // Fetch additional data if benefit selected
      if (selectedBenefit) {
        try {
          const countryId = selectedBenefit?.catalogEntry?.parentEntryId
          const [providers, countryCurrency, employeeBankAccountCurrency] = await Promise.all([
            fetchBenefitProvidersForBenefit(selectedBenefit),
            countryId
              ? fetchCountryCurrency(graphqlClient, countryId, GET_COUNTRY_CURRENCY_QUERY)
              : Promise.resolve({ currencyRef: null, currencyCode: '' }),
            fetchEmployeeBankAccountCurrency(graphqlClient, employeeId, GET_EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY)
          ])

          // Use country currency if available, otherwise fall back to employee bank account currency
          const finalCurrency = countryCurrency.currencyRef ? countryCurrency : employeeBankAccountCurrency

          nextData.benefitProviders = providers
          nextData.countryCurrency = finalCurrency
        } catch (error_: any) {
          setError(error_?.message || 'Data load failed')
        }
      }

      setData(nextData)
      setIsLoading(false)
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setIsLoading(false)
    }
  }, [accessToken, employeeId, selectedBenefit, graphqlClient])

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
