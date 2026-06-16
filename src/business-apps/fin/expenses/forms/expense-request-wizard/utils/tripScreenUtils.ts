import dayjs from 'dayjs'
import { combineDateTimeToISOString } from './locationTimeUtils'
import { LocationData, LogObject, TripData } from './types'
import { showToast } from '../../../utils/notificationUtils'
import type { ExpenseRequestWizardTranslateFn } from '../expenseRequestWizardTranslateTypes'
import { PointTypeEnum, SCREEN_NAMES_ENUM, TripDirectionDefaultValue } from '../constants/constants'
import { mergeUniqueById } from '../../../utils/functionUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { EVENTS } from '../../../utils/constants'
import {
  applyDefaultLocalitiesFromEmployeeAddresses,
  checkTripExistsWithEntityPredicate,
  createBorderCrossingTransformer,
  getLatestRejectCommentFromCommentList,
  preserveTripIdsIfCountsMatch
} from '../../shared/utils/tripScreenSharedUtils'
import {
  applyEffectiveCostCenterToRows,
  resolveInheritedOrSelectedCostCenterId,
  resolveItemCostCenterId,
  resolveMainCostCenterId
} from '../../shared/utils/effectiveCostCenter'

export {
  createBorderCrossingTransformer,
  getValidLocality,
  prepareTripData,
  preserveTripIdsIfCountsMatch
} from '../../shared/utils/tripScreenSharedUtils'

/**
 * Parse an ISO date-time string into a local date-only Date at midnight.
 * Avoids timezone shifts that occur with new Date('YYYY-MM-DD').
 */
const parseDateOnlyLocal = (isoDateTime?: string): Date | undefined => {
  if (!isoDateTime) return undefined
  try {
    const datePart = isoDateTime.split('T')[0]
    const [y, m, d] = datePart.split('-').map(v => parseInt(v, 10))
    if (!y || !m || !d) return undefined
    return new Date(y, m - 1, d, 0, 0, 0, 0) // local midnight
  } catch {
    return undefined
  }
}

/**
 * Creates a detailed log object for the trip save event
 * @param startLocation - Start location data
 * @param endLocation - End location data
 * @param initialRequest - Initial request data
 * @param employeeRuleId - Employee rule ID
 * @param currentTitle - Current editable title value
 * @param currentCurrency - Current determined currency value
 * @returns Detailed log object
 */
export const createTripLogObject = (
  startLocation: LocationData,
  endLocation: LocationData,
  initialRequest: any,
  employeeRuleId: string,
  currentTitle: string,
  currentCurrency: string | null,
  event: string,
  effectiveCostCenterId: string,
  overnightAccommodation?: boolean
): LogObject => {
  const startTripDateTime = combineDateTimeToISOString(startLocation.departureDate, startLocation.departureTime)
  const endTripDateTime = combineDateTimeToISOString(endLocation.departureDate, endLocation.departureTime)
  return {
    stepKey: SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + event,
    event: event,
    expenseRequest: {
      id: initialRequest.id,
      startDate: startTripDateTime || initialRequest.startDate || '',
      endDate: endTripDateTime || initialRequest.endDate || '',
      expenseRule: employeeRuleId || '',
      version: initialRequest.version || 0,
      description: initialRequest.description || '',
      costCenter: effectiveCostCenterId,
      employee: initialRequest.employeeId || '',
      expensePlan: initialRequest.expensePlanId || '',
      title: currentTitle || initialRequest.title || '',
      status: initialRequest.status,
      requestDate: initialRequest.requestDate ? dayjs(initialRequest.requestDate).format('YYYY-MM-DD') : '',
      requestTypeRef: initialRequest.requestTypeRef,
      additionalProperties: initialRequest.additionalProperties || {},
      currencyRef: currentCurrency || initialRequest.currency?.id,
      overnightAccommodation: !!overnightAccommodation
    }
  }
}

/**
 * Create a trip point from location data
 * @param location - Location data
 * @param pointType - Point type
 * @param tripDirection - Trip direction
 * @param tripOrder - Trip order
 * @param initialRequest - Initial request data
 * @param expenseRulesData - Expense rules data
 * @param endLocation - Optional end location for reference (used for destinations)
 * @returns Trip data object
 */
