import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'antd'
import { Button, Checkbox } from '@newwork/gravity-ui-catalog'
import { useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ICONS } from '../../../utils/icons'
import LocationContainer from '../components/LocationContainer/LocationContainer'
import LocationForm from '../components/LocationForm/LocationForm'

import { DestinationLimit, LocationData, TripScreenProps } from '../utils/types'
import { getMaxLimits, getMinLimits, getMinMaxLimits, validateAndSanitizeLocation } from '../utils/locationTimeUtils'
import {
  getRequestsAbsences,
  fetchEmployeeExpenseItemsFromPayloadForRuleCheck,
  fetchEmployeeRule
} from '../ExpenseRequestWizardQueries'
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext'
import { showToast } from '../../../utils/notificationUtils'
import LoadScreen from './LoadScreen'
import {
  REQUEST_STATUS,
  ABSENCE_STATUS,
  defaultDestination,
  defaultEndLocation,
  defaultStartLocation,
  EXCLUDED_STATUSES,
  TRIP_REQUEST_TYPE
} from '../constants/constants'
import { getOverlapWarningMessage } from '../utils/dateOverlapUtils'
import { combineDateTimeToISOString } from '../utils/locationTimeUtils'
import RejectionComment from '../components/RejectionComment'
import { EVENTS } from '../../../utils/constants'
import { mergeUniqueById } from '../../../utils/functionUtils'
import { toSortedCacheKey } from '../utils/cacheKeyUtils'
import { getLatestRejectComment, setByExternalCustomComponent, setLocalitiesDefault } from '../utils/tripScreenUtils'
import expenseRequestWizardTranslations from '../_i18n'

/**
 * Filters travel regions based on expense items' currency
 * @param items - Expense items with currency information
 * @param mainRule - Home region rule
 * @param otherRules - All available travel regions
 * @returns Filtered travel regions and flag indicating if all items use the same currency
 */
/**
 * Returns trip data array from expense request (from request trip or from plan).
 * Reduces cognitive complexity in loadInitialTripData.
 */
function getTripDataArrayFromRequest(expenseRequestData: any): any[] {
  const byPk = expenseRequestData?.ExpenseRequestByPk
  if (!byPk) return []
  const tripFromRequest =
    byPk.expenseRequestTrip && Array.isArray(byPk.expenseRequestTrip) && byPk.expenseRequestTrip.length > 0
  if (tripFromRequest) return byPk.expenseRequestTrip
  if (byPk.expensePlan?.expenseRequestTrip) return byPk.expensePlan.expenseRequestTrip
  return []
}

const filterRules = (items: any[], mainRule: any, otherRules: any[]) => {
  if (!items || !items.length || !mainRule || !otherRules) {
    return { sameRuleCurrency: false, valuesArray: otherRules || [] }
  }

  const ruleCurrency = mainRule.currency?.id
  if (!ruleCurrency) {
    return { sameRuleCurrency: false, valuesArray: otherRules || [] }
  }

  const allMatch = items.every(item => item.currencyId === ruleCurrency || item.currency === ruleCurrency)

  if (allMatch) {
    return {
      sameRuleCurrency: true,
      valuesArray: otherRules.filter(rule => rule.currency?.id === ruleCurrency)
    }
  }

  return {
    sameRuleCurrency: false,
    valuesArray: otherRules.filter(rule =>
      items.some(item => {
        const itemCurrency = item.currencyId || item.currency
        return itemCurrency === rule.currency?.id
      })
    )
  }
}

