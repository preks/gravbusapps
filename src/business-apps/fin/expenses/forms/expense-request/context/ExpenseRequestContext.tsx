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
      if (
        fetchExpenseCatalogueData.data.EmployeePosition &&
        fetchExpenseCatalogueData.data.EmployeePosition[0] &&
        fetchExpenseCatalogueData.data.EmployeePosition[0].costCenterId
      ) {
        setSelectedCostCenter(fetchExpenseCatalogueData.data.EmployeePosition[0].costCenterId)
      }

      const employeePosition = fetchExpenseCatalogueData?.data?.EmployeePosition || []
      const structureId = employeePosition[0]?.structureId || getCurrentActiveStructureId()
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

      setCostCenters(
        userCostCenters.map((costCenterElement: any) => ({
          id: costCenterElement.id,
          name: costCenterElement.name
        }))
      )
      setProjects(
        userProjects.map((projectElement: any) => ({
          id: projectElement.id,
          name: projectElement.name
        }))
      )

      if (selectedCostCenter === '' && userCostCenters.length > 0 && userCostCenters[0].id) {
        setSelectedCostCenter(userCostCenters[0].id)
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
