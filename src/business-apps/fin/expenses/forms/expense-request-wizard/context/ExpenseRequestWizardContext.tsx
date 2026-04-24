import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { Form } from 'antd'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { showToast } from '../../../utils/notificationUtils'
import {
  fetchEmployeeRule,
  fetchExpenseRequestAndItems,
  getAllowanceData,
  getTravelRegionsAndUser,
  getUserCostCenters,
  getUserProjects,
  getRuleAllowancePeriod,
  getExpenseRulePkData,
  getExpenseRulesDataQuery
} from '../ExpenseRequestWizardQueries'
import { toSortedCacheKey } from '../utils/cacheKeyUtils'
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
    overnightAccommodation?: boolean,
    overrideEmployeeRuleId?: string
  ) => boolean
  showExpenseItem: boolean
  setShowExpenseItem: (show: boolean) => void
  expenseItemParams: { expenseRequestId?: string; itemCurrency?: string; useSingleCurrency?: boolean; psi_taskPayload?: { psi_initialParameters?: { expenseId?: string } } }
  setExpenseItemParams: (params: {
    expenseRequestId?: string
    itemCurrency?: string
    useSingleCurrency?: boolean
    psi_taskPayload?: { psi_initialParameters?: { expenseId?: string } }
  }) => void
  showCreateItem: () => void
  showEditItem: (itemId: string) => void
  hideExpenseItem: (shouldRefetch?: boolean) => void
  refetchExpenseData: () => Promise<void>
  deletedItems: any[]
  setDeletedItems: (items: any[]) => void
  payloadItemsLoaded: boolean
  setPayloadItemsLoaded: (loaded: boolean) => void
  payloadItemIds: string[]
  setPayloadItemIds: (ids: string[]) => void
  showSelectItems: boolean
  setShowSelectItems: (show: boolean) => void
  /**
   * Fetches and caches expense rule data by (expenseRuleId, locale).
   * Used to avoid repeated getExpenseRulesDataQuery calls across screens.
   */
  getExpenseRulesDataCached: (expenseRuleId: string, activeUserLocale?: string) => Promise<any>
  /**
   * Fetches and caches allowance period rule by expenseRuleId.
   * Returns the first matching rule or null.
   */
  getAllowancePeriodRuleCached: (expenseRuleId: string) => Promise<unknown | null>
  /**
   * Fetches and caches travel regions + employee position by (expenseRuleId, employeeId, locale).
   */
  getTravelRegionsAndUserCached: (expenseRuleId: string, employeeId: string, activeUserLocale?: string) => Promise<any>
  /**
   * Fetches and caches user cost centers by structureId.
   */
  getUserCostCentersCached: (structureId: string) => Promise<any>
  /**
   * Fetches and caches user projects by a set of structureIds.
   * Cache key is order-independent (sorted list).
   */
  getUserProjectsCached: (structureIdArray: string[]) => Promise<any>
  /**
   * Fetches and caches allowance data by (employeeId, expenseRequestId, expenseRuleId, requestVersion, locale).
   * Including requestVersion makes the cache safely invalidate after save/next updates.
   */
  getAllowanceDataCached: (args: {
    employeeId: string
    expenseRequestId: string
    expenseRequestRuleId: string
    requestVersion?: number
    activeUserLocale?: string
  }) => Promise<any>
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
    psi_taskPayload?: { psi_initialParameters?: { expenseId?: string } }
  }>({})
  // State for deleted items that need to persist across navigation
  const [deletedItems, setDeletedItems] = useState<any[]>([])
  // State to track if payload items have been loaded
  const [payloadItemsLoaded, setPayloadItemsLoaded] = useState<boolean>(false)
  // State to track payload item IDs for exclusion from queries
  const [payloadItemIds, setPayloadItemIds] = useState<string[]>([])
  // State for "select items" sub-view on Items screen (so wizard back button can close it)
  const [showSelectItems, setShowSelectItems] = useState<boolean>(false)
  const graphqlClient = useGraphqlClient(accessToken)
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  /**
   * Wizard-session cache for repeated lookups with identical inputs.
   * Stores in-flight Promises to avoid duplicate requests (React 18 StrictMode/dev).
   */
  const queryCacheRef = useRef(new Map<string, any>())
  const getCachedOrFetch = useCallback((key: string, fetchFn: () => Promise<any>): Promise<any> => {
    const cache = queryCacheRef.current
    if (cache.has(key)) {
      return Promise.resolve(cache.get(key))
    }

    const inFlight = fetchFn()
      .then(result => {
        cache.set(key, result)
        return result
      })
      .catch(err => {
        cache.delete(key)
        throw err
      })

    cache.set(key, inFlight)
    return inFlight
  }, [])

  const getExpenseRulesDataCached = useCallback(
    async (expenseRuleId: string, activeUserLocale?: string) => {
      const locale = activeUserLocale ?? getCurrentActiveUserLocale()
      const cacheKey = `expenseRules:${expenseRuleId}:${locale}`
      return await getCachedOrFetch(cacheKey, () =>
        graphqlClient.request(getExpenseRulesDataQuery, {
          expenseRuleId,
          activeUserLocale: locale
        })
      )
    },
    [getCachedOrFetch, graphqlClient]
  )

  const getAllowancePeriodRuleCached = useCallback(
    async (expenseRuleId: string) => {
      const cacheKey = `allowancePeriod:${expenseRuleId}`
      const response = await getCachedOrFetch(cacheKey, () =>
        graphqlClient.request(getRuleAllowancePeriod, { expenseRuleId })
      )
      const first =
        response?.ExpenseRuleAllowancePeriod && Array.isArray(response.ExpenseRuleAllowancePeriod)
          ? response.ExpenseRuleAllowancePeriod[0]
          : null
      return first
    },
    [getCachedOrFetch, graphqlClient]
  )

  const getTravelRegionsAndUserCached = useCallback(
    async (expenseRuleId: string, employeeId: string, activeUserLocale?: string) => {
      const locale = activeUserLocale ?? getCurrentActiveUserLocale()
      const cacheKey = `travelRegionsAndUser:${expenseRuleId}:${employeeId}:${locale}`
      return await getCachedOrFetch(cacheKey, () =>
        graphqlClient.request(getTravelRegionsAndUser, {
          expenseRuleId,
          employeeId,
          activeUserLocale: locale
        })
      )
    },
    [getCachedOrFetch, graphqlClient]
  )

  const getUserCostCentersCached = useCallback(
    async (structureId: string) => {
      const cacheKey = `userCostCenters:${structureId}`
      return await getCachedOrFetch(cacheKey, () => graphqlClient.request(getUserCostCenters, { structureId }))
    },
    [getCachedOrFetch, graphqlClient]
  )

  const getUserProjectsCached = useCallback(
    async (structureIdArray: string[]) => {
      const normalized = toSortedCacheKey(structureIdArray || [], ',')
      const cacheKey = `userProjects:${normalized}`
      return await getCachedOrFetch(cacheKey, () =>
        graphqlClient.request(getUserProjects, {
          structureIdArray
        })
      )
    },
    [getCachedOrFetch, graphqlClient]
  )

  const getAllowanceDataCached = useCallback(
    async (args: {
      employeeId: string
      expenseRequestId: string
      expenseRequestRuleId: string
      requestVersion?: number
      activeUserLocale?: string
    }) => {
      const locale = args.activeUserLocale ?? getCurrentActiveUserLocale()
      const version = args.requestVersion ?? 0
      const cacheKey = `allowanceData:${args.employeeId}:${args.expenseRequestId}:${args.expenseRequestRuleId}:${version}:${locale}`
      return await getCachedOrFetch(cacheKey, () =>
        graphqlClient.request(getAllowanceData, {
          employeeId: args.employeeId,
          expenseRequestId: args.expenseRequestId,
          expenseRequestRuleId: args.expenseRequestRuleId
        })
      )
    },
    [getCachedOrFetch, graphqlClient]
  )

  // Fetch expense data when employeeRuleId is available
  // Made public so it can be called after expense item creation
  const fetchExpenseData = async () => {
    try {
      if (!accessToken || !employeeRuleId || !userInfo || !additionalData) return

      // Only show full-screen loading on initial load (no request data yet).
      // When refetching after e.g. trip Next, keep current screen visible with existing data.
      const isInitialLoad = !expenseRequestData
      if (isInitialLoad) {
        setLoading(true)
      }

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
   * @param overrideEmployeeRuleId - When set (e.g. from TripScreen validation), use this instead of context employeeRuleId and sync to context so next screen has it
   */
  const submitActionTripData = (
    startLocation: LocationData,
    destinations: LocationData[],
    endLocation: LocationData,
    expenseRulesData: any,
    event: string,
    overnightAccommodation?: boolean,
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
      expenseRequestData,
      ruleIdToUse,
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

  const showEditItem = (itemId: string) => {
    if (!employeeRuleId) return
    setExpenseItemParams({
      expenseRequestId: expenseRequestData.ExpenseRequestByPk.id,
      psi_taskPayload: {
        psi_initialParameters: {
          expenseId: itemId
        }
      }
    })
    setShowExpenseItem(true)
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

  // Context value (memoized to avoid unnecessary re-renders of consumers)
  const contextValue = useMemo<ExpenseRequestWizardContextProps>(
    () => ({
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
      showExpenseItem,
      setShowExpenseItem,
      expenseItemParams,
      setExpenseItemParams,
      showCreateItem,
      showEditItem,
      hideExpenseItem,
      refetchExpenseData: fetchExpenseData,
      deletedItems,
      setDeletedItems,
      payloadItemsLoaded,
      setPayloadItemsLoaded,
      payloadItemIds,
      setPayloadItemIds,
      showSelectItems,
      setShowSelectItems,
      getExpenseRulesDataCached,
      getAllowancePeriodRuleCached,
      getTravelRegionsAndUserCached,
      getUserCostCentersCached,
      getUserProjectsCached,
      getAllowanceDataCached
    }),
    [
      loading,
      employeeRuleId,
      isFormValid,
      expenseRuleError,
      expenseRequestData,
      form,
      userInfo,
      currentTitle,
      currentCurrency,
      submitActionTripData,
      showExpenseItem,
      expenseItemParams,
      deletedItems,
      payloadItemsLoaded,
      payloadItemIds,
      showSelectItems,
      fetchExpenseData
    ]
  )

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
