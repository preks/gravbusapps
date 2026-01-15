import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Form } from 'antd'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { showToast } from '../../../utils/notificationUtils'
import { fetchEmployeeRule, fetchExpenseRequestAndItems, getExpenseRulePkData } from '../ExpenseRequestWizardQueries'
import { handleTripSubmitAction } from '../utils/tripScreenUtils'
import { LocationData } from '../utils/types'
import { getCurrencyWithFallback } from '../utils/currencyUtils'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'

/**
 * ExpenseRequestWizardContext props interface
 */
export interface ExpenseRequestWizardContextProps {
  loading: boolean
  employeeRuleId: string | null
  setEmployeeRuleId: (id: string) => void
  isFormValid: boolean
  updateTripFormValidation: (isValid: boolean) => void
  expenseRuleError: string | null
  setExpenseRuleError: (error: string | null) => void
  expenseRequestData: any | null
  setExpenseRequestData: (data: any | null) => void
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
    overnightAccommodation?: boolean
  ) => boolean
  showExpenseItem: boolean
  setShowExpenseItem: (show: boolean) => void
  expenseItemParams: { expenseRequestId?: string; itemCurrency?: string; useSingleCurrency?: boolean }
  setExpenseItemParams: (params: {
    expenseRequestId?: string
    itemCurrency?: string
    useSingleCurrency?: boolean
  }) => void
  showCreateItem: () => void
  hideExpenseItem: (shouldRefetch?: boolean) => void
  refetchExpenseData: () => Promise<void>
  deletedItems: any[]
  setDeletedItems: (items: any[]) => void
  payloadItemsLoaded: boolean
  setPayloadItemsLoaded: (loaded: boolean) => void
  payloadItemIds: string[]
  setPayloadItemIds: (ids: string[]) => void
}

/**
 * ExpenseRequestWizardProvider props interface
 */
interface ExpenseRequestWizardProviderProps {
  children: ReactNode
  accessToken: string
  userInfo?: any
  additionalData?: any
}

/**
 * ExpenseRequestWizardContext
 */
export const ExpenseRequestWizardContext = createContext<ExpenseRequestWizardContextProps | undefined>(undefined)

/**
 * ExpenseRequestWizardProvider component
 * @param props - Provider props
 * @returns Provider component
 */
