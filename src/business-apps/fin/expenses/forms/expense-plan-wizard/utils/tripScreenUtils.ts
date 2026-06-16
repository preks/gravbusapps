import dayjs from 'dayjs'
import { LogObject, TripData } from './types'
import { showToast } from '../../../utils/notificationUtils'
import { SCREEN_NAMES_ENUM } from '../constants/constants'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { combineDateTimeToISOString } from './locationTimeUtils'
import { LocationData } from '../../expense-request-wizard/utils/types'
import { PointTypeEnum, TripDirectionDefaultValue } from '../../expense-request-wizard/constants/constants'
import { mergeUniqueById } from '../../../utils/functionUtils'
import { EVENTS } from '../../../utils/constants'
import type { ExpensePlanWizardTranslateFn } from '../expensePlanWizardTranslateTypes'
import {
  getAllowanceRegionRuleDetailId,
  getCountryRefFromRegion
} from '../../expense-request-wizard/utils/tripScreenUtils'
import {
  applyDefaultLocalitiesFromEmployeeAddresses,
  checkTripExistsWithEntityPredicate,
  createBorderCrossingTransformer,
  getLatestRejectCommentFromCommentList,
  preserveTripIdsIfCountsMatch
} from '../../shared/utils/tripScreenSharedUtils'

export { prepareTripData } from '../../shared/utils/tripScreenSharedUtils'

/**
 * Creates a detailed log object for the trip save event
 * @param startLocation - Start location data
 * @param endLocation - End location data
 * @param initialPlan - Initial plan data
 * @param employeeRuleId - Employee rule ID
 * @param currentTitle - Current editable title value
 * @param currentCurrency - Current determined currency value
 * @returns Detailed log object
 */
export const createTripLogObject = (
  startLocation: LocationData,
  endLocation: LocationData,
  initialPlan: any,
  employeeRuleId: string,
  currentTitle: string,
  currentCurrency: string | null,
  event: string,
  requestAdvancePayment?: boolean
): LogObject => {
  const startTripDateTime = combineDateTimeToISOString(startLocation.departureDate, startLocation.departureTime)
  const endTripDateTime = combineDateTimeToISOString(endLocation.departureDate, endLocation.departureTime)
  const initialAdvancePayment =
    initialPlan.advancePayment && initialPlan.advancePayment.length > 0 ? initialPlan.advancePayment[0] : null

  return {
    stepKey: SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + event + (!requestAdvancePayment ? '_' + EVENTS.SKIP : ''),
    event: event,
    expensePlan: {
      id: initialPlan.id,
      startDate: startTripDateTime || initialPlan.startDate || '',
      endDate: endTripDateTime || initialPlan.endDate || '',
      expenseRule: employeeRuleId || '',
      version: initialPlan.version || 0,
      description: initialPlan.description || '',
      costCenter: initialPlan.costCenterId || '',
      additionalProperties: initialPlan.additionalProperties || {},
      employee: initialPlan.employeeId || '',
      title: currentTitle || initialPlan.title || '',
      status: initialPlan.status,
      planDate: initialPlan.planDate ? dayjs(initialPlan.planDate).format('YYYY-MM-DD') : '',
      requestTypeRef: initialPlan.requestTypeRef,
      currencyRef: currentCurrency || initialPlan.currency?.id,
      totalAmount: initialPlan?.totalAmount,
      project: initialPlan?.project?.id || '',
      decisionDate: initialPlan?.decisionDate || ''
    },
    advancePayment: initialAdvancePayment
      ? {
          id: initialAdvancePayment.id,
          version: initialAdvancePayment.version,
          currencyRef: initialAdvancePayment.currencyRef,
          amount: initialAdvancePayment.amount,
          paymentMethod: initialAdvancePayment.paymentMethod,
          status: initialAdvancePayment.status,
          expensePlan: initialAdvancePayment.expensePlanId,
          costCenter: initialAdvancePayment.costCenterId
        }
      : null
  }
}

