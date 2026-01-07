import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  EMPLOYEE_DATA_QUERY,
  EMPLOYEE_COMPENSATION_QUERY,
  SALARY_ADJUST_REASON_CATALOG_QUERY,
  CURRENCY_CATALOG_QUERY,
  EMPLOYEE_WORKING_CONDITION_QUERY,
  EMPLOYEE_WORKING_HOURS_QUERY,
  EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY
} from './AdjustEmployeeSalaryQueries'
import type {
  AdjustEmployeeSalaryContextData,
  EmployeeDataResponse,
  EmployeeCompensationResponse,
  SalaryAdjustReasonCatalogResponse,
  EmployeeWorkingConditionResponse,
  EmployeeWorkingHoursResponse,
  EmployeeBankAccountCurrencyResponse,
  FormMode,
  CurrencyOption
} from './types'

interface CurrencyCatalogResponse {
  CatalogEntry: Array<{
    id: string
    code: string
    value: string
    translations: Array<{
      localeCode: string
      value: string
    }>
    catalog: {
      defaultLocale: string
    }
  }>
}

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
      setError(employeeId ? 'Missing accessToken' : 'Missing employeeId')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const empVariables = { idEmployee: employeeId }

      // Fetch all queries in parallel to prevent UI twitch
      const [
        employeeData,
        compensationData,
        salaryAdjustReasonCatalog,
        currencyCatalog,
        workingConditionData,
        workingHoursData,
        bankAccountData
      ] = await Promise.all([
        graphqlClient.request<EmployeeDataResponse>(EMPLOYEE_DATA_QUERY, empVariables),
        graphqlClient.request<EmployeeCompensationResponse>(EMPLOYEE_COMPENSATION_QUERY, empVariables),
        graphqlClient.request<SalaryAdjustReasonCatalogResponse>(SALARY_ADJUST_REASON_CATALOG_QUERY),
        graphqlClient.request<CurrencyCatalogResponse>(CURRENCY_CATALOG_QUERY),
        graphqlClient.request<EmployeeWorkingConditionResponse>(EMPLOYEE_WORKING_CONDITION_QUERY, empVariables),
        graphqlClient.request<EmployeeWorkingHoursResponse>(EMPLOYEE_WORKING_HOURS_QUERY, empVariables),
        graphqlClient.request<EmployeeBankAccountCurrencyResponse>(EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY, empVariables)
      ])

      // Determine form mode based on whether employee has salary records with actual values
      const salaries = compensationData?.AllEmployeeSalaries || []
      // Check if there's at least one salary record with actual salary values (not just empty records)
      const hasValidSalary = salaries.some(
        s => s.annualGrossSalary != null || s.monthlyGrossSalary != null || s.hourlyGrossSalary != null
      )
      const formMode: FormMode = hasValidSalary ? 'adjust' : 'assign'

      // Extract hire date from working condition (first/most recent record)
      const workingCondition = workingConditionData?.EmployeeWorkingCondition?.[0]
      const hireDate = workingCondition?.hireDate || null

      // Extract weekly hours from employee working hours (separate table)
      const workingHours = workingHoursData?.EmployeeWorkingHours?.[0]
      const weeklyHours = workingHours?.weeklyHours || null

      // Extract bank account currency (first record if exists)
      const bankAccountCurrency = bankAccountData?.EmployeeBankAccount?.[0]?.currencyRef || null

      // Map currency catalog entries to CurrencyOption format
      const currencies: CurrencyOption[] = (currencyCatalog?.CatalogEntry || [])
        .map(entry => ({
          id: entry.id,
          code: entry.code,
          value: entry.value
        }))
        // Sort with EUR first, then alphabetically by code
        .sort((a, b) => {
          if (a.code === 'EUR') return -1
          if (b.code === 'EUR') return 1
          return a.code.localeCompare(b.code)
        })

      // Set data only once with all results
      setData({
        employee: employeeData,
        compensation: compensationData,
        catalogs: {
          salaryAdjustReason: salaryAdjustReasonCatalog
        },
        currencies,
        formMode,
        hireDate,
        weeklyHours,
        bankAccountCurrency
      })
      setIsLoading(false)
    } catch (e: any) {
      console.error('Failed to fetch data:', e)
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