export const ExpenseRequestWizardProvider: React.FC<ExpenseRequestWizardProviderProps> = ({
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
  const [expenseRequestData, setExpenseRequestData] = useState<any | null>(null)

  // New state for ExpenseItem integration
  const [showExpenseItem, setShowExpenseItem] = useState<boolean>(false)
  const [expenseItemParams, setExpenseItemParams] = useState<{
    expenseRequestId?: string
    itemCurrency?: string
    useSingleCurrency?: boolean
  }>({})
  // State for deleted items that need to persist across navigation
  const [deletedItems, setDeletedItems] = useState<any[]>([])
  // State to track if payload items have been loaded
  const [payloadItemsLoaded, setPayloadItemsLoaded] = useState<boolean>(false)
  // State to track payload item IDs for exclusion from queries
  const [payloadItemIds, setPayloadItemIds] = useState<string[]>([])
  const graphqlClient = useGraphqlClient(accessToken)
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  // Fetch expense data when employeeRuleId is available
  // Made public so it can be called after expense item creation
  const fetchExpenseData = async () => {
    try {
      if (!accessToken || !employeeRuleId || !userInfo || !additionalData) return

      setLoading(true)

      if (!additionalData) {
        setLoading(false)
        return
      }

      // Extract expenseId from additionalData
      const expenseId = additionalData?.psi_taskPayload?.expenseRequest?.id
      if (!expenseId) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request_wizard.missing_expense_id',
            'Missing expense ID'
          ),
          'error'
        )
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
      const response = await graphqlClient.request(fetchExpenseRequestAndItems, variables)

      // Preserve any manually selected items that aren't part of the fetched data
      if (expenseRequestData?.ExpenseItem && Array.isArray(expenseRequestData.ExpenseItem)) {
        // Get IDs of items from the API response
        const fetchedItemIds = response.ExpenseItem?.map((item: any) => item.id) || []

        // Find manually selected items that aren't in the API response
        const manuallySelectedItems = expenseRequestData.ExpenseItem.filter(
          (item: any) => !fetchedItemIds.includes(item.id) && item.isManuallySelected
        )

        // Combine API items with manually selected items
        if (manuallySelectedItems.length > 0) {
          response.ExpenseItem = [...(response.ExpenseItem || []), ...manuallySelectedItems]
        }
      }

      setExpenseRequestData(response)
      // Ensure currentCurrency reflects freshly loaded data (avoid stale value after reload)
      const refreshedCurrencyId = response?.ExpenseRequestByPk?.currency?.id || null
      setCurrentCurrency(refreshedCurrencyId)
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_fetching_expense_data',
          'Error fetching expense data'
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
          showToast(t('lowcoder:create_expense_request_wizard.missing_employee_id', 'Missing employee ID'), 'error')
          setLoading(false)
          return
        }

        // Get current date
        const currentDate = new Date().toISOString()

        // Fetch employee rule using the imported function
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
    overnightAccommodation?: boolean
  ): boolean => {
    // Determine currency based on trip data
    const determinedCurrency = getCurrencyWithFallback(startLocation, destinations, endLocation, expenseRulesData)

    // Update currency in context
    setCurrentCurrency(determinedCurrency)

    return handleTripSubmitAction(
      startLocation,
      destinations,
      endLocation,
      expenseRulesData,
      expenseRequestData,
      employeeRuleId || '',
      currentTitle,
      determinedCurrency,
      event,
      overnightAccommodation,
      dispatchProcessContinueEventIfEnabled
    )
  }

  // Function to update trip form validation state
  const updateTripFormValidation = (isValid: boolean) => {
    setisFormValid(isValid)
  }

  // Function to show expense item component with the necessary parameters
  const showCreateItem = () => {
    if (!employeeRuleId) {
      return
    }
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
        const currencyToSet = currentCurrency || expenseRequestData.ExpenseItem?.[0]?.currencyRef || ''
        setExpenseItemParams({
          expenseRequestId: expenseRequestData.ExpenseRequestByPk.id,
          itemCurrency: useSingleCurrencyValue ? currencyToSet || ruleCurrencyId || '' : currencyToSet,
          useSingleCurrency: !!useSingleCurrencyValue
        })
      } catch {
        setExpenseItemParams({
          expenseRequestId: expenseRequestData.ExpenseRequestByPk.id,
          itemCurrency: currentCurrency || expenseRequestData.ExpenseItem?.[0]?.currencyRef || '',
          useSingleCurrency: false
        })
      }
      setShowExpenseItem(true)
    })()
  }

  // Function to hide expense item component and return to wizard
  // Optional parameter to refetch expense request data when returning from successful submission
  const hideExpenseItem = async (shouldRefetch: boolean = false) => {
    setShowExpenseItem(false)

    // If shouldRefetch is true, refetch the expense request data
    if (shouldRefetch) {
      await fetchExpenseData()
    }
  }

  // Context value
  const contextValue: ExpenseRequestWizardContextProps = {
    loading,
    employeeRuleId,
    setEmployeeRuleId,
    isFormValid,
    updateTripFormValidation,
    expenseRuleError,
    setExpenseRuleError,
    expenseRequestData,
    setExpenseRequestData,
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
    setPayloadItemIds
  }

  return <ExpenseRequestWizardContext.Provider value={contextValue}>{children}</ExpenseRequestWizardContext.Provider>
}

/**
 * Hook to use the expense request wizard context
 * @returns Expense request wizard context
 */
export const useExpenseRequestWizardContext = () => {
  const context = useContext(ExpenseRequestWizardContext)
  if (context === undefined) {
    throw new Error('useExpenseRequestWizardContext must be used within an ExpenseRequestWizardProvider')
  }
  return context
}