const createTripPoint = (
  location: LocationData,
  pointType: string,
  tripDirection: string,
  tripOrder: number,
  initialRequest: any,
  expenseRulesData: any,
  effectiveCostCenterId: string,
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
    costCenter: effectiveCostCenterId,
    expensePlan: initialRequest.expensePlanId ? initialRequest.expensePlanId : '',
    tripOrder: tripOrder,
    travelRegionRef: travelRegionRef,
    countryRef: getCountryRefFromRegion(travelRegionRef, expenseRulesData),
    expenseRequest: initialRequest.id || '',
    project: initialRequest.project ? initialRequest.project.id : '',
    allowanceRegionRuleDetail: getAllowanceRegionRuleDetailId(travelRegionRef, expenseRulesData) || ''
  }
}

/**
 * Transform trips data
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param initialRequest - Fetched request data
 * @param expenseRulesData - Expense rules data
 * @returns Transformed trips array
 */
export const transformTrips = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  initialRequest: any,
  expenseRulesData: any,
  effectiveCostCenterId: string
): TripData[] => {
  const tripsArray: TripData[] = []
  let tripOrderIndex = 1
  tripsArray.push(
    createTripPoint(
      startLocation,
      PointTypeEnum.start,
      TripDirectionDefaultValue.go,
      tripOrderIndex,
      initialRequest,
      expenseRulesData,
      effectiveCostCenterId
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
          initialRequest,
          expenseRulesData,
          effectiveCostCenterId,
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
      initialRequest,
      expenseRulesData,
      effectiveCostCenterId
    )
  )

  return tripsArray
}

/**
 * Find region rule detail from travel region reference
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns Region rule detail or undefined
 */
export const findRegionRuleDetail = (travelRegionRef: string, expenseRulesData: any): any => {
  if (!expenseRulesData?.AllowanceRegionRuleDetail) return undefined

  const hasHomeRegionRule = expenseRulesData.homeRegionRule?.length > 0
  if (
    hasHomeRegionRule &&
    (!travelRegionRef || travelRegionRef === expenseRulesData.homeRegionRule[0].travelRegionRef)
  ) {
    return expenseRulesData.AllowanceRegionRuleDetail.find(
      (detail: any) =>
        detail.travelRegionRef === expenseRulesData.homeRegionRule[0].travelRegionRef && detail.home === true
    )
  }

  if (travelRegionRef) {
    const detail = expenseRulesData.AllowanceRegionRuleDetail.find(
      (detail: any) => detail.travelRegionRef === travelRegionRef
    )
    if (detail) return detail
  }

  return expenseRulesData.AllowanceRegionRuleDetail.find((detail: any) => detail.home === true)
}

/**
 * Get country reference from travel region reference
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns Country reference or empty string
 */
export const getCountryRefFromRegion = (travelRegionRef: string, expenseRulesData: any): string => {
  const detail = findRegionRuleDetail(travelRegionRef, expenseRulesData)
  return detail?.countryRef || ''
}

/**
 * Get allowance region rule detail ID from travel region reference
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns Allowance region rule detail ID or empty string
 */
export const getAllowanceRegionRuleDetailId = (travelRegionRef: string, expenseRulesData: any): string => {
  const detail = findRegionRuleDetail(travelRegionRef, expenseRulesData)
  return detail?.id || ''
}

/**
 * Check if trip exists in array
 * @param array - Array of trips
 * @param pointType - Point type
 * @param objectToCheck - Object to check
 * @returns Found trip or null
 */
export const checkTripExists = (
  array: any[] | undefined,
  pointType: string,
  objectToCheck: TripData
): TripData | null =>
  checkTripExistsWithEntityPredicate(
    array,
    pointType,
    objectToCheck,
    (item, o) => item.expenseRequestId === o.expenseRequest
  )

