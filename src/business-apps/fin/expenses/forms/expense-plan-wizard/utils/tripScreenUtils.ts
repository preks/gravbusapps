import dayjs from 'dayjs'
import { LogObject, TripData } from './types'
import { showToast } from '../../../utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SCREEN_NAMES_ENUM } from '../constants/constants'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { combineDateTimeToISOString } from './locationTimeUtils'
import { LocationData } from '../../expense-request-wizard/utils/types'
import { PointTypeEnum, TripDirectionDefaultValue } from '../../expense-request-wizard/constants/constants'
import { mergeUniqueById } from '../../../utils/functionUtils'
import { EVENTS } from '../../../utils/constants'
import {
  getAllowanceRegionRuleDetailId,
  getCountryRefFromRegion,
  getValidLocality
} from '../../expense-request-wizard/utils/tripScreenUtils'

/**
 * Prepares trip data for saving
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param expenseRulesData - Expense rules data
 * @returns Prepared trip data
 */
export const prepareTripData = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  expenseRulesData: any
) => {
  return {
    startLocation: {
      ...startLocation,
      travelRegionRef:
        !startLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
          ? expenseRulesData.homeRegionRule[0].travelRegionRef
          : startLocation.travelRegionRef
    },
    destinations: destinations.map(destination => ({
      ...destination,
      travelRegionRef:
        !destination.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
          ? expenseRulesData.homeRegionRule[0].travelRegionRef
          : destination.travelRegionRef
    })),
    endLocation: {
      ...endLocation,
      travelRegionRef:
        !endLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
          ? expenseRulesData.homeRegionRule[0].travelRegionRef
          : endLocation.travelRegionRef
    }
  }
}

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
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean
): boolean => {
  const initialPlan = expensePlanData?.ExpensePlanByPk
  if (!initialPlan) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:add_items_to_plan.add_trip_info_to_plan.missing_plan_data',
        'Missing plan data'
      ),
      'error'
    )
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

  // Fallback: if counts match, preserve ids/versions by pointType and tripOrder alignment
  const preserveTripIdsIfCountsMatch = (existingTrips: TripData[] | undefined, newTrips: TripData[]): TripData[] => {
    if (!existingTrips || !Array.isArray(existingTrips)) return newTrips
    if (!Array.isArray(newTrips) || newTrips.length === 0) return newTrips
    if (existingTrips.length !== newTrips.length) return newTrips

    const result = newTrips.map(trip => ({ ...trip }))
    const pointTypes = Array.from(new Set([...existingTrips.map(t => t.pointType), ...newTrips.map(t => t.pointType)]))
    pointTypes.forEach(type => {
      const existingGroup = existingTrips
        .filter(t => t.pointType === type)
        .slice()
        .sort((a, b) => (a.tripOrder || 0) - (b.tripOrder || 0))
      const incomingGroup = result
        .filter(t => t.pointType === type)
        .slice()
        .sort((a, b) => (a.tripOrder || 0) - (b.tripOrder || 0))
      if (existingGroup.length === incomingGroup.length && incomingGroup.length > 0) {
        for (let i = 0; i < incomingGroup.length; i += 1) {
          incomingGroup[i].id = existingGroup[i].id
          incomingGroup[i].version = existingGroup[i].version
        }
      }
    })
    return result
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
 * Create border crossing transformer
 * @returns Border crossing transformer function
 */
export const createBorderCrossingTransformer = () => {
  return function addBorderCrossing(locations: TripData[]): TripData[] {
    const locationsWithBorderCrossing: TripData[] = []
    let previousLocation: TripData | null = null

    for (const location of locations) {
      if (!(location && location.tripDateTime)) {
        location.tripDateTime = (previousLocation && previousLocation.tripDateTime) || '' // use the previous location's date time
      }
      if (previousLocation && location && location.countryRef !== previousLocation.countryRef) {
        switch (location.pointType) {
          case PointTypeEnum.start:
            break
          case PointTypeEnum.destination:
            locationsWithBorderCrossing.push({
              ...location,
              pointType: PointTypeEnum.border,
              tripDateTime: previousLocation.tripDateTime
            })
            break
          case PointTypeEnum.end:
            locationsWithBorderCrossing.push({
              ...location,
              pointType: PointTypeEnum.border,
              tripDateTime: location.tripDateTime
            })
            break
          default:
            console.error('Unsupported pointType: ' + location.pointType)
        }
      }
      locationsWithBorderCrossing.push(location)
      previousLocation = location
    }

    let indexTripOrder = 1

    return locationsWithBorderCrossing.map(trip => {
      trip.tripOrder = indexTripOrder++
      return trip
    })
  }
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
): TripData | null => {
  if (!array) return null

  const filteredArray = array.filter(item => item.pointType === pointType)
  const objectToCheckKey = dayjs(objectToCheck.tripDateTime).format('YYYY-MM-DDTHH:mm')

  const found =
    filteredArray.find(item => {
      const itemKey = dayjs(item.tripDateTime).format('YYYY-MM-DDTHH:mm')
      return (
        item.address === objectToCheck.address &&
        itemKey === objectToCheckKey &&
        item.pointType === objectToCheck.pointType &&
        item.tripDirection === objectToCheck.tripDirection &&
        item.costCenterId === objectToCheck.costCenter &&
        item.tripOrder === objectToCheck.tripOrder &&
        item.travelRegionRef === objectToCheck.travelRegionRef &&
        item.countryRef === objectToCheck.countryRef &&
        item.expensePlanId === objectToCheck.expensePlan &&
        item.allowanceRegionRuleDetailId === objectToCheck.allowanceRegionRuleDetail
      )
    }) || null
  if (found) {
    const merged: TripData = {
      ...objectToCheck,
      id: found.id,
      version: found.version
    } as TripData
    return merged
  }

  return null
}

/**
 * Check if a travel region is abroad
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns True if region is abroad, false otherwise
 */

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
  try {
    const employeeAddresses = expensePlanData?.EmployeeAddress || []
    const localityToSet = getValidLocality(employeeAddresses)

    if (localityToSet) {
      setStartLocation(prevLocation => ({
        ...prevLocation,
        location: localityToSet
      }))
      setEndLocation(prevLocation => ({
        ...prevLocation,
        location: localityToSet
      }))
    }
    setLocationsAreSynced(true)
  } catch {}
}

export const getLatestRejectComment = (expensePlanData: any) => {
  if (expensePlanData && expensePlanData.ExpensePlanByPk && expensePlanData.ExpensePlanByPk.expensePlanComment) {
    const filteredArray = expensePlanData.ExpensePlanByPk.expensePlanComment.filter(
      (comment: any) => comment.commentType && comment.commentType.toUpperCase().includes('REJECT')
    )

    return filteredArray && filteredArray.length > 0
      ? [...filteredArray].sort(
          (a: any, b: any) => new Date(b.commentDate).getTime() - new Date(a.commentDate).getTime()
        )[0]
      : null
  }
  return null
}

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
