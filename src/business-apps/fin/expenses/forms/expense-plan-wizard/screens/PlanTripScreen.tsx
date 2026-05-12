import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'antd'
import { Button, Checkbox } from '@newwork/gravity-ui-catalog'
import { useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ICONS } from '../../../utils/icons'
import LocationContainer from '../../expense-request-wizard/components/LocationContainer/LocationContainer'
import LocationForm from '../../expense-request-wizard/components/LocationForm/LocationForm'

import { DestinationLimit, LocationData, TripScreenProps } from '../../expense-request-wizard/utils/types'
import {
  getMaxLimits,
  getMinLimits,
  getMinMaxLimits,
  validateAndSanitizeLocation
} from '../../expense-request-wizard/utils/locationTimeUtils'
import { getExpenseRulesDataQuery, getRequestsAbsences } from '../queries/ExpensePlanWizardQueries'
import { useExpensePlanWizardContext } from '../context/ExpensePlanWizardContext'
import { showToast } from '../../../utils/notificationUtils'
import { fetchEmployeeRule } from '../queries/ExpensePlanWizardQueries'
import { getOverlapWarningMessage } from '../utils/dateOverlapUtils'
import {
  ABSENCE_STATUS,
  defaultDestination,
  defaultEndLocation,
  defaultStartLocation,
  EXCLUDED_STATUSES,
  TRIP_REQUEST_TYPE
} from '../../expense-request-wizard/constants/constants'
import RejectionComment from '../../expense-request-wizard/components/RejectionComment'
import { EVENTS } from '../../../utils/constants'
import { getLatestRejectComment, setLocalitiesDefault } from '../utils/tripScreenUtils'
import { setByExternalCustomComponent } from '../../expense-request-wizard/utils/tripScreenUtils'
import { combineDateTimeToISOString } from '../../expense-request-wizard/utils/locationTimeUtils'
import expenseFormsTranslations from '../../_i18n'
import { tripLocationPointsEqual } from '../../expense-request-wizard/utils/tripLocationPointEquality'
import { filterTravelRegionsByExpenseItemsCurrency } from '../../shared/utils/filterTravelRegionsByExpenseItemsCurrency'