export const TripScreen: React.FC<TripScreenProps> = props => {
  const { accessToken, additionalData } = props
  const [form] = Form.useForm()
  const { t: tWizard } = useTranslation(expenseRequestWizardTranslations)
  const graphqlClient = useGraphqlClient(accessToken)
  const {
    expenseRequestData,
    employeeRuleId,
    currentTitle,
    submitActionTripData,
    setEmployeeRuleId,
    updateTripFormValidation,
    getExpenseRulesDataCached,
    getAllowancePeriodRuleCached
  } = useExpenseRequestWizardContext()
  const { userInfo } = props

  // Get expense items from additionalData if available
  const getExpenseItems = () => {
    if (additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems) {
      return additionalData.psi_taskPayload.psi_initialParameters.expenseItems
    }
    return []
  }

  // Get expense items
  const expenseItems = getExpenseItems()

  /**
   * Get filtered travel regions based on abroad status and expense items currency
   * @param isAbroad - Whether the location is abroad
   * @returns Filtered travel regions
   */
  const getFilteredTravelRegions = (isAbroad: boolean) => {
    // First filter by abroad status
    const baseRegions = isAbroad
      ? (expenseRulesData?.AllowanceRegionRuleDetail || []).filter((region: any) => region.home === false)
      : expenseRulesData?.AllowanceRegionRuleDetail || []

    // Then filter by expense items currency if items exist
    if (expenseItems && expenseItems.length > 0 && expenseRulesData?.homeRegionRule?.length > 0) {
      return filterRules(expenseItems, expenseRulesData.homeRegionRule[0], baseRegions).valuesArray
    }

    return baseRegions
  }

  const initialStartLocation: LocationData = defaultStartLocation

  const initialEndLocation: LocationData = defaultEndLocation

  const [startLocation, setStartLocation] = useState<LocationData>(initialStartLocation)
  const [endLocation, setEndLocation] = useState<LocationData>(initialEndLocation)

  const [expenseRulesData, setExpenseRulesData] = useState<any>(null)
  const [allowancePeriodRule, setAllowancePeriodRule] = useState<any | null>(null)
  const [showOvernightAccommodation, setShowOvernightAccommodation] = useState<boolean>(false)
  const [overnightAccommodation, setOvernightAccommodation] = useState<boolean>(true)

  const [locationsAreSynced, setLocationsAreSynced] = useState<boolean>(false)
  const lastAbsenceCheckKeyRef = useRef<string | null>(null)
  const lastRuleCheckKeyRef = useRef<string | null>(null)
  /** Session cache for repeated queries with same inputs (rule/allowance period/rule details) */
  const queryCacheRef = useRef(new Map<string, any>())

  const getCachedOrFetch = useCallback(async (key: string, fetchFn: () => Promise<any>): Promise<any> => {
    const cached = queryCacheRef.current.get(key)
    if (cached !== undefined) return cached
    const result = await fetchFn()
    queryCacheRef.current.set(key, result)
    return result
  }, [])

  const [startLocationOverlap, setStartLocationOverlap] = useState<{ message: string; isError: boolean } | null>(null)
  const [endLocationOverlap, setEndLocationOverlap] = useState<{ message: string; isError: boolean } | null>(null)
  const [employeeRuleError, setEmployeeRuleError] = useState<string | null>(null)
  const [ruleConflictError, setRuleConflictError] = useState<string | null>(null)
  const [payloadItemsForRuleCheck, setPayloadItemsForRuleCheck] = useState<
    Array<{ id: string; ruleId: string; code: string; title: string; ruleLabel?: string }>
  >([])
  const [isFetchingPayloadItems, setIsFetchingPayloadItems] = useState<boolean>(false)

  /** Rule id from date+time validation; not pushed to context until submit/next to avoid full-tree rerender */
  const validatedEmployeeRuleIdRef = useRef<string | null>(null)

  const validateEmployeeRule = async (
    startDate: Date | undefined,
    startTime: Date | undefined
  ): Promise<{ employeeRuleError: string | null; ruleConflictError: string | null }> => {
    if (!startDate) {
      return { employeeRuleError: null, ruleConflictError: null }
    }

    const employeeId = userInfo?.employeeDetails?.employeeId

    if (!accessToken || !employeeId) {
      return { employeeRuleError: null, ruleConflictError: null }
    }

    try {
      let dateString = startDate.toISOString()

      if (startTime) {
        const timeObj = new Date(startTime)
        const dateObj = new Date(startDate)
        dateObj.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds())
        dateString = dateObj.toISOString()
      }

      const ruleData = await fetchEmployeeRule(employeeId, dateString, accessToken)
      if (!ruleData) {
        const errorMessage = getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_item.missing_expense_rule_message',
          'There is no rule set for your user, please reach out to your administrator.'
        )
        return { employeeRuleError: errorMessage, ruleConflictError: null }
      }

      const ruleDataValue = ruleData.id || ruleData.expenseRuleId
      if (ruleDataValue) {
        validatedEmployeeRuleIdRef.current = ruleDataValue
        try {
          const activeUserLocale = getCurrentActiveUserLocale()
          const rulesResponse = await getExpenseRulesDataCached(ruleDataValue, activeUserLocale)
          setExpenseRulesData(rulesResponse)
          const first = await getAllowancePeriodRuleCached(ruleDataValue)
          setAllowancePeriodRule(first)
        } catch {
          // Keep previous rules/allowance on fetch error
        }
        const conflictError = await checkRuleConflicts(ruleDataValue)
        return { employeeRuleError: null, ruleConflictError: conflictError }
      }

      return { employeeRuleError: null, ruleConflictError: null }
    } catch {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.missing_expense_rule_message',
        'There is no rule set for your user, please reach out to your administrator.'
      )
      return { employeeRuleError: errorMessage, ruleConflictError: null }
    }
  }

  const checkPlanRuleConflict = useCallback(
    async (newRuleId: string, planValue: { expenseRuleId?: string }): Promise<string | null> => {
      if (!planValue.expenseRuleId || planValue.expenseRuleId === newRuleId) return null
      try {
        const getRuleDetailsQuery = `query getRuleDetails($requestRuleId: uuid!, $planRuleId: uuid!) {
            requestRule: ExpenseRuleByPk(id: $requestRuleId) { code name }
            planRule: ExpenseRuleByPk(id: $planRuleId) { code name }
          }`
        const ruleDetailsCacheKey = `ruleDetailsPlan:${toSortedCacheKey([newRuleId, planValue.expenseRuleId], ':')}`
        const ruleDetails = await getCachedOrFetch(ruleDetailsCacheKey, () =>
          graphqlClient.request(getRuleDetailsQuery, {
            requestRuleId: newRuleId,
            planRuleId: planValue.expenseRuleId
          })
        )
        const requestRuleCode = ruleDetails?.requestRule?.code || newRuleId
        const requestRuleName = ruleDetails?.requestRule?.name || ''
        const planRuleCode = ruleDetails?.planRule?.code || planValue.expenseRuleId
        const planRuleName = ruleDetails?.planRule?.name || ''
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_and_plan_rule_conflict_message',
          `The expense request uses the rule ${requestRuleCode} ${requestRuleName}, but the expense plan uses the rule ${planRuleCode} ${planRuleName}. They don't fit. Please reach out to your supervisor or expense expert.`,
          {
            codeRequest: requestRuleCode,
            nameRequest: requestRuleName,
            codePlan: planRuleCode,
            namePlan: planRuleName,
            interpolation: { escapeValue: false }
          }
        )
      } catch {
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_and_plan_rule_conflict_message',
          `The expense request uses the rule ${newRuleId}, but the expense plan uses the rule ${planValue.expenseRuleId}. They don't fit. Please reach out to your supervisor or expense expert.`,
          {
            codeRequest: newRuleId,
            nameRequest: '',
            codePlan: planValue.expenseRuleId,
            namePlan: '',
            interpolation: { escapeValue: false }
          }
        )
      }
    },
    [getCachedOrFetch, graphqlClient]
  )

  const checkItemRuleConflict = useCallback(
    async (newRuleId: string, mismatchedItem: { ruleId: string; ruleLabel?: string }): Promise<string | null> => {
      try {
        const getRuleDetailsItemQuery = `query getRuleDetails($requestRuleId: uuid!, $itemRuleId: uuid!) {
            requestRule: ExpenseRuleByPk(id: $requestRuleId) { code name }
            itemRule: ExpenseRuleByPk(id: $itemRuleId) { code name }
          }`
        const ruleDetailsCacheKey = `ruleDetailsItem:${toSortedCacheKey([newRuleId, mismatchedItem.ruleId], ':')}`
        const ruleDetails = await getCachedOrFetch(ruleDetailsCacheKey, () =>
          graphqlClient.request(getRuleDetailsItemQuery, {
            requestRuleId: newRuleId,
            itemRuleId: mismatchedItem.ruleId
          })
        )
        const requestRuleCode = ruleDetails?.requestRule?.code || newRuleId
        const requestRuleName = ruleDetails?.requestRule?.name || ''
        const itemRuleCode = ruleDetails?.itemRule?.code || mismatchedItem.ruleLabel || mismatchedItem.ruleId
        const itemRuleName = ruleDetails?.itemRule?.name || ''
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_and_item_rule_conflict_message',
          `The expense request uses the rule ${requestRuleCode} ${requestRuleName}, but the expense item uses the rule ${itemRuleCode} ${itemRuleName}. They don't fit. Please reach out to your supervisor or expense expert.`,
          {
            codeRequest: requestRuleCode,
            nameRequest: requestRuleName,
            codeItem: itemRuleCode,
            nameItem: itemRuleName,
            interpolation: { escapeValue: false }
          }
        )
      } catch {
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_and_item_rule_conflict_message',
          `The expense request uses the rule ${newRuleId}, but the expense item uses the rule ${mismatchedItem.ruleId}. They don't fit. Please reach out to your supervisor or expense expert.`,
          {
            codeRequest: newRuleId,
            nameRequest: '',
            codeItem: mismatchedItem.ruleId,
            nameItem: '',
            interpolation: { escapeValue: false }
          }
        )
      }
    },
    [getCachedOrFetch, graphqlClient]
  )

  const checkEmployeeRuleConflict = useCallback(
    async (newRuleId: string, requestStoredRuleId: string): Promise<string | null> => {
      try {
        const getRuleDetailsQuery = `query getRuleDetails($requestRuleId: uuid!, $employeeRuleId: uuid!) {
            requestRule: ExpenseRuleByPk(id: $requestRuleId) { code name }
            employeeRule: ExpenseRuleByPk(id: $employeeRuleId) { code name }
          }`
        const ruleDetailsCacheKey = `ruleDetailsRequestVsEmployee:${toSortedCacheKey([requestStoredRuleId, newRuleId], ':')}`
        const ruleDetails = await getCachedOrFetch(ruleDetailsCacheKey, () =>
          graphqlClient.request(getRuleDetailsQuery, {
            requestRuleId: requestStoredRuleId,
            employeeRuleId: newRuleId
          })
        )
        const requestRuleLabel =
          [ruleDetails?.requestRule?.code, ruleDetails?.requestRule?.name].filter(Boolean).join(' ') ||
          requestStoredRuleId
        const employeeRuleLabel =
          [ruleDetails?.employeeRule?.code, ruleDetails?.employeeRule?.name].filter(Boolean).join(' ') || newRuleId
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_rule_vs_employee_rule_message',
          tWizard('request-rule-vs-employee-rule-message', {
            requestRule: requestRuleLabel,
            employeeRule: employeeRuleLabel
          })
        )
      } catch {
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_rule_vs_employee_rule_message',
          tWizard('request-rule-vs-employee-rule-message', {
            requestRule: requestStoredRuleId,
            employeeRule: newRuleId
          })
        )
      }
    },
    [getCachedOrFetch, graphqlClient, tWizard]
  )

  const checkRuleConflicts = useCallback(
    async (newRuleId: string): Promise<string | null> => {
      const requestValue = expenseRequestData?.ExpenseRequestByPk
      if (!requestValue) return null

      if (requestValue.expensePlan) {
        const planError = await checkPlanRuleConflict(newRuleId, requestValue.expensePlan)
        if (planError) return planError
      }

      const requestItems: Array<{ id: string; code: string; title: string; ruleId: string; ruleLabel?: string }> = []
      if (expenseRequestData?.ExpenseItem && Array.isArray(expenseRequestData.ExpenseItem)) {
        expenseRequestData.ExpenseItem.forEach((item: any) => {
          if (item) {
            const itemRuleLabel = [item?.expenseRule?.code, item?.expenseRule?.name].filter(Boolean).join(' ')
            requestItems.push({
              id: item.id,
              code: item.code || '',
              title: item.title || '',
              ruleId: item.expenseRuleId || '',
              ruleLabel: itemRuleLabel || undefined
            })
          }
        })
      }

      const additionalItems: Array<{ id: string; code: string; title: string; ruleId: string; ruleLabel?: string }> = []
      if (
        additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems &&
        Array.isArray(additionalData.psi_taskPayload.psi_initialParameters.expenseItems)
      ) {
        additionalData.psi_taskPayload.psi_initialParameters.expenseItems.forEach((item: any) => {
          const itemId = item.itemId || item.id
          if (!itemId) return
          const itemRuleLabel = [item?.expenseRule?.code, item?.expenseRule?.name].filter(Boolean).join(' ')
          additionalItems.push({
            id: itemId,
            code: item.code || '',
            title: item.title || '',
            ruleId: item.expenseRuleId || '',
            ruleLabel: itemRuleLabel || undefined
          })
        })
      }

      let items = mergeUniqueById(requestItems, additionalItems)
      if (payloadItemsForRuleCheck.length > 0) {
        items = mergeUniqueById(items, payloadItemsForRuleCheck)
      }

      const mismatchedItem = items.find((item: { ruleId: string }) => item.ruleId && item.ruleId !== newRuleId)
      if (mismatchedItem) {
        const itemError = await checkItemRuleConflict(newRuleId, mismatchedItem)
        if (itemError) return itemError
      }

      const requestStoredRuleId = requestValue.expenseRuleId
      if (requestStoredRuleId && requestStoredRuleId !== newRuleId) {
        return await checkEmployeeRuleConflict(newRuleId, requestStoredRuleId)
      }

      return null
    },
    [
      expenseRequestData,
      additionalData,
      payloadItemsForRuleCheck,
      checkPlanRuleConflict,
      checkItemRuleConflict,
      checkEmployeeRuleConflict
    ]
  )

  const checkAbsencesAndRequests = async (
    startDate: Date | undefined,
    startTime: Date | undefined,
    endDate: Date | undefined,
    endTime: Date | undefined,
    isEndLocation: boolean = false
  ) => {
    setStartLocationOverlap(null)
    setEndLocationOverlap(null)
    if (!startDate) {
      return
    }

    if (!isEndLocation) {
      // Only fetch/validate employee rule when both date and time are selected
      if (startDate && startTime) {
        const errors = await validateEmployeeRule(startDate, startTime)
        setEmployeeRuleError(errors.employeeRuleError)
        setRuleConflictError(errors.ruleConflictError)
        if (errors.employeeRuleError || errors.ruleConflictError) {
          return
        }
      } else {
        setEmployeeRuleError(null)
        setRuleConflictError(null)
      }
    }

    const employeeId = userInfo?.employeeDetails?.employeeId

    if (!accessToken || !employeeId || !expenseRequestData) {
      return
    }

    try {
      const activeUserLocale = getCurrentActiveUserLocale()
      const expenseId = expenseRequestData?.ExpenseRequestByPk?.id
      const expensePlanId = expenseRequestData?.ExpenseRequestByPk?.expensePlanId

      if (!expenseId) {
        return
      }

      const startTimeValue = combineDateTimeToISOString(
        startDate,
        startTime,
        combineDateTimeToISOString(endDate, endTime)
      )
      const endTimeValue = combineDateTimeToISOString(
        endDate,
        endTime,
        combineDateTimeToISOString(startDate, startTime)
      )
      let finalStartDate = startTimeValue
      let finalEndDate = endTimeValue
      try {
        if (finalStartDate && finalEndDate && new Date(finalStartDate).getTime() > new Date(finalEndDate).getTime()) {
          const temporaryValue = finalStartDate
          finalStartDate = finalEndDate
          finalEndDate = temporaryValue
        }
      } catch {}

      const variables = {
        employeeId: employeeId,
        requestType: TRIP_REQUEST_TYPE,
        absenceStatus: ABSENCE_STATUS,
        statusArray: EXCLUDED_STATUSES,
        requestId: expenseId,
        activeUserLocale,
        startTimeValue: finalStartDate,
        endTimeValue: finalEndDate
      }

      const dedupeKey = JSON.stringify({
        employeeId,
        expenseId,
        expensePlanId,
        startTimeValue: finalStartDate,
        endTimeValue: finalEndDate
      })
      if (lastAbsenceCheckKeyRef.current === dedupeKey) {
        return
      }
      lastAbsenceCheckKeyRef.current = dedupeKey
      try {
        const response = await graphqlClient.request(getRequestsAbsences, variables)
        // Prevent stale responses from overwriting newer state
        if (lastAbsenceCheckKeyRef.current !== dedupeKey) {
          return
        }
        const overlapWarning = getOverlapWarningMessage(response, expensePlanId)
        if (isEndLocation) {
          setEndLocationOverlap(overlapWarning)
        } else {
          setStartLocationOverlap(overlapWarning)
        }
      } catch {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:modify_expense_request.error_fetching_expense_data',
            'Error fetching expense data'
          ),
          'error'
        )
      }
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_fetching_expense_data',
          'Error fetching expense data'
        ),
        'error'
      )
    }
  }

  const handleStartLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, startLimits)

    const wereSynced = locationsAreSynced && startLocation.location === endLocation.location

    if (startLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef
    }
    setStartLocation(sanitizedLocation)
    if (wereSynced) {
      setEndLocation(prevEndLocation => ({
        ...prevEndLocation,
        location: sanitizedLocation.location
      }))
    } else {
      setLocationsAreSynced(sanitizedLocation.location === endLocation.location)
    }
  }

  // Fetch allowance period rule for employee rule id (cached per employeeRuleId)
  useEffect(() => {
    const fetchAllowancePeriod = async () => {
      try {
        if (!accessToken || !employeeRuleId) return
        const first = await getAllowancePeriodRuleCached(employeeRuleId)
        setAllowancePeriodRule(first)
      } catch {
        setAllowancePeriodRule(null)
      }
    }
    fetchAllowancePeriod()
  }, [accessToken, employeeRuleId, getAllowancePeriodRuleCached])

  // Determine checkbox visibility: show if rule exists and dates are consecutive calendar days
  useEffect(() => {
    try {
      if (!allowancePeriodRule) {
        setShowOvernightAccommodation(false)
        return
      }
      const startDate = startLocation.departureDate ? dayjs(startLocation.departureDate).startOf('day') : null
      const endDate = endLocation.departureDate ? dayjs(endLocation.departureDate).startOf('day') : null
      if (!startDate || !endDate) {
        setShowOvernightAccommodation(false)
        return
      }
      const diffDays = endDate.diff(startDate, 'day')
      setShowOvernightAccommodation(diffDays === 1)
    } catch {
      setShowOvernightAccommodation(false)
    }
  }, [allowancePeriodRule, startLocation.departureDate, endLocation.departureDate])

  // Enforce accommodation value based on trip length
  useEffect(() => {
    try {
      const startDate = startLocation.departureDate ? dayjs(startLocation.departureDate).startOf('day') : null
      const endDate = endLocation.departureDate ? dayjs(endLocation.departureDate).startOf('day') : null
      if (!startDate || !endDate) {
        return
      }
      const diffDays = endDate.diff(startDate, 'day')
      if (diffDays < 1) {
        if (overnightAccommodation !== false) setOvernightAccommodation(false)
      } else if (diffDays > 1) {
        if (overnightAccommodation !== true) setOvernightAccommodation(true)
      } else {
        // diffDays === 1 → keep current checkbox state (user-controlled)
      }
    } catch {}
  }, [startLocation.departureDate, endLocation.departureDate, overnightAccommodation])

  const handleEndLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, endLimits)
    if (endLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef
    }
    setEndLocation(sanitizedLocation)
    setLocationsAreSynced(sanitizedLocation.location === startLocation.location)
  }

  /**
   * Loads and prefills trip form from expense request/plan data.
   * Reuses rulesAlreadyFetched when the rule for the trip start date matches context's employeeRuleId.
   * @param rulesAlreadyFetched - Optional rules already fetched for current employeeRuleId (from init effect)
   */
  const loadInitialTripData = async (rulesAlreadyFetched?: any) => {
    try {
      const myData = getTripDataArrayFromRequest(expenseRequestData)
      if (myData.length === 0) {
        setLocalitiesDefault(expenseRequestData, setStartLocation, setEndLocation, setLocationsAreSynced)
        return
      }
      const startObject = myData.find((item: any) => item.pointType === 'START_POINT')
      const endObject = myData.find((item: any) => item.pointType === 'END_POINT')

      if (startObject?.tripDateTime && dayjs(startObject.tripDateTime).isValid()) {
        const formattedDate = dayjs(startObject.tripDateTime).format('YYYY-MM-DDTHH:mm:ss.SSSZZ')

        const employeeId = userInfo?.employeeDetails?.employeeId
        if (!employeeId) {
          showToast(
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:modify_expense_request.missing_employee_id',
              'Missing employee ID'
            ),
            'error'
          )
          return
        }

        const employeeRuleData = await fetchEmployeeRule(employeeId, formattedDate, accessToken)
        const ruleIdForTripDate = employeeRuleData?.expenseRuleId ?? employeeRuleData?.id

        if (ruleIdForTripDate) {
          const canReuseRules = rulesAlreadyFetched && employeeRuleId && ruleIdForTripDate === employeeRuleId

          if (canReuseRules) {
            setByExternalCustomComponent(
              expenseRequestData,
              rulesAlreadyFetched,
              setStartLocation,
              setDestinations,
              setEndLocation
            )
          } else {
            setEmployeeRuleId(ruleIdForTripDate)
            const activeUserLocale = getCurrentActiveUserLocale()
            const rulesResponse = await getExpenseRulesDataCached(ruleIdForTripDate, activeUserLocale)
            setExpenseRulesData(rulesResponse)
            setByExternalCustomComponent(
              expenseRequestData,
              rulesResponse,
              setStartLocation,
              setDestinations,
              setEndLocation
            )
          }
        } else {
          setByExternalCustomComponent(expenseRequestData, null, setStartLocation, setDestinations, setEndLocation)
        }

        // Initialize accommodation considering stored value priority when version != 0
        try {
          const startDate = startObject?.tripDateTime ? dayjs(startObject.tripDateTime).startOf('day') : null
          const endDate = endObject?.tripDateTime ? dayjs(endObject.tripDateTime).startOf('day') : null
          const stored = expenseRequestData?.ExpenseRequestByPk?.overnightAccommodation
          const version = expenseRequestData?.ExpenseRequestByPk?.version ?? 0
          if (startDate && endDate) {
            const diffDays = endDate.diff(startDate, 'day')
            const versionZero = version === 0
            if (diffDays < 1) {
              setOvernightAccommodation(false)
            } else if (diffDays > 1) {
              setOvernightAccommodation(true)
            } else {
              // Exactly 2 days
              if ((versionZero || version !== 0) && typeof stored === 'boolean') {
                setOvernightAccommodation(stored)
              } else {
                setOvernightAccommodation(true) // default checked for 2 days
              }
            }
          }
        } catch {}
      } else {
        setByExternalCustomComponent(
          expenseRequestData,
          rulesAlreadyFetched ?? null,
          setStartLocation,
          setDestinations,
          setEndLocation
        )
      }
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_load_trip_data',
          'Error loading initial trip data'
        ),
        'error'
      )
    }
  }
  const [destinations, setDestinations] = useState<LocationData[]>([defaultDestination])

  const startLimits = useMemo(() => getMaxLimits(destinations, endLocation), [destinations, endLocation])

  const endLimits = useMemo(() => getMinLimits(startLocation, destinations), [startLocation, destinations])

  const destinationLimits: DestinationLimit = useMemo(
    () =>
      destinations.reduce((acc, destination) => {
        const limits = getMinMaxLimits(startLocation, endLocation, destinations, destination)

        return {
          ...acc,
          [destination.id]: limits
        }
      }, {}),
    [startLocation, destinations, endLocation]
  )
  const toggleLocationCollapse = (setLocation: React.Dispatch<React.SetStateAction<LocationData>>) => {
    setLocation(prev => ({
      ...prev,
      isCollapsed: !prev.isCollapsed
    }))
  }

  const toggleDestinationCollapse = (id: string) => {
    setDestinations(prev => prev.map(dest => (dest.id === id ? { ...dest, isCollapsed: !dest.isCollapsed } : dest)))
  }

  const updateDestination = (id: string, field: string, value: any) => {
    setDestinations(prev =>
      prev.map(destination => {
        if (destination.id !== id) return destination

        const updatedDestination = { ...destination, [field]: value }
        if (field === 'isAbroad' && destination.isAbroad && !value && expenseRulesData?.homeRegionRule?.length > 0) {
          updatedDestination.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef
        }

        const limits = getMinMaxLimits(startLocation, endLocation, prev, destination)

        return validateAndSanitizeLocation(updatedDestination, limits)
      })
    )
  }

  const addDestination = () => {
    const newId = `destination-${destinations.length + 1}`
    setDestinations(prev => [
      ...prev,
      {
        id: newId,
        name: 'Destination',
        isAbroad: false,
        location: '',
        departureDate: undefined,
        departureTime: undefined,
        isCollapsed: false,
        travelRegionRef: undefined
      }
    ])
  }

  const removeDestination = (id: string) => {
    setDestinations(prev => prev.filter(dest => dest.id !== id))
  }

  useEffect(() => {
    if (accessToken && userInfo?.employeeDetails && expenseRequestData) {
      if (startLocation.departureDate || startLocation.departureTime) {
        checkAbsencesAndRequests(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          false
        )
      }

      if (endLocation.departureDate || endLocation.departureTime) {
        checkAbsencesAndRequests(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          true
        )
      }
    }
  }, [
    accessToken,
    userInfo,
    expenseRequestData,
    startLocation.departureDate,
    startLocation.departureTime,
    endLocation.departureDate,
    endLocation.departureTime
  ])

  // Run rule conflict check whenever Trip has items (from request or initial params) so error shows from start and after entering start date
  const hasItemsFromRequest = (expenseRequestData?.ExpenseItem?.length ?? 0) > 0
  const hasItemsFromInitialParams =
    Array.isArray(additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems) &&
    additionalData.psi_taskPayload.psi_initialParameters.expenseItems.length > 0
  const hasAnyItemsToCheck = hasItemsFromRequest || hasItemsFromInitialParams

  useEffect(() => {
    const runRuleCheck = async () => {
      if (!accessToken || !userInfo?.employeeDetails || !expenseRequestData || !hasAnyItemsToCheck) return
      if (isFetchingPayloadItems) return

      // Only fetch/validate employee rule when both date and time are selected (avoids rerender on date-only)
      const hasDate = !!startLocation.departureDate
      const hasTime = !!startLocation.departureTime
      if (!hasDate || !hasTime) {
        setEmployeeRuleError(null)
        setRuleConflictError(null)
        validatedEmployeeRuleIdRef.current = null
        return
      }

      // Deduplicate: only run check when date or items change (prevent flicker loop)
      const requestItemIds =
        expenseRequestData?.ExpenseItem?.map((item: any) => item.id)
          .sort()
          .join(',') || ''
      const payloadItemIds =
        additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems
          ?.map((item: any) => item.itemId || item.id)
          .sort()
          .join(',') || ''
      const dateKey = startLocation.departureDate ? new Date(startLocation.departureDate).toISOString() : 'no-date'
      const checkKey = `${dateKey}|${startLocation.departureTime ?? 'no-time'}|${requestItemIds}|${payloadItemIds}`

      if (lastRuleCheckKeyRef.current === checkKey) {
        return
      }

      lastRuleCheckKeyRef.current = checkKey

      const dateToUse = startLocation.departureDate ? new Date(startLocation.departureDate) : new Date()
      const timeToUse = startLocation.departureTime ?? undefined

      // If payload items don't have expenseRuleId, fetch items so we have rule IDs for the conflict check
      if (
        hasItemsFromInitialParams &&
        !hasItemsFromRequest &&
        additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems
      ) {
        const payloadItems = additionalData.psi_taskPayload.psi_initialParameters.expenseItems
        const itemsWithoutRuleId = payloadItems.filter((item: any) => !item.expenseRuleId && (item.itemId || item.id))

        if (itemsWithoutRuleId.length > 0) {
          try {
            setIsFetchingPayloadItems(true)
            const employeeId = userInfo.employeeDetails.employeeId
            const itemIdsToFetch = itemsWithoutRuleId.map((item: any) => item.itemId || item.id)

            const itemCurrency =
              expenseRequestData?.ExpenseRequestByPk?.currencyRef ||
              payloadItems.find((item: any) => item.currencyId)?.currencyId ||
              ''

            const variables = {
              employeeId,
              status: REQUEST_STATUS.CREATED,
              idsArray: itemIdsToFetch,
              itemCurrency
            }

            const response = await graphqlClient.request(fetchEmployeeExpenseItemsFromPayloadForRuleCheck, variables)
            const fetchedItems = response?.ExpenseItemEmployee || []

            const itemsForRuleCheck = fetchedItems.map((item: any) => ({
              id: item.id,
              code: item.code || '',
              title: item.title || '',
              ruleId: item.expenseRuleId || '',
              ruleLabel: [item?.expenseRule?.code, item?.expenseRule?.name].filter(Boolean).join(' ') || undefined
            }))

            setPayloadItemsForRuleCheck(itemsForRuleCheck)
          } catch {
            // If fetch fails, run the check anyway with whatever we have
          } finally {
            setIsFetchingPayloadItems(false)
          }
        }
      }

      const errors = await validateEmployeeRule(dateToUse, timeToUse)
      setEmployeeRuleError(errors.employeeRuleError)
      setRuleConflictError(errors.ruleConflictError)
    }

    runRuleCheck()
  }, [
    accessToken,
    userInfo?.employeeDetails,
    expenseRequestData,
    hasAnyItemsToCheck,
    hasItemsFromRequest,
    hasItemsFromInitialParams,
    startLocation.departureDate,
    startLocation.departureTime,
    isFetchingPayloadItems,
    additionalData
  ])

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !employeeRuleId || !expenseRequestData) return

      try {
        const activeUserLocale = getCurrentActiveUserLocale()

        const expenseId = expenseRequestData?.ExpenseRequestByPk?.id
        if (!expenseId) {
          showToast(
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.error_missing_user_info',
              'Missing user information'
            ),
            'error'
          )
          return
        }

        const rulesResponse = await getExpenseRulesDataCached(employeeRuleId, activeUserLocale)

        setExpenseRulesData(rulesResponse)

        // Only prefill trip from request when form is not yet filled (avoids overwriting user's date/time)
        if (!startLocation.departureDate) {
          await loadInitialTripData(rulesResponse)
        }
      } catch {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:modify_expense_request.error_fetching_expense_data',
            'Error fetching expense data'
          ),
          'error'
        )
      }
    }

    fetchData()
  }, [accessToken, employeeRuleId, expenseRequestData, additionalData, setEmployeeRuleId])
  const validateTripForm = useCallback(() => {
    if (employeeRuleError || ruleConflictError) {
      updateTripFormValidation(false)
      return false
    }

    if (startLocationOverlap?.isError === true || endLocationOverlap?.isError === true) {
      updateTripFormValidation(false)
      return false
    }

    if (
      !startLocation.location ||
      !startLocation.departureDate ||
      !startLocation.departureTime ||
      (startLocation.isAbroad && !startLocation.travelRegionRef)
    ) {
      updateTripFormValidation(false)
      return false
    }

    for (let i = 0; i < destinations.length; i++) {
      const destination = destinations[i]

      if (!destination.location || (destination.isAbroad && !destination.travelRegionRef)) {
        updateTripFormValidation(false)
        return false
      }

      if (i < destinations.length - 1) {
        if (!destination.departureDate || !destination.departureTime) {
          updateTripFormValidation(false)
          return false
        }
      }
    }

    if (
      !endLocation.location ||
      !endLocation.departureDate ||
      !endLocation.departureTime ||
      (endLocation.isAbroad && !endLocation.travelRegionRef)
    ) {
      updateTripFormValidation(false)
      return false
    }

    updateTripFormValidation(true)
    return true
  }, [
    startLocation,
    destinations,
    endLocation,
    employeeRuleError,
    ruleConflictError,
    startLocationOverlap,
    endLocationOverlap,
    updateTripFormValidation
  ])

  useEffect(() => {
    validateTripForm()
  }, [
    startLocation,
    destinations,
    endLocation,
    employeeRuleError,
    ruleConflictError,
    startLocationOverlap,
    endLocationOverlap,
    validateTripForm
  ])

  const resolveOvernightAccommodation = (): boolean => {
    const saved = expenseRequestData?.ExpenseRequestByPk?.overnightAccommodation
    // Checkbox should be user-controllable; keep stored-only priority for submissions if dates missing
    const startDate = startLocation.departureDate ? dayjs(startLocation.departureDate).startOf('day') : null
    const endDate = endLocation.departureDate ? dayjs(endLocation.departureDate).startOf('day') : null
    if (startDate && endDate) {
      const diffDays = endDate.diff(startDate, 'day')
      if (diffDays < 1) return false // < 2 days
      if (diffDays > 1) return true // > 2 days
      // exactly 2 days → use checkbox state; if undefined, fallback to saved or true
      if (typeof overnightAccommodation === 'boolean') return overnightAccommodation
      if (typeof saved === 'boolean') return saved
      return true
    }
    // Fallback when dates missing: prefer saved, else current state
    if (typeof saved === 'boolean') return saved
    return !!overnightAccommodation
  }

  const handleSave = () => {
    submitActionTripData(
      startLocation,
      destinations,
      endLocation,
      expenseRulesData,
      EVENTS.SAVE,
      resolveOvernightAccommodation(),
      validatedEmployeeRuleIdRef.current ?? undefined
    )
  }

  const handleNext = () => {
    console.log('[TripScreen countryRef debug] handleNext called', {
      hasExpenseRulesData: !!expenseRulesData,
      expenseRulesDataKeys: expenseRulesData ? Object.keys(expenseRulesData) : [],
      AllowanceRegionRuleDetailLength: expenseRulesData?.AllowanceRegionRuleDetail?.length ?? 0,
      startLocationTravelRegionRef: startLocation?.travelRegionRef,
      endLocationTravelRegionRef: endLocation?.travelRegionRef,
      destinationsCount: destinations?.length,
      destinationTravelRegionRefs: destinations?.map((d, i) => ({ i, travelRegionRef: d?.travelRegionRef }))
    })
    if (validateTripForm()) {
      console.log('[TripScreen countryRef debug] validateTripForm passed, calling submitActionTripData')
      try {
        submitActionTripData(
          startLocation,
          destinations,
          endLocation,
          expenseRulesData,
          EVENTS.NEXT,
          resolveOvernightAccommodation(),
          validatedEmployeeRuleIdRef.current ?? undefined
        )
        console.log('[TripScreen countryRef debug] submitActionTripData returned successfully')
      } catch (err) {
        console.error('[TripScreen countryRef debug] Error on Next (submitActionTripData)', {
          error: err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          countryRefContext: {
            expenseRulesDataAllowanceDetails: expenseRulesData?.AllowanceRegionRuleDetail?.map((d: any) => ({
              travelRegionRef: d?.travelRegionRef,
              countryRef: d?.countryRef,
              home: d?.home
            }))
          }
        })
        throw err
      }
    } else {
      console.log('[TripScreen countryRef debug] validateTripForm failed, not submitting')
    }
  }

  useEffect(() => {
    const saveEventHandler = () => {
      handleSave()
    }
    document.addEventListener('expense-request-save-trip', saveEventHandler)
    return () => {
      document.removeEventListener('expense-request-save-trip', saveEventHandler)
    }
  }, [
    startLocation,
    destinations,
    endLocation,
    expenseRulesData,
    showOvernightAccommodation,
    overnightAccommodation,
    currentTitle
  ])

  useEffect(() => {
    const nextEventHandler = () => {
      handleNext()
    }
    document.addEventListener('expense-request-next-trip', nextEventHandler)
    return () => {
      document.removeEventListener('expense-request-next-trip', nextEventHandler)
    }
  }, [
    startLocation,
    destinations,
    endLocation,
    expenseRulesData,
    validateTripForm,
    showOvernightAccommodation,
    overnightAccommodation,
    currentTitle
  ])

  if (!expenseRequestData) {
    return <LoadScreen accessToken={accessToken} userInfo={userInfo} />
  }

  const latestRejectComment = getLatestRejectComment(expenseRequestData)

  return (
    <div className="gba:flex gba:flex-col gba:w-[100%]" data-testid="expense-request-wizard-trip-screen">
      <Form form={form} layout="vertical">
        <div
          className="gba:flex gba:flex-col"
          style={{ padding: '0 16px 32px 16px' }}
          data-testid="expense-request-wizard-trip-screen-content"
        >
          {/* Rejection Comment */}
          {latestRejectComment && <RejectionComment comment={latestRejectComment} />}
          {/* Start Location */}
          <div className="gba:border-b gba:border-b-[#e8e8e8] gba:py-4" data-testid="start-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.start_location',
                'Start Location'
              )}
              icon={ICONS.PIN_ICON}
              isCollapsed={startLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setStartLocation)}
              summary={
                <div data-testid="start-location-summary">
                  <div data-testid="start-location-name">{startLocation.location || '-'}</div>
                  {startLocation.departureDate && (
                    <div data-testid="start-location-datetime">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.add_request_trip_details.transformer_rule',
                        'Departure'
                      )}
                      {formatDate(new Date(startLocation.departureDate), 'date.long')}
                      {startLocation.departureTime
                        ? ' - ' + formatDate(new Date(startLocation.departureTime), 'time.short')
                        : ''}
                    </div>
                  )}
                </div>
              }
            >
              <LocationForm
                locationData={startLocation}
                onUpdate={(field, value) => {
                  // Clear travel region when abroad toggle changes
                  const updatedLocation =
                    field === 'isAbroad'
                      ? { ...startLocation, [field]: value, travelRegionRef: undefined }
                      : { ...startLocation, [field]: value }

                  handleStartLocationChange(updatedLocation)
                  if (field === 'departureDate' || field === 'departureTime') {
                    checkAbsencesAndRequests(
                      field === 'departureDate' ? value : startLocation.departureDate,
                      field === 'departureTime' ? value : startLocation.departureTime,
                      endLocation.departureDate,
                      endLocation.departureTime,
                      false
                    )
                    setDestinations(prev =>
                      prev.map(destination => {
                        const limits = getMinMaxLimits(updatedLocation, endLocation, prev, destination)
                        return validateAndSanitizeLocation(destination, limits)
                      })
                    )
                  }
                }}
                dateTimeLimits={startLimits}
                travelRegions={getFilteredTravelRegions(startLocation.isAbroad)}
                overlapWarning={endLocation.departureDate ? null : startLocationOverlap}
                showFutureWarning={true}
                errorMessage={employeeRuleError || ruleConflictError}
                locationFormLabels={{
                  inputFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.start_location',
                    'Start Location'
                  ),
                  dateFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.departure_date',
                    'Departure Date'
                  ),
                  timeFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.departure_time',
                    'Departure Time'
                  )
                }}
              />
            </LocationContainer>
          </div>

          {/* Destinations */}
          {destinations.map((destination, index) => (
            <div
              key={destination.id}
              className="gba:border-b gba:border-b-[#e8e8e8] gba:py-4"
              data-testid={`destination-wrapper-${destination.id}`}
            >
              <LocationContainer
                title={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.add_request_trip_details.destination_collapsible_title',
                  'Destination'
                )}
                icon={ICONS.PIN_ICON}
                isCollapsed={destination.isCollapsed}
                onToggleCollapse={() => toggleDestinationCollapse(destination.id)}
                onRemove={() => removeDestination(destination.id)}
                showRemoveButton={destinations.length > 1}
                summary={
                  <div data-testid={`destination-summary-${destination.id}`}>
                    <div data-testid={`destination-name-${destination.id}`}>{destination.location || '-'}</div>
                    {destination.departureDate && (
                      <div data-testid={`destination-datetime-${destination.id}`}>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:create_expense_request.add_request_trip_details.transformer_rule',
                          'Departure'
                        )}
                        {formatDate(new Date(destination.departureDate), 'date.long')}
                        {destination.departureTime
                          ? ' - ' + formatDate(new Date(destination.departureTime), 'time.short')
                          : ''}
                      </div>
                    )}
                  </div>
                }
              >
                <LocationForm
                  locationData={destination}
                  onUpdate={(field, value) => updateDestination(destination.id, field, value)}
                  index={index}
                  showDateTimeFields={index < destinations.length - 1}
                  dateTimeLimits={destinationLimits[destination.id] ?? {}}
                  travelRegions={getFilteredTravelRegions(destination.isAbroad)}
                />
              </LocationContainer>
            </div>
          ))}

          {/* Add Destination Button */}
          <div
            className="gba:flex gba:pl-4 gba:border-b gba:border-b-[#e8e8e8] gba:py-4 [&>button]:!gba:py-0 [&>button]:!gba:px-[10px] [&>button]:-gba:ml-[10px] [&>button]:!gba:rounded-[20px]"
            data-testid="add-destination-container"
          >
            <Button variant="ghost" onClick={addDestination} data-testid="add-destination-button">
              <img
                src={ICONS.ADD_CIRCLE}
                alt={'AddDestinationIcon'}
                style={{ width: '24px', height: '24px' }}
                data-testid="add-destination-icon"
              />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.add_destionation_button',
                'Add Destination'
              )}
            </Button>
          </div>

          {/* End Location */}
          <div className="gba:py-4" data-testid="end-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.end_location_text',
                'End Location'
              )}
              icon={ICONS.PIN_ICON}
              isCollapsed={endLocation.isCollapsed}
              onToggleCollapse={() => toggleLocationCollapse(setEndLocation)}
              summary={
                <div data-testid="end-location-summary">
                  <div data-testid="end-location-name">{endLocation.location || '-'}</div>
                  {endLocation.departureDate && (
                    <div data-testid="end-location-datetime">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_detailed_view.arrival', 'Arrival')}
                      {formatDate(new Date(endLocation.departureDate), 'date.long')}
                      {endLocation.departureTime
                        ? ' - ' + formatDate(new Date(endLocation.departureTime), 'time.short')
                        : ''}
                    </div>
                  )}
                </div>
              }
            >
              <LocationForm
                locationData={endLocation}
                onUpdate={(field, value) => {
                  const updatedLocation = { ...endLocation, [field]: value }
                  handleEndLocationChange(updatedLocation)
                  if (field === 'departureDate' || field === 'departureTime') {
                    checkAbsencesAndRequests(
                      startLocation.departureDate,
                      startLocation.departureTime,
                      field === 'departureDate' ? value : endLocation.departureDate,
                      field === 'departureTime' ? value : endLocation.departureTime,
                      true
                    )

                    setDestinations(prev =>
                      prev.map(destination => {
                        const limits = getMinMaxLimits(startLocation, updatedLocation, prev, destination)
                        return validateAndSanitizeLocation(destination, limits)
                      })
                    )
                  }
                }}
                showDateTimeFields={true}
                dateTimeLimits={endLimits}
                travelRegions={getFilteredTravelRegions(endLocation.isAbroad)}
                overlapWarning={
                  startLocation.departureDate && endLocation.departureDate
                    ? endLocationOverlap || startLocationOverlap
                    : null
                }
                showFutureWarning={true}
                locationFormLabels={{
                  inputFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.end_location_text',
                    'End Location'
                  ),
                  dateFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.end_date_label',
                    'Arrival Date'
                  ),
                  timeFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.end_time_label',
                    'Arrival Time'
                  )
                }}
              />
            </LocationContainer>
            {showOvernightAccommodation && (
              <div
                className="gba:font-medium gba:pt-4 [&_label]:flex [&_label]:flex-row-reverse"
                data-testid="overnight-accommodation-container"
              >
                <Checkbox
                  value={overnightAccommodation}
                  name={'overnight-accommodation-checkbox'}
                  onChange={e => setOvernightAccommodation((e.value as boolean) || false)}
                  data-testid="overnight-accommodation-checkbox"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.checkbox_label_accommodation',
                    'Accommodation?'
                  )}
                </Checkbox>
              </div>
            )}
          </div>
        </div>
      </Form>
    </div>
  )
}

export default TripScreen
