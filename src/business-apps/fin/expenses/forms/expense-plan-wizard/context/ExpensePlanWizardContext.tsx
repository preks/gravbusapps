import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Form } from 'antd'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { showToast } from '../../../utils/notificationUtils'
import { fetchEmployeeRule, fetchExpensePlanAndItems } from '../queries/ExpensePlanWizardQueries'
import { getExpenseRulePkData } from '../../expense-request-wizard/ExpenseRequestWizardQueries'
import { handleTripSubmitAction } from '../utils/tripScreenUtils'
import { getCurrencyWithFallback } from '../utils/currencyUtils'
import { LocationData } from '../../expense-request-wizard/utils/types'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'

/**
 * ExpensePlanWizardContext props interface
 */
export interface ExpensePlanWizardContextProps {
  loading: boolean
  employeeRuleId: string | null
  setEmployeeRuleId: (id: string) => void
  isFormValid: boolean
  updateTripFormValidation: (isValid: boolean) => void
  expenseRuleError: string | null
  setExpenseRuleError: (error: string | null) => void
  expensePlanData: any | null
  setExpensePlanData: (data: any | null) => void
  form: any
  userInfo?: any
  currentTitle: string
  setCurrentTitle: (title: string) => void
  currentCurrency: string | null
  setCurrentCurrency: (currency: string | null) => void
  submitActionTripData: (
    startLocation: LocationData,
    destinations: LocationData[],
    endLocation: LocationData,
    expenseRulesData: any,
    event: string,
    skipStep?: boolean,
    overrideEmployeeRuleId?: string
  ) => boolean
  showExpenseItem: boolean
  setShowExpenseItem: (show: boolean) => void
  expenseItemParams: { expensePlanId?: string; itemCurrency?: string; useSingleCurrency?: boolean }
  setExpenseItemParams: (params: { expensePlanId?: string; itemCurrency?: string; useSingleCurrency?: boolean }) => void
  showCreateItem: () => void
  hideExpenseItem: (shouldRefetch?: boolean) => void
  refetchExpenseData: () => Promise<void>
  deletedItems: any[]
  setDeletedItems: (items: any[]) => void
  payloadItemsLoaded: boolean
  setPayloadItemsLoaded: (loaded: boolean) => void
  payloadItemIds: string[]
  setPayloadItemIds: (ids: string[]) => void
  requestAdvancePayment: boolean
  setRequestAdvancePayment: (skip: boolean) => void
}

/**
 * ExpensePlanWizardProvider props interface
 */
interface ExpensePlanWizardProviderProps {
  children: ReactNode
  accessToken: string
  userInfo?: any
  additionalData?: any
}

/**
 * ExpensePlanWizardContext
 */
export const ExpensePlanWizardContext = createContext<ExpensePlanWizardContextProps | undefined>(undefined)

/**
 * ExpensePlanWizardProvider component
 * @param props - Provider props
 * @returns Provider component
 */