export const PlanTripScreen: React.FC<TripScreenProps> = props => {
  const { accessToken, additionalData } = props
  const [form] = Form.useForm()
  const graphqlClient = useGraphqlClient(accessToken)
  const {
    expensePlanData,
    employeeRuleId,
    submitActionTripData,
    setEmployeeRuleId,
    updateTripFormValidation,
    requestAdvancePayment,
    setRequestAdvancePayment
  } = useExpensePlanWizardContext()
  const { userInfo } = props
  const { t: tForms } = useTranslation(expenseFormsTranslations)

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
      return filterTravelRegionsByExpenseItemsCurrency(expenseItems, expenseRulesData.homeRegionRule[0], baseRegions)
        .valuesArray
    }

    return baseRegions
  }

  const initialStartLocation: LocationData = defaultStartLocation

  const initialEndLocation: LocationData = defaultEndLocation

  const [startLocation, setStartLocation] = useState<LocationData>(initialStartLocation)
  const [endLocation, setEndLocation] = useState<LocationData>(initialEndLocation)

  const [expenseRulesData, setExpenseRulesData] = useState<any>(null)
  const lastAbsenceCheckKeyRef = useRef<string | null>(null)

  const [locationsAreSynced, setLocationsAreSynced] = useState<boolean>(false)

  const [startLocationOverlap, setStartLocationOverlap] = useState<{ message: string; isError: boolean } | null>(null)
  const [endLocationOverlap, setEndLocationOverlap] = useState<{ message: string; isError: boolean } | null>(null)
  const [employeeRuleError, setEmployeeRuleError] = useState<string | null>(null)
  const [ruleConflictError, setRuleConflictError] = useState<string | null>(null)

  /** Rule id from date+time validation; not pushed to context until submit/next to avoid full-tree rerender */
  const validatedEmployeeRuleIdRef = useRef<string | null>(null)

  const validateEmployeeRule = async (startDate: Date | undefined, startTime: Date | undefined) => {
    setEmployeeRuleError(null)
    setRuleConflictError(null)

    if (!startDate) {
      return true
    }

    const employeeId = userInfo?.employeeDetails?.employeeId

    if (!accessToken || !employeeId) {
      return false
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
        setEmployeeRuleError(errorMessage)
        return false
      }

      const ruleDataValue = ruleData.id || ruleData.expenseRuleId
      if (ruleDataValue) {
        validatedEmployeeRuleIdRef.current = ruleDataValue
        try {
          const activeUserLocale = getCurrentActiveUserLocale()
          const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
            expenseRuleId: ruleDataValue,
            activeUserLocale
          })
          setExpenseRulesData(rulesResponse)
        } catch {
          // Keep previous rules on fetch error
        }
      }

      return true
    } catch {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.missing_expense_rule_message',
        'There is no rule set for your user, please reach out to your administrator.'
      )
      setEmployeeRuleError(errorMessage)
      return false
    }
  }

  const checkAbsencesAndPlans = async (
    startDate: Date | undefined,
    startTime: Date | undefined,
    endDate: Date | undefined,
    endTime: Date | undefined,
    isEndLocation: boolean = false
  ) => {
    if (!startDate) {
      return
    }

    if (!isEndLocation) {
      if (startDate && startTime) {
        const isRuleValid = await validateEmployeeRule(startDate, startTime)
        if (!isRuleValid) {
          return
        }
      } else {
        setEmployeeRuleError(null)
        validatedEmployeeRuleIdRef.current = null
      }
    }

    const employeeId = userInfo?.employeeDetails?.employeeId

    if (!accessToken || !employeeId || !expensePlanData) {
      return
    }

    try {
      const activeUserLocale = getCurrentActiveUserLocale()
      const expenseId = expensePlanData?.ExpensePlanByPk?.id

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
        planId: expenseId,
        activeUserLocale,
        startTimeValue: finalStartDate,
        endTimeValue: finalEndDate
      }
      const dedupeKey = JSON.stringify({
        employeeId,
        expenseId,
        startTimeValue: finalStartDate,
        endTimeValue: finalEndDate
      })

      if (lastAbsenceCheckKeyRef.current === dedupeKey) {
        return
      }
      lastAbsenceCheckKeyRef.current = dedupeKey

      // Overlaps are cleared in the useEffect before this function is called
      // No need to clear here as it causes issues with deduplication

      try {
        const response = await graphqlClient.request(getRequestsAbsences, variables)
        if (lastAbsenceCheckKeyRef.current !== dedupeKey) {
          return
        }
        const overlapWarning = getOverlapWarningMessage(response, expenseId)
        if (isEndLocation) {
          setEndLocationOverlap(overlapWarning)
        } else {
          setStartLocationOverlap(overlapWarning)
        }
      } catch {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:modify_expense_request.error_fetching_expense_data',
            'Error fetching expense plan data'
          ),
          'error'
        )
      }
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_fetching_expense_data',
          'Error fetching expense plan data'
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

  const handleEndLocationChange = (updatedLocation: LocationData) => {
    const sanitizedLocation = validateAndSanitizeLocation(updatedLocation, endLimits)
    if (endLocation.isAbroad && !updatedLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0) {
      sanitizedLocation.travelRegionRef = expenseRulesData.homeRegionRule[0].travelRegionRef
    }
    setEndLocation(sanitizedLocation)
    setLocationsAreSynced(sanitizedLocation.location === startLocation.location)
  }

  const hasTripData = () => {
    return (
      expensePlanData?.ExpensePlanByPk?.expenseRequestTrip &&
      Array.isArray(expensePlanData.ExpensePlanByPk.expenseRequestTrip) &&
      expensePlanData.ExpensePlanByPk.expenseRequestTrip.length !== 0
    )
  }

  const fetchAndSetEmployeeRule = async (formattedDate: string) => {
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      showToast(
        getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.missing_employee_id', 'Missing employee ID'),
        'error'
      )
      return null
    }

    const employeeRuleData = await fetchEmployeeRule(employeeId, formattedDate, accessToken)
    if (employeeRuleData?.expenseRuleId) {
      setEmployeeRuleId(employeeRuleData.expenseRuleId)
      const activeUserLocale = getCurrentActiveUserLocale()
      const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
        expenseRuleId: employeeRuleData.expenseRuleId,
        activeUserLocale
      })
      setExpenseRulesData(rulesResponse)
      return rulesResponse
    }
    return null
  }

  const loadInitialTripData = async () => {
    try {
      if (!hasTripData()) {
        setLocalitiesDefault(expensePlanData, setStartLocation, setEndLocation, setLocationsAreSynced)
        return
      }

      const myData = expensePlanData.ExpensePlanByPk.expenseRequestTrip
      const startObject = myData.find((item: any) => item.pointType === 'START_POINT')
      const hasValidStartDate = startObject?.tripDateTime && dayjs(startObject.tripDateTime).isValid()

      if (hasValidStartDate) {
        const formattedDate = dayjs(startObject.tripDateTime).format('YYYY-MM-DDTHH:mm:ss.SSSZZ')
        const rulesResponse = await fetchAndSetEmployeeRule(formattedDate)
        setByExternalCustomComponent(expensePlanData, rulesResponse, setStartLocation, setDestinations, setEndLocation)
      } else {
        setByExternalCustomComponent(
          expensePlanData,
          expenseRulesData,
          setStartLocation,
          setDestinations,
          setEndLocation
        )
      }
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_loading_trip_data',
          'Error loading trip data'
        ),
        'error'
      )
    }
  }

  const toggleLocationCollapse = (setLocation: React.Dispatch<React.SetStateAction<LocationData>>) => {
    setLocation(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }))
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

  const [destinations, setDestinations] = useState<LocationData[]>([defaultDestination])

  useEffect(() => {
    if (accessToken && userInfo?.employeeDetails?.employeeId && expensePlanData) {
      //  Clear overlaps whenever dates change (before deduplication check)
      // This ensures stale warnings don't persist when user changes dates
      setStartLocationOverlap(null)
      setEndLocationOverlap(null)

      // Always check using the full trip range (start to end)
      // This ensures we catch overlaps across the entire trip duration
      if (
        (startLocation.departureDate || startLocation.departureTime) &&
        (endLocation.departureDate || endLocation.departureTime)
      ) {
        checkAbsencesAndPlans(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          false // Check for start location
        )
        checkAbsencesAndPlans(
          startLocation.departureDate,
          startLocation.departureTime,
          endLocation.departureDate,
          endLocation.departureTime,
          true // Check for end location
        )
      }
    }
  }, [
    accessToken,
    userInfo,
    expensePlanData,
    startLocation.departureDate,
    startLocation.departureTime,
    endLocation.departureDate,
    endLocation.departureTime
  ])

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !employeeRuleId || !expensePlanData) return

      try {
        const activeUserLocale = getCurrentActiveUserLocale()

        const expenseId = expensePlanData?.ExpensePlanByPk?.id
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

        const rulesResponse = await graphqlClient.request(getExpenseRulesDataQuery, {
          expenseRuleId: employeeRuleId,
          activeUserLocale
        })

        setExpenseRulesData(rulesResponse)

        // Only prefill trip from plan when form is not yet filled (avoids overwriting user's date/time)
        if (!startLocation.departureDate) {
          await loadInitialTripData()
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
  }, [accessToken, employeeRuleId, expensePlanData, additionalData, setEmployeeRuleId])

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

  const startEqualsFirstDestinationMessage = useMemo(() => {
    if (destinations.length === 0) {
      return null
    }
    const first = destinations[0]
    if (!startLocation.location?.trim() || !first.location?.trim()) {
      return null
    }
    if (!tripLocationPointsEqual(startLocation, first)) {
      return null
    }
    return tForms('trip-start-equals-first-destination')
  }, [destinations, startLocation, tForms])

  const validateTripForm = useCallback(() => {
    if (employeeRuleError || ruleConflictError) {
      updateTripFormValidation(false)
      return false
    }

    if (startLocationOverlap?.isError === true || endLocationOverlap?.isError === true) {
      updateTripFormValidation(false)
      return false
    }

    if (destinations.length > 0) {
      const firstDest = destinations[0]
      if (
        startLocation.location?.trim() &&
        firstDest.location?.trim() &&
        tripLocationPointsEqual(startLocation, firstDest)
      ) {
        updateTripFormValidation(false)
        return false
      }
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

  const handleSave = () => {
    submitActionTripData(
      startLocation,
      destinations,
      endLocation,
      expenseRulesData,
      EVENTS.SAVE,
      requestAdvancePayment,
      validatedEmployeeRuleIdRef.current ?? undefined
    )
  }

  const handleNext = () => {
    if (validateTripForm()) {
      submitActionTripData(
        startLocation,
        destinations,
        endLocation,
        expenseRulesData,
        EVENTS.NEXT,
        requestAdvancePayment,
        validatedEmployeeRuleIdRef.current ?? undefined
      )
    }
  }

  useEffect(() => {
    const saveEventHandler = () => {
      handleSave()
    }

    const nextEventHandler = () => {
      handleNext()
    }

    document.addEventListener('expense-plan-save-trip', saveEventHandler)
    document.addEventListener('expense-plan-next-trip', nextEventHandler)

    return () => {
      document.removeEventListener('expense-plan-save-trip', saveEventHandler)
      document.removeEventListener('expense-plan-next-trip', nextEventHandler)
    }
  }, [startLocation, destinations, endLocation, expenseRulesData, validateTripForm])

  const latestRejectComment = getLatestRejectComment(expensePlanData)

  // if (loading) {
  //   return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />;
  // }

  return (
    <div className="gba:flex gba:flex-col gba:w-[100%]" data-testid="trip-screen-container">
      <Form form={form} layout="vertical">
        {latestRejectComment && <RejectionComment isRequest={false} comment={latestRejectComment} />}

        <div data-testid="locations-container">
          {/* Start Location */}
          <div className="gba:border-b gba:border-b-[#e8e8e8] gba:py-4" data-testid="start-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel(
                'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_title',
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
                        'lowcoder:add_items_to_plan.add_trip_info_to_plan.departure',
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
                    checkAbsencesAndPlans(
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
                showFutureWarning={false}
                showPastWarning={true}
                errorMessage={employeeRuleError || ruleConflictError}
                locationFormLabels={{
                  inputFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_input_label',
                    'Start Location'
                  ),
                  dateFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_date_label',
                    'Start Date'
                  ),
                  timeFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_time_label',
                    'Start Time'
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
                  'lowcoder:add_items_to_plan.add_trip_info_to_plan.destination_title',
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
                          'lowcoder:add_items_to_plan.add_trip_info_to_plan.departure',
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
                  errorMessage={index === 0 ? startEqualsFirstDestinationMessage : null}
                  locationFormLabels={{
                    inputFieldLabel: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:add_items_to_plan.add_trip_info_to_plan.destination_title',
                      'Destination'
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
                'lowcoder:add_items_to_plan.add_trip_info_to_plan.add_destination_button',
                'Add Destination'
              )}
            </Button>
          </div>

          {/* End Location */}
          <div className="gba:py-4" data-testid="end-location-wrapper">
            <LocationContainer
              title={getTranslationFromI18nKeyAndLabel(
                'lowcoder:add_items_to_plan.add_trip_info_to_plan.end_location_title',
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
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:add_items_to_plan.add_trip_info_to_plan.arrival',
                        'Arrival'
                      )}
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
                    checkAbsencesAndPlans(
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
                showFutureWarning={false}
                locationFormLabels={{
                  inputFieldLabel: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.end_input_label',
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
                showPastWarning={true}
              />
            </LocationContainer>
          </div>

          {/* Skip Advance Payment Checkbox */}
          <div
            className="gba:font-medium gba:py-4 [&_label]:flex [&_label]:flex-row-reverse"
            data-testid="skip-advance-payment-container"
          >
            <Checkbox
              value={requestAdvancePayment}
              name={'skip-advance-payment-checkbox'}
              onChange={e => setRequestAdvancePayment((e.value as boolean) || false)}
              data-testid="skip-advance-payment-checkbox"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label',
                'Request Advance Payment'
              )}
            </Checkbox>
          </div>
        </div>
      </Form>
    </div>
  )
}

export default PlanTripScreen