/**
 * Handle trip submit action
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param expenseRulesData - Expense rules data
 * @param expensePlanData - Expense plan data
 * @param employeeRuleId - Employee rule ID
 * @param currentTitle - Current title
 * @param currentCurrency - Current currency
 * @param event - Event type
 * @returns True if successful, false otherwise
 */
export const handleTripSubmitAction = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  expenseRulesData: any,
  expensePlanData: any,
  employeeRuleId: string,
  currentTitle: string,
  currentCurrency: string | null,
  event: string,
  requestAdvancePayment?: boolean,
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean,
  t?: ExpensePlanWizardTranslateFn
): boolean => {
  const initialPlan = expensePlanData?.ExpensePlanByPk
  if (!initialPlan) {
    showToast(t ? t('missing-plan-data') : 'Missing plan data', 'error')
    return false
  }
  const logObject = createTripLogObject(
    startLocation,
    endLocation,
    initialPlan,
    employeeRuleId,
    currentTitle,
    currentCurrency,
    event,
    requestAdvancePayment
  )
  const planItems: Array<{
    id: string
    version: string | number
    code: string
    title: string
    ruleId: string
    expensePlan: string
  }> = []
  if (expensePlanData.ExpenseItem && Array.isArray(expensePlanData.ExpenseItem)) {
    expensePlanData.ExpenseItem.forEach((item: any) => {
      if (item) {
        planItems.push({
          id: item.id,
          version: item.version,
          code: item.code || '',
          title: item.title || '',
          ruleId: item.expenseRuleId || '',
          expensePlan: initialPlan.id || ''
        })
      }
    })
  }
  const additionalItems: Array<{
    id: string
    version: string | number
    code: string
    title: string
    ruleId: string
    expensePlan: string
  }> = []
  if (
    expensePlanData.additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems &&
    Array.isArray(expensePlanData.additionalData.psi_taskPayload.psi_initialParameters.expenseItems)
  ) {
    expensePlanData.additionalData.psi_taskPayload.psi_initialParameters.expenseItems.forEach((item: any) => {
      additionalItems.push({
        id: item.id,
        version: item.version,
        code: item.code || '',
        title: item.title || '',
        ruleId: item.expenseRuleId || '',
        expensePlan: initialPlan.id || ''
      })
    })
  }
  const combinedItems = mergeUniqueById(planItems, additionalItems)

  ;(logObject as LogObject).expensePlanItems = {
    planItems: combinedItems
  }

  const tripsTransformer = transformTrips(startLocation, destinations, endLocation, initialPlan, expenseRulesData)

  const borderCrossTransformer = createBorderCrossingTransformer()

  const verifiedTrips =
    borderCrossTransformer(tripsTransformer).length !== 0 ? borderCrossTransformer(tripsTransformer) : ''

  const arrayWithExistingTrips: TripData[] = []
  if (verifiedTrips) {
    verifiedTrips.forEach((element: TripData) => {
      const foundElement = checkTripExists(initialPlan.expenseRequestTrip, element.pointType, element)
      arrayWithExistingTrips.push(foundElement || element)
    })
  }

  const finalTrips =
    Array.isArray(initialPlan.expenseRequestTrip) && verifiedTrips
      ? preserveTripIdsIfCountsMatch(initialPlan.expenseRequestTrip, arrayWithExistingTrips)
      : arrayWithExistingTrips

  ;(logObject as LogObject).expenseRequestTrips = {
    expenseTrips: verifiedTrips ? finalTrips : initialPlan.expenseRequestTrip || []
  }

  if (dispatchProcessContinueEventIfEnabled) {
    return dispatchProcessContinueEventIfEnabled(event, logObject)
  } else {
    dispatchProcessContinueEvent(event, logObject)
    return true
  }
}

/**
 * Create a trip point from location data
 * @param location - Location data
 * @param pointType - Point type
 * @param tripDirection - Trip direction
 * @param tripOrder - Trip order
 * @param initialPlan - Initial plan data
 * @param expenseRulesData - Expense rules data
 * @param endLocation - Optional end location for reference (used for destinations)
 * @returns Trip data object
 */