export const handleTripSubmitAction = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  expenseRulesData: any,
  expenseRequestData: any,
  employeeRuleId: string,
  currentTitle: string,
  currentCurrency: string | null,
  event: string,
  overnightAccommodation?: boolean,
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean,
  t?: ExpenseRequestWizardTranslateFn
): boolean => {
  const initialRequest = expenseRequestData?.ExpenseRequestByPk
  if (!initialRequest) {
    showToast(t ? t('trip-missing-request-data') : 'Missing request data', 'error')
    return false
  }
  const effectiveCostCenterId = resolveMainCostCenterId(
    expenseRequestData?.EmployeePosition,
    initialRequest.costCenterId || '',
    initialRequest.additionalProperties
  )
  const logObject = createTripLogObject(
    startLocation,
    endLocation,
    initialRequest,
    employeeRuleId,
    currentTitle,
    currentCurrency,
    event,
    effectiveCostCenterId,
    overnightAccommodation
  )
  const requestItems: Array<{
    id: string
    version: string | number
    code: string
    title: string
    ruleId: string
    expenseRequest: string
    costCenter: string
    project: string
    expenseGroupRef: string
    source: string
    expenseClassRef: string
    autoCalculated: boolean
  }> = []
  if (expenseRequestData.ExpenseItem && Array.isArray(expenseRequestData.ExpenseItem)) {
    expenseRequestData.ExpenseItem.forEach((item: any) => {
      if (item) {
        requestItems.push({
          id: item.id,
          version: item.version,
          code: item.code || '',
          title: item.title || '',
          ruleId: item.expenseRuleId || '',
          expenseRequest: initialRequest.id || '',
          costCenter: resolveItemCostCenterId(item, effectiveCostCenterId, initialRequest.costCenterId || ''),
          project: item.projectId || '',
          expenseGroupRef: item.expenseGroupRef || '',
          source: item.source || '',
          expenseClassRef: item.expenseClassRef || '',
          autoCalculated: item.autoCalculated || false
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
    expenseRequest: string
    costCenter: string
    project: string
    expenseGroupRef: string
    source: string
    expenseClassRef: string
    autoCalculated: boolean
  }> = []
  if (
    expenseRequestData.additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems &&
    Array.isArray(expenseRequestData.additionalData.psi_taskPayload.psi_initialParameters.expenseItems)
  ) {
    expenseRequestData.additionalData.psi_taskPayload.psi_initialParameters.expenseItems.forEach((item: any) => {
      additionalItems.push({
        id: item.id,
        version: item.version,
        code: item.code || '',
        title: item.title || '',
        ruleId: item.expenseRuleId || '',
        expenseRequest: initialRequest.id || '',
        costCenter: resolveItemCostCenterId(item, effectiveCostCenterId, initialRequest.costCenterId || ''),
        project: item.projectId || '',
        expenseGroupRef: item.expenseGroupRef || '',
        source: item.source || '',
        expenseClassRef: item.expenseClassRef || '',
        autoCalculated: item.autoCalculated || false
      })
    })
  }
  const combinedItems = mergeUniqueById(requestItems, additionalItems)

  ;(logObject as LogObject).expenseRequestItems = {
    expenseItems: combinedItems
  }

  const tripsTransformer = transformTrips(
    startLocation,
    destinations,
    endLocation,
    initialRequest,
    expenseRulesData,
    effectiveCostCenterId
  )

  const borderCrossTransformer = createBorderCrossingTransformer()

  const verifiedTrips =
    borderCrossTransformer(tripsTransformer).length !== 0 ? borderCrossTransformer(tripsTransformer) : ''

  const arrayWithExistingTrips: TripData[] = []
  if (verifiedTrips) {
    verifiedTrips.forEach((element: TripData) => {
      const foundElement = checkTripExists(initialRequest.expenseRequestTrip, element.pointType, element)
      arrayWithExistingTrips.push(
        foundElement ? { ...element, id: foundElement.id, version: foundElement.version } : element
      )
    })
  }

  // Fallback: if counts match, preserve ids/versions by pointType and tripOrder alignment
  const finalTrips =
    Array.isArray(initialRequest.expenseRequestTrip) && verifiedTrips
      ? preserveTripIdsIfCountsMatch(initialRequest.expenseRequestTrip, arrayWithExistingTrips)
      : arrayWithExistingTrips

  ;(logObject as LogObject).expenseRequestTrips = {
    expenseTrips: verifiedTrips
      ? finalTrips
      : applyEffectiveCostCenterToRows(initialRequest.expenseRequestTrip, effectiveCostCenterId)
  }
  const travelBreakdowns: any[] = (expenseRequestData?.TravelBreakdown || []).map((item: any) => ({
    id: item.id,
    version: item.version,
    breakfast: item.breakfast,
    lunch: item.lunch,
    dinner: item.dinner,
    overnight: item.overnight,
    expenseDate: item.expenseDate,
    travelRegionRef: item.travelRegionRef,
    project: item.projectId,
    expenseRule: item.expenseRuleId,
    expenseRequest: initialRequest?.id,
    costCenter: resolveInheritedOrSelectedCostCenterId(
      item.costCenterId,
      effectiveCostCenterId,
      initialRequest?.costCenterId || ''
    )
  }))
  ;(logObject as LogObject).travelBreakdownWrapper = {
    travelBreakdowns: travelBreakdowns
  }
  if (dispatchProcessContinueEventIfEnabled) {
    return dispatchProcessContinueEventIfEnabled(event, logObject)
  } else {
    dispatchProcessContinueEvent(event, logObject)
    return true
  }
}

/**
 * Sets trip data from external component data
 * @param expenseRequestData - Expense request data
 * @param expenseRulesData - Expense rules data
 * @param setStartLocation - Function to set start location
 * @param setDestinations - Function to set destinations
 * @param setEndLocation - Function to set end location
 */
export const setByExternalCustomComponent = (
  expenseData: any,
  expenseRulesData: any,
  setStartLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setDestinations: React.Dispatch<React.SetStateAction<LocationData[]>>,
  setEndLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  t?: ExpenseRequestWizardTranslateFn
) => {
  const localExpenseData = expenseData?.ExpenseRequestByPk || expenseData?.ExpensePlanByPk
  let tripData = []
  if (
    localExpenseData?.expenseRequestTrip &&
    Array.isArray(localExpenseData.expenseRequestTrip) &&
    localExpenseData.expenseRequestTrip.length !== 0
  )
    tripData = localExpenseData.expenseRequestTrip
  else {
    if (
      localExpenseData?.expensePlan &&
      localExpenseData?.expensePlan?.expenseRequestTrip &&
      Array.isArray(localExpenseData.expensePlan.expenseRequestTrip) &&
      localExpenseData.expensePlan.expenseRequestTrip.length !== 0
    )
      tripData = localExpenseData.expensePlan.expenseRequestTrip
  }
  if (tripData.length === 0) {
    return
  }
  try {
    // Find start point
    const startPoint = tripData.find((trip: any) => trip.pointType === 'START_POINT')
    if (startPoint) {
      setStartLocation(prev => ({
        ...prev,
        location: startPoint.address || '',
        departureDate: parseDateOnlyLocal(startPoint.tripDateTime),
        departureTime: startPoint.tripDateTime ? new Date(startPoint.tripDateTime) : undefined,
        travelRegionRef: startPoint.travelRegionRef || '',
        isAbroad: isRequestTripPointAbroad(startPoint, expenseRulesData)
      }))
    }

    // Find destination points
    const destinationPoints = tripData
      .filter((trip: any) => trip.pointType === 'DESTINATION_POINT')
      .sort((a: any, b: any) => a.tripOrder - b.tripOrder)

    if (destinationPoints.length === 1) {
      const singleDestination = destinationPoints[0]
      const formattedSingleDestination = {
        id: `destination-${0}`,
        name: '',
        location: singleDestination.address || '',
        departureDate: undefined,
        departureTime: undefined,
        isCollapsed: false,
        travelRegionRef: singleDestination.travelRegionRef || '',
        isAbroad: isRequestTripPointAbroad(singleDestination, expenseRulesData)
      }
      setDestinations([formattedSingleDestination])
    } else if (destinationPoints.length > 0) {
      const formattedDestinations = destinationPoints.map((destination: any, index: number) => {
        return {
          id: `destination-${index}`,
          name: '',
          location: destination.address || '',
          departureDate: parseDateOnlyLocal(destination.tripDateTime),
          departureTime: destination.tripDateTime ? new Date(destination.tripDateTime) : undefined,
          isCollapsed: false,
          travelRegionRef: destination.travelRegionRef || '',
          isAbroad: isRequestTripPointAbroad(destination, expenseRulesData)
        }
      })

      setDestinations(formattedDestinations)
    }

    // Find end point
    const endPoint = tripData.find((trip: any) => trip.pointType === 'END_POINT')
    if (endPoint) {
      setEndLocation(prev => ({
        ...prev,
        location: endPoint.address || '',
        departureDate: parseDateOnlyLocal(endPoint.tripDateTime),
        departureTime: endPoint.tripDateTime ? new Date(endPoint.tripDateTime) : undefined,
        travelRegionRef: endPoint.travelRegionRef || '',
        isAbroad: isRequestTripPointAbroad(endPoint, expenseRulesData)
      }))
    }
  } catch {
    showToast(t ? t('error-prefill-trip-data', 'Error prefilling trip data') : 'Error prefilling trip data', 'error')
  }
}

/**
 * Check if a persisted trip point is abroad.
 * Unknown or stale persisted regions remain local instead of being inferred as abroad.
 * @param tripPoint - Saved trip point
 * @param expenseRulesData - Expense rules data
 * @returns True if region is abroad, false otherwise
 */
const isRequestTripPointAbroad = (tripPoint: any, expenseRulesData: any): boolean => {
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

  const hasExplicitAbroadDetail =
    !!allowanceRegionRuleDetailId &&
    ruleDetails.some((detail: any) => detail.id === allowanceRegionRuleDetailId && detail.home === false)
  if (hasExplicitAbroadDetail) {
    return true
  }

  // Avoid classifying a local saved point as abroad when validation reloads with a different rule set.
  return false
}

export const setLocalitiesDefault = (
  expenseRequestData: any,
  setStartLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setEndLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setLocationsAreSynced: React.Dispatch<React.SetStateAction<boolean>>
) => {
  applyDefaultLocalitiesFromEmployeeAddresses(
    expenseRequestData?.EmployeeAddress,
    setStartLocation,
    setEndLocation,
    setLocationsAreSynced
  )
}

export const getLatestRejectComment = (expenseRequestData: any) =>
  getLatestRejectCommentFromCommentList(expenseRequestData?.ExpenseRequestByPk?.expenseRequestComment)

export const setInitialScreen = (
  additionalData: any,
  expenseRequestData: any,
  isTrip: boolean,
  setCurrentScreen: React.Dispatch<React.SetStateAction<string>>,
  currentScreen?: string
) => {
  const stepKey = additionalData?.psi_taskPayload?.stepKey
  if (stepKey) {
    let targetScreen = SCREEN_NAMES_ENUM.LOAD_TAB

    if (stepKey.includes(EVENTS.SAVE)) {
      switch (stepKey) {
        case SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + EVENTS.SAVE:
          targetScreen = SCREEN_NAMES_ENUM.TRIPS_TAB
          break
        case SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + EVENTS.SAVE:
          targetScreen = SCREEN_NAMES_ENUM.ITEMS_TAB
          break
        case SCREEN_NAMES_ENUM.ALLOWANCE_TAB + '_' + EVENTS.SAVE:
          targetScreen = SCREEN_NAMES_ENUM.ALLOWANCE_TAB
          break
        case SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + EVENTS.SAVE:
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        default:
          targetScreen = SCREEN_NAMES_ENUM.LOAD_TAB
          break
      }
    } else if (stepKey.includes(EVENTS.NEXT)) {
      switch (stepKey) {
        case SCREEN_NAMES_ENUM.TRIPS_TAB + '_' + EVENTS.NEXT:
          targetScreen = SCREEN_NAMES_ENUM.ITEMS_TAB
          break
        case SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + EVENTS.NEXT:
          targetScreen = isTrip ? SCREEN_NAMES_ENUM.ALLOWANCE_TAB : SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.ALLOWANCE_TAB + '_' + EVENTS.NEXT:
          targetScreen = SCREEN_NAMES_ENUM.SUMMARY_TAB
          break
        case SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + EVENTS.NEXT:
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
    if (expenseRequestData) {
      const defaultScreen = isTrip ? SCREEN_NAMES_ENUM.TRIPS_TAB : SCREEN_NAMES_ENUM.ITEMS_TAB
      if (currentScreen !== defaultScreen) {
        setCurrentScreen(defaultScreen)
      }
    }
  }
}
