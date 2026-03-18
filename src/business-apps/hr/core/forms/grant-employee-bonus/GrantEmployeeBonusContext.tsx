import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  EMPLOYEE_DATA_QUERY,
  CATALOG_DATA_QUERY,
  EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY,
  GET_EMPLOYEE_REGION_ID,
  GET_REGION_COUNTRY_ID,
  GET_COUNTRY_OBJECT_VALUE
} from './GrantEmployeeBonusQueries'
import { fetchCountryCurrency } from '../request-employee-benefit/utils/fetchCountryCurrency'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import type {
  GrantEmployeeBonusContextData,
  EmployeeDataResponse,
  CatalogsDataResponse,
  EmployeeBankAccountCurrency
} from './types'

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

  const employeeId: string | undefined = useMemo(
    () => extractEmployeeId(additionalData, userInfo),
    [additionalData, userInfo]
  )

  const activeUserLocale = useMemo(() => getCurrentActiveUserLocale(), [])

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(employeeId ? 'Missing accessToken' : 'Missing employeeId')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const empVariables = { idEmployee: employeeId }
      const employeeData = await graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables)
      setData({
        employee: employeeData,
        catalogs: null,
        employeeCurrency: null,
        countryCurrencyRef: null
        // hasEmploymentRegion set after region fetch to avoid flashing the warning on open
      })

      // Fetch catalogs and employee bank account currency in parallel
      try {
        const catalogVariables = { activeUserLocale }
        const bankAccountVariables = { idEmployee: employeeId }

        const [catalogData, bankAccountData] = await Promise.all([
          graphqlClient.request<CatalogsDataResponse>(CATALOG_DATA_QUERY, catalogVariables),
          graphqlClient.request<{ EmployeeBankAccount: EmployeeBankAccountCurrency[] }>(
            EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY,
            bankAccountVariables
          )
        ])

        const bankAccountCurrency = bankAccountData?.EmployeeBankAccount?.[0]?.currencyRef ?? null

        let countryCurrencyRef: string | null = null
        let hasEmploymentRegion = false
        try {
          const regionRes = await graphqlClient.request<{
            Employee?: Array<{ workingCondition?: Array<{ region?: { id: string } }> }>
          }>(GET_EMPLOYEE_REGION_ID, { employeeId })
          const regionId = regionRes?.Employee?.[0]?.workingCondition?.[0]?.region?.id
          hasEmploymentRegion = Boolean(regionId)
          if (regionId) {
            const countryRes = await graphqlClient.request<{
              CatalogEntry?: Array<{ additionalValue3?: string }>
            }>(GET_REGION_COUNTRY_ID, { regionId })
            const countryId = countryRes?.CatalogEntry?.[0]?.additionalValue3
            if (countryId) {
              const countryCurrency = await fetchCountryCurrency(graphqlClient, countryId, GET_COUNTRY_OBJECT_VALUE)
              countryCurrencyRef = countryCurrency.currencyRef
            }
          }
        } catch {
          // Non-fatal
        }

        // Prefer currency from employment region country, then bank account; only set when region is set
        const resolvedCurrencyRef =
          hasEmploymentRegion && (countryCurrencyRef || bankAccountCurrency)
            ? countryCurrencyRef || bankAccountCurrency
            : null
        const employeeCurrency: EmployeeBankAccountCurrency | null = resolvedCurrencyRef
          ? { currencyRef: resolvedCurrencyRef }
          : null

        setData(prev => ({
          employee: prev?.employee ?? null,
          catalogs: catalogData,
          employeeCurrency,
          countryCurrencyRef,
          hasEmploymentRegion
        }))
      } catch (error_: any) {
        setError(error_?.message || 'Data load failed')
        setData(prev => ({
          ...prev,
          employee: prev?.employee ?? null,
          catalogs: null,
          employeeCurrency: null,
          countryCurrencyRef: null,
          hasEmploymentRegion: false // only set after we've attempted the region fetch
        }))
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