const createTripPoint = (
  location: LocationData,
  pointType: string,
  tripDirection: string,
  tripOrder: number,
  initialPlan: any,
  expenseRulesData: any,
  endLocation?: LocationData
): TripData => {
  const travelRegionRef =
    location.travelRegionRef ||
    (expenseRulesData?.homeRegionRule?.length > 0 ? expenseRulesData.homeRegionRule[0].travelRegionRef : '')
  let departureDate = location.departureDate
  let departureTime = location.departureTime

  if (pointType === PointTypeEnum.destination && (!departureDate || !departureTime) && endLocation) {
    departureDate = departureDate || endLocation.departureDate
    departureTime = departureTime || endLocation.departureTime
  }

  return {
    address: location.location || '',
    tripDateTime: combineDateTimeToISOString(departureDate, departureTime),
    pointType: pointType,
    tripDirection: tripDirection,
    costCenter: initialPlan.costCenterId || '',
    expensePlan: initialPlan.id || '',
    tripOrder: tripOrder,
    travelRegionRef: travelRegionRef,
    countryRef: getCountryRefFromRegion(travelRegionRef, expenseRulesData),
    project: initialPlan.project ? initialPlan.project.id : '',
    allowanceRegionRuleDetail: getAllowanceRegionRuleDetailId(travelRegionRef, expenseRulesData) || ''
  }
}

/**
 * Transform trips data
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param initialPlan - Fetched plan data
 * @param expenseRulesData - Expense rules data
 * @returns Transformed trips array
 */
export const transformTrips = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  initialPlan: any,
  expenseRulesData: any
): TripData[] => {
  const tripsArray: TripData[] = []
  let tripOrderIndex = 1
  tripsArray.push(
    createTripPoint(
      startLocation,
      PointTypeEnum.start,
      TripDirectionDefaultValue.go,
      tripOrderIndex,
      initialPlan,
      expenseRulesData
    )
  )

  tripOrderIndex += 1

  if (
    !(
      destinations.length === 1 &&
      destinations[0].location === '' &&
      !destinations[0].departureDate &&
      !destinations[0].departureTime
    )
  ) {
    destinations.forEach(element => {
      tripsArray.push(
        createTripPoint(
          element,
          PointTypeEnum.destination,
          TripDirectionDefaultValue.go,
          tripOrderIndex++,
          initialPlan,
          expenseRulesData,
          endLocation
        )
      )
    })
  }

  tripsArray.push(
    createTripPoint(
      endLocation,
      PointTypeEnum.end,
      TripDirectionDefaultValue.back,
      tripOrderIndex,
      initialPlan,
      expenseRulesData
    )
  )

  return tripsArray
}

/**
 * Check if trip exists in array
 * @param array - Array to check
 * @param pointType - Point type to check
 * @param objectToCheck - Object to check
 * @returns Trip data if exists, null otherwise
 */
export const checkTripExists = (
  array: any[] | undefined,
  pointType: string,
  objectToCheck: TripData
): TripData | null =>
  checkTripExistsWithEntityPredicate(array, pointType, objectToCheck, (item, o) => item.expensePlanId === o.expensePlan)

/**
 * Parse an ISO date-time string into a local date-only Date at midnight.
 */
const parseDateOnlyLocal = (isoDateTime?: string): Date | undefined => {
  if (!isoDateTime) return undefined
  try {
    const datePart = isoDateTime.split('T')[0]
    const [year, month, day] = datePart.split('-').map(value => Number.parseInt(value, 10))
    if (!year || !month || !day) return undefined
    return new Date(year, month - 1, day, 0, 0, 0, 0)
  } catch {
    return undefined
  }
}

