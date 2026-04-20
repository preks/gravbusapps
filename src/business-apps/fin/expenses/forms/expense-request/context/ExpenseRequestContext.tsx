import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'

import { showToast } from '../../../utils/notificationUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getCurrentActiveUserLocale,
  getCurrentActiveStructureId,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import { wrapGraphQLClient } from '../services/graphqlClient'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchExpenseCatalogueDataQuery, getStructureCostCenterQuery } from '../ExpenseRequestQueries'
import type { EmployeePositionLike } from '../utils/resolvePrimaryEmployeePosition'
import {
  getExpenseCatalogueCostCenterState,
  mapGraphqlCostCentersToOptions,
  mapGraphqlProjectsToOptions,
  resolvePreferredCostCenterId
} from '../utils/expenseFormCostCenterUtils'
import { FormStepType, FORM_STEPS } from '../constants/constants'

/**
 * ExpenseRequestContext interface
 */
interface ExpenseRequestContextProps {
  step: FormStepType
  loading: boolean
  costCenters: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
  selectedCostCenter: string
  expenseCatalogueData: any
  accessToken?: string
  userInfo?: any
  setStep: React.Dispatch<React.SetStateAction<FormStepType>>
  setSelectedCostCenter: (costCenterId: string) => void
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

const ExpenseRequestContext = createContext<ExpenseRequestContextProps | undefined>(undefined)

/**
 * ExpenseRequestProvider component
 * @param props - Business app context props
 * @returns Provider component
 */
export const ExpenseRequestProvider: React.FC<BusinessAppContextProps & { children: React.ReactNode }> = ({
  accessToken,
  userInfo,
  children
}) => {
  const baseGraphQLClient = useGraphqlClient(accessToken)
  const graphQLClient = useMemo(() => wrapGraphQLClient(baseGraphQLClient), [baseGraphQLClient])

  const [step, setStep] = useState<FormStepType>(FORM_STEPS.START)
  const [loading, setLoading] = useState<boolean>(false)
  const [costCenters, setCostCenters] = useState<Array<{ id: string; name: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('')
  const [expenseCatalogueData, setExpenseCatalogueData] = useState<any>(null)

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, userInfo])

  const fetchData = async () => {
    setLoading(true)
    try {
      const employeeId = userInfo?.employeeDetails.employeeId
      if (!employeeId) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.employee_id_not_found',
            'Employee ID not found'
          ),
          'error'
        )
        setLoading(false)
        return
      }

      const fetchExpenseCatalogueData = await graphQLClient.query({
        query: fetchExpenseCatalogueDataQuery,
        variables: {
          employeeId,
          activeUserLocale: getCurrentActiveUserLocale()
        }
      })

      setExpenseCatalogueData(fetchExpenseCatalogueData.data)

      const positions = (fetchExpenseCatalogueData?.data?.EmployeePosition || []) as EmployeePositionLike[]
      const { structureId, candidateIds } = getExpenseCatalogueCostCenterState(positions, getCurrentActiveStructureId())
      if (!structureId) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.structure_not_found',
            'Employee structure not found'
          ),
          'error'
        )
        setLoading(false)
        return
      }

      const getStructureCostCenter = await graphQLClient.query({
        query: getStructureCostCenterQuery,
        variables: {
          structureId
        }
      })

      const userCostCenters = getStructureCostCenter?.data?.userCostCenters || []
      const userProjects = getStructureCostCenter?.data?.Project || []

      const mappedCostCenters = mapGraphqlCostCentersToOptions(userCostCenters)

      setCostCenters(mappedCostCenters)
      setProjects(mapGraphqlProjectsToOptions(userProjects))

      const preferredCostCenterId = resolvePreferredCostCenterId(mappedCostCenters, candidateIds)
      if (preferredCostCenterId) {
        setSelectedCostCenter(preferredCostCenterId)
      }
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_type_item.process_error_data_fetch',
          'Error fetching data'
        ),
        'error'
      )
      setExpenseCatalogueData({ expenseRequestType: [], ExpensePlan: [] })
    } finally {
      setLoading(false)
    }
  }

  const contextValue = useMemo(
    () => ({
      step,
      loading,
      costCenters,
      projects,
      selectedCostCenter,
      expenseCatalogueData,
      accessToken,
      userInfo,
      setStep,
      setSelectedCostCenter,
      setLoading
    }),
    [step, loading, costCenters, projects, selectedCostCenter, expenseCatalogueData, accessToken, userInfo]
  )

  return <ExpenseRequestContext.Provider value={contextValue}>{children}</ExpenseRequestContext.Provider>
}

/**
 * Hook to use the expense request context
 * @returns Expense request context
 */
export const useExpenseRequestContext = () => {
  const context = useContext(ExpenseRequestContext)
  if (context === undefined) {
    throw new Error('useExpenseRequestContext must be used within an ExpenseRequestProvider')
  }
  return context
}