export const ExpensePlanWizardProvider: React.FC<ExpensePlanWizardProviderProps> = ({
  children,
  accessToken,
  userInfo,
  additionalData
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState<boolean>(true)
  const [employeeRuleId, setEmployeeRuleId] = useState<string | null>(null)
  const [expenseRuleError, setExpenseRuleError] = useState<string | null>(null)
  const [isFormValid, setisFormValid] = useState<boolean>(false)
  const [currentTitle, setCurrentTitle] = useState<string>('')
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null)
  const [expensePlanData, setExpensePlanData] = useState<any | null>(null)

  // New state for ExpenseItem integration
  const [showExpenseItem, setShowExpenseItem] = useState<boolean>(false)
  const [expenseItemParams, setExpenseItemParams] = useState<{
    expensePlanId?: string
    itemCurrency?: string
    useSingleCurrency?: boolean
  }>({})
  // State for deleted items that need to persist across navigation
  const [deletedItems, setDeletedItems] = useState<any[]>([])
  // State to track if payload items have been loaded
  const [payloadItemsLoaded, setPayloadItemsLoaded] = useState<boolean>(false)
  // State to track payload item IDs for exclusion from queries
  const [payloadItemIds, setPayloadItemIds] = useState<string[]>([])
  // State for skip advance payment
  const [requestAdvancePayment, setRequestAdvancePayment] = useState<boolean>(false)
  const graphqlClient = useGraphqlClient(accessToken)
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  const fetchExpenseData = async () => {
    try {
      if (!accessToken || !employeeRuleId || !userInfo || !additionalData) return

      // Only show full-screen loading on initial load (no plan data yet).
      // When refetching after e.g. trip Next, keep current screen visible with existing data.
      const isInitialLoad = !expensePlanData
      if (isInitialLoad && !loading) {
        setLoading(true)
      }

      if (!additionalData) {
        setLoading(false)
        return
      }

      // Extract expenseId from additionalData
      const expenseId = additionalData?.psi_taskPayload?.expensePlan?.id
      if (!expenseId) {
        setLoading(false)
        return
      }

      // Get employee ID
      const employeeId = userInfo?.employeeDetails?.employeeId
      if (!employeeId) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request_wizard.missing_employee_id',
            'Missing employee ID'
          ),
          'error'
        )
        setLoading(false)
        return
      }

      // Get active user locale
      const activeUserLocale = getCurrentActiveUserLocale()

      // Prepare query variables
      const variables = {
        expenseId,
        activeUserLocale,
        employeeId
      }

      // Execute query
      const response = await graphqlClient.request(fetchExpensePlanAndItems, variables)

      // Preserve any manually selected items that aren't part of the fetched data
      if (expensePlanData?.ExpensePlanItem && Array.isArray(expensePlanData.ExpensePlanItem)) {
        // Get IDs of items from the API response
        const fetchedItemIds = response.ExpensePlanItem?.map((item: any) => item.id) || []

        // Find manually selected items that aren't in the API response
        const manuallySelectedItems = expensePlanData.ExpensePlanItem.filter(
          (item: any) => !fetchedItemIds.includes(item.id) && item.isManuallySelected
        )

        // Combine API items with manually selected items
        if (manuallySelectedItems.length > 0) {
          response.ExpensePlanItem = [...(response.ExpensePlanItem || []), ...manuallySelectedItems]
        }
      }

      setExpensePlanData(response)
      // Ensure currentCurrency reflects freshly loaded plan data
      const refreshedCurrencyId =
        response?.ExpensePlanByPk?.currency?.id || response?.ExpensePlanByPk?.currencyRef || null
      setCurrentCurrency(refreshedCurrencyId)
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_fetching_expense_data',
          'Error fetching expense plan data'
        ),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (!accessToken || !userInfo || !additionalData) return

        const employeeId = userInfo?.employeeDetails?.employeeId
        if (!employeeId) {
          showToast(
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request_wizard.missing_employee_id',
              'Missing employee ID'
            ),
            'error'
          )
          setLoading(false)
          return
        }

        // Get current date
        const currentDate = new Date().toISOString()

        const employeeRuleData = await fetchEmployeeRule(employeeId, currentDate, accessToken)

        if (employeeRuleData && employeeRuleData.expenseRuleId) {
          setEmployeeRuleId(employeeRuleData.expenseRuleId)
          setExpenseRuleError(null)
        } else {
          setExpenseRuleError(
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.missing_expense_rule_message',
              'No expense rule found for this employee'
            )
          )
          showToast(
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.missing_expense_rule_message',
              'No expense rule found for this employee'
            ),
            'error'
          )
        }
      } catch {
        setExpenseRuleError(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.error_employee_rule',
            'Error fetching employee expense rule'
          )
        )
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.error_employee_rule',
            'Error fetching employee expense rule'
          ),
          'error'
        )
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [accessToken, userInfo, additionalData])

  // Fetch expense data when employeeRuleId is available
  useEffect(() => {
    if (employeeRuleId) {
      fetchExpenseData()
    }
  }, [employeeRuleId, additionalData])

  /**
   * Save trip data function
   * @param startLocation - Start location data
   * @param destinations - Destinations data
   * @param endLocation - End location data
   * @param expenseRulesData - Expense rules data
   * @returns True if save was successful, false otherwise
   */
  const submitActionTripData = (
    startLocation: LocationData,
    destinations: LocationData[],
    endLocation: LocationData,
    expenseRulesData: any,
    event: string,
    skipStep?: boolean,
    overrideEmployeeRuleId?: string
  ): boolean => {
    const ruleIdToUse = overrideEmployeeRuleId ?? employeeRuleId ?? ''
    if (overrideEmployeeRuleId) {
      setEmployeeRuleId(overrideEmployeeRuleId)
    }

    const determinedCurrency = getCurrencyWithFallback(startLocation, destinations, endLocation, expenseRulesData)
    setCurrentCurrency(determinedCurrency)

    return handleTripSubmitAction(
      startLocation,
      destinations,
      endLocation,
      expenseRulesData,
      expensePlanData,
      ruleIdToUse,
      currentTitle,
      determinedCurrency,
      event,
      skipStep,
      dispatchProcessContinueEventIfEnabled
    )
  }

  // Function to update trip form validation state
  const updateTripFormValidation = (isValid: boolean) => {
    setisFormValid(isValid)
  }

  // Function to show expense item component with the necessary parameters
  const showCreateItem = () => {
    if (!employeeRuleId) return
    ;(async () => {
      try {
        const expenseRuleId = employeeRuleId
        const activeUserLocale = getCurrentActiveUserLocale()
        let useSingleCurrencyValue: boolean | undefined = undefined
        let ruleCurrencyId: string | undefined = undefined
        if (expenseRuleId) {
          const ruleResp = await graphqlClient.request(getExpenseRulePkData, { expenseRuleId, activeUserLocale })
          useSingleCurrencyValue = ruleResp?.ExpenseRuleByPk?.useSingleCurrency
          ruleCurrencyId = ruleResp?.ExpenseRuleByPk?.currency?.id
        }
        const currencyToSet = currentCurrency || expensePlanData.ExpensePlanItem?.[0]?.currencyRef || ''
        setExpenseItemParams({
          expensePlanId: expensePlanData.ExpensePlanByPk.id,
          itemCurrency: useSingleCurrencyValue ? currencyToSet || ruleCurrencyId : currencyToSet,
          useSingleCurrency: !!useSingleCurrencyValue
        })
      } catch {
        setExpenseItemParams({
          expensePlanId: expensePlanData.ExpensePlanByPk.id,
          itemCurrency: currentCurrency || expensePlanData.ExpensePlanItem?.[0]?.currencyRef || '',
          useSingleCurrency: false
        })
      }
      setShowExpenseItem(true)
    })()
  }

  // Function to hide expense item component and return to wizard
  // Optional parameter to refetch expense plan data when returning from successful submission
  const hideExpenseItem = async (shouldRefetch: boolean = false) => {
    setShowExpenseItem(false)

    // If shouldRefetch is true, refetch the expense plan data
    if (shouldRefetch) {
      await fetchExpenseData()
    }
  }

  // Context value
  const contextValue: ExpensePlanWizardContextProps = {
    loading,
    employeeRuleId,
    setEmployeeRuleId,
    isFormValid,
    updateTripFormValidation,
    expenseRuleError,
    setExpenseRuleError,
    expensePlanData,
    setExpensePlanData,
    form,
    userInfo,
    currentTitle,
    setCurrentTitle,
    currentCurrency,
    setCurrentCurrency,
    submitActionTripData,
    // New properties for ExpenseItem integration
    showExpenseItem,
    setShowExpenseItem,
    expenseItemParams,
    setExpenseItemParams,
    showCreateItem,
    hideExpenseItem,
    refetchExpenseData: fetchExpenseData,
    // Deleted items management
    deletedItems,
    setDeletedItems,
    // Payload items tracking
    payloadItemsLoaded,
    setPayloadItemsLoaded,
    payloadItemIds,
    setPayloadItemIds,
    // Skip advance payment state
    requestAdvancePayment,
    setRequestAdvancePayment
  }

  return <ExpensePlanWizardContext.Provider value={contextValue}>{children}</ExpensePlanWizardContext.Provider>
}

/**
 * Hook to use the expense plan wizard context
 * @returns Expense plan wizard context
 */
export const useExpensePlanWizardContext = () => {
  const context = useContext(ExpensePlanWizardContext)
  if (context === undefined) {
    throw new Error('useExpensePlanWizardContext must be used within an ExpensePlanWizardProvider')
  }
  return context
}