const isPlanTripPointAbroad = (tripPoint: any, expenseRulesData: any): boolean => {
  const travelRegionRef = tripPoint?.travelRegionRef
  const allowanceRegionRuleDetailId = tripPoint?.allowanceRegionRuleDetailId || tripPoint?.allowanceRegionRuleDetail
  const countryRef = tripPoint?.countryRef
  const ruleDetails = Array.isArray(expenseRulesData?.AllowanceRegionRuleDetail)
    ? expenseRulesData.AllowanceRegionRuleDetail
    : []
  const homeRegionRules = Array.isArray(expenseRulesData?.homeRegionRule) ? expenseRulesData.homeRegionRule : []

  if (!travelRegionRef && !allowanceRegionRuleDetailId && !countryRef) {
    return false
  }

  const persistedDetail = allowanceRegionRuleDetailId
    ? ruleDetails.find((detail: any) => detail.id === allowanceRegionRuleDetailId)
    : undefined

  if (persistedDetail?.home === true) return false
  if (persistedDetail?.home === false) return true

  const homeRuleDetails = ruleDetails.filter((detail: any) => detail.home === true)
  const hasKnownHomeRegion =
    (travelRegionRef && homeRegionRules.some((rule: any) => rule.travelRegionRef === travelRegionRef)) ||
    (countryRef && homeRegionRules.some((rule: any) => rule.countryRef === countryRef)) ||
    (countryRef && homeRuleDetails.some((detail: any) => detail.countryRef === countryRef)) ||
    (travelRegionRef &&
      ruleDetails.some((region: any) => region.travelRegionRef === travelRegionRef && region.home === true))

  if (hasKnownHomeRegion) {
    return false
  }

  // Avoid classifying a local saved point as abroad when validation reloads with a different rule set.
  return false
}

export const setPlanTripDataFromSavedTrip = (
  expensePlanData: any,
  expenseRulesData: any,
  setStartLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setDestinations: React.Dispatch<React.SetStateAction<LocationData[]>>,
  setEndLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  t?: ExpensePlanWizardTranslateFn
) => {
  const tripData = expensePlanData?.ExpensePlanByPk?.expenseRequestTrip

  if (!Array.isArray(tripData) || tripData.length === 0) {
    return
  }

  try {
    const startPoint = tripData.find((trip: any) => trip.pointType === 'START_POINT')
    if (startPoint) {
      setStartLocation(prev => ({
        ...prev,
        location: startPoint.address || '',
        departureDate: parseDateOnlyLocal(startPoint.tripDateTime),
        departureTime: startPoint.tripDateTime ? new Date(startPoint.tripDateTime) : undefined,
        travelRegionRef: startPoint.travelRegionRef || '',
        isAbroad: isPlanTripPointAbroad(startPoint, expenseRulesData)
      }))
    }

    const destinationPoints = tripData
      .filter((trip: any) => trip.pointType === 'DESTINATION_POINT')
      .sort((a: any, b: any) => a.tripOrder - b.tripOrder)

    if (destinationPoints.length > 0) {
      setDestinations(
        destinationPoints.map((destination: any, index: number) => ({
          id: `destination-${index}`,
          name: '',
          location: destination.address || '',
          departureDate: destinationPoints.length === 1 ? undefined : parseDateOnlyLocal(destination.tripDateTime),
          departureTime:
            destinationPoints.length === 1 || !destination.tripDateTime
              ? undefined
              : new Date(destination.tripDateTime),
          isCollapsed: false,
          travelRegionRef: destination.travelRegionRef || '',
          isAbroad: isPlanTripPointAbroad(destination, expenseRulesData)
        }))
      )
    }

    const endPoint = tripData.find((trip: any) => trip.pointType === 'END_POINT')
    if (endPoint) {
      setEndLocation(prev => ({
        ...prev,
        location: endPoint.address || '',
        departureDate: parseDateOnlyLocal(endPoint.tripDateTime),
        departureTime: endPoint.tripDateTime ? new Date(endPoint.tripDateTime) : undefined,
        travelRegionRef: endPoint.travelRegionRef || '',
        isAbroad: isPlanTripPointAbroad(endPoint, expenseRulesData)
      }))
    }
  } catch {
    showToast(t ? t('error-load-trip-data') : 'Error loading trip data', 'error')
  }
}

/**
 * Set localities default
 * @param expensePlanData - Expense plan data
 * @param setStartLocation - Set start location function
 * @param setEndLocation - Set end location function
 * @param setLocationsAreSynced - Set locations are synced function
 */
export const setLocalitiesDefault = (
  expensePlanData: any,
  setStartLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setEndLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setLocationsAreSynced: React.Dispatch<React.SetStateAction<boolean>>
) => {
  applyDefaultLocalitiesFromEmployeeAddresses(
    expensePlanData?.EmployeeAddress,
    setStartLocation,
    setEndLocation,
    setLocationsAreSynced
  )
}

export const getLatestRejectComment = (expensePlanData: any) =>
  getLatestRejectCommentFromCommentList(expensePlanData?.ExpensePlanByPk?.expensePlanComment)

export const setInitialScreen = (
  additionalData: any,
  expensePlanData: any,
  isTrip: boolean,
  setCurrentScreen: React.Dispatch<React.SetStateAction<string>>,
  setRequestAdvancePayment: (skip: boolean) => void,
  currentScreen?: string
) => {
  const stepKey = additionalData?.psi_taskPayload?.stepKey
  if (stepKey) {
    let targetScreen = SCREEN_NAMES_ENUM.LOAD_TAB

    if (stepKey.includes(EVENTS.SAVE)) {
      switch (stepKey) {
        case SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + EVENTS.SAVE:
          targetScreen = SCREEN_NAMES_ENUM.TRIPS_TAB
          setRequestAdvancePayment(true)
          break
        case SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + EVENTS.SAVE + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.TRIPS_TAB
          break
        case SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + EVENTS.SAVE:
          setRequestAdvancePayment(true)
          targetScreen = SCREEN_NAMES_ENUM.ITEMS_TAB
          break
        case SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + EVENTS.SAVE + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.ITEMS_TAB
          break
        case SCREEN_NAMES_ENUM.PAYMENT_TAB + '_' + EVENTS.SAVE:
          setRequestAdvancePayment(true)
          targetScreen = SCREEN_NAMES_ENUM.PAYMENT_TAB
          break
        case SCREEN_NAMES_ENUM.PAYMENT_TAB + '_' + EVENTS.SAVE + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.PAYMENT_TAB
          break
        case SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + EVENTS.SAVE:
          setRequestAdvancePayment(true)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + EVENTS.SAVE + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        default:
          targetScreen = SCREEN_NAMES_ENUM.LOAD_TAB
          break
      }
    } else if (stepKey.includes(EVENTS.NEXT)) {
      switch (stepKey) {
        case SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + EVENTS.NEXT:
          setRequestAdvancePayment(true)
          targetScreen = SCREEN_NAMES_ENUM.ITEMS_TAB
          break
        case SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + EVENTS.NEXT + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.ITEMS_TAB
          break
        case SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + EVENTS.NEXT:
          setRequestAdvancePayment(true)
          targetScreen = targetScreen = SCREEN_NAMES_ENUM.PAYMENT_TAB
          break
        case SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + EVENTS.NEXT + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.PAYMENT_TAB + '_' + EVENTS.NEXT:
          setRequestAdvancePayment(true)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.PAYMENT_TAB + '_' + EVENTS.NEXT + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + EVENTS.NEXT:
          setRequestAdvancePayment(true)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + EVENTS.NEXT + '_' + EVENTS.SKIP:
          setRequestAdvancePayment(false)
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        default:
          targetScreen = SCREEN_NAMES_ENUM.LOAD_TAB
          break
      }
    }

    // Only change screen if we're not already on the target screen
    if (currentScreen !== targetScreen) {
      setCurrentScreen(targetScreen)
    }
  } else {
    if (expensePlanData) {
      const defaultScreen = isTrip ? SCREEN_NAMES_ENUM.TRIPS_TAB : SCREEN_NAMES_ENUM.ITEMS_TAB
      if (currentScreen !== defaultScreen) {
        setCurrentScreen(defaultScreen)
      }
    }
  }
}
