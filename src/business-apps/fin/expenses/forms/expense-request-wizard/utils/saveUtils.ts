import dayjs from 'dayjs';
import { combineDateTimeToISOString } from './locationTimeUtils';
import { LocationData, LogObject, TripData } from './types';
import { showToast } from '../../../utils/notificationUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PointTypeEnum, TripDirectionDefaultValue } from '../constants/constants';





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
      // If not abroad, use home region from expense rules
      travelRegionRef: !startLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
        ? expenseRulesData.homeRegionRule[0].travelRegionRef
        : startLocation.travelRegionRef
    },
    destinations: destinations.map(destination => ({
      ...destination,
      // If not abroad, use home region from expense rules
      travelRegionRef: !destination.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
        ? expenseRulesData.homeRegionRule[0].travelRegionRef
        : destination.travelRegionRef
    })),
    endLocation: {
      ...endLocation,
      // If not abroad, use home region from expense rules
      travelRegionRef: !endLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
        ? expenseRulesData.homeRegionRule[0].travelRegionRef
        : endLocation.travelRegionRef
    }
  };
};

/**
 * Creates a detailed log object for the trip save event
 * @param tripData - Prepared trip data
 * @param initialRequest - Initial request data
 * @param employeeRuleId - Employee rule ID
 * @returns Detailed log object
 */
export const createTripSaveLogObject = (
  startLocation: LocationData,
  endLocation: LocationData,
  initialRequest: any,
  employeeRuleId: string
): LogObject => {
  // Create start and end trip date/time ISO strings
  const startTripDateTime = combineDateTimeToISOString(startLocation.departureDate, startLocation.departureTime);
  const endTripDateTime = combineDateTimeToISOString(endLocation.departureDate, endLocation.departureTime);
  
  return {
    stepKey: "TripScreen_pse_save",
    event: "pse_save",
    expenseRequest: {
      id: initialRequest.id,
      startDate: startTripDateTime || initialRequest.startDate || "",
      endDate: endTripDateTime || initialRequest.endDate || "",
      expenseRule: employeeRuleId || "",
      version: initialRequest.version || "",
      costCenter: initialRequest.costCenterId || "",
      employee: initialRequest.employeeId || "",
      expensePlan: initialRequest.expensePlanId || "",
      title: initialRequest.title || "",
      deductibleAmount: initialRequest.deductibleAmount,
      nonDeductibleAmount: initialRequest.nonDeductibleAmount,
      reimbursableAmount: initialRequest.reimbursableAmount,
      nonReimbursableAmount: initialRequest.nonReimbursableAmount,
      totalAmountAllowance: initialRequest.totalAmountAllowance,
      totalAmountExpense: initialRequest.totalAmountExpense,
      totalAmountMileage: initialRequest.totalAmountMileage,
      totalRemainingAmount: initialRequest.totalRemainingAmount,
      status: initialRequest.status,
      requestDate: initialRequest.requestDate ? dayjs(initialRequest.requestDate).format("YYYY-MM-DD") : "",
      requestTypeRef: initialRequest.requestTypeRef,
      additionalProperties: initialRequest.additionalProperties,
      currencyRef: initialRequest.currency?.id
    }
  };
};

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
  endLocation?: LocationData
): TripData => {
  // Get home region reference if available and location is not abroad
  const travelRegionRef = location.travelRegionRef || 
    (expenseRulesData?.homeRegionRule?.length > 0 ? expenseRulesData.homeRegionRule[0].travelRegionRef : "");
  
  // For destinations with empty date/time, use end location's date/time if available
  let departureDate = location.departureDate;
  let departureTime = location.departureTime;
  
  if (pointType === PointTypeEnum.destination && 
      (!departureDate || !departureTime) && 
      endLocation) {
    departureDate = departureDate || endLocation.departureDate;
    departureTime = departureTime || endLocation.departureTime;
  }
  
  return {
    "address": location.location || "",
    "tripDateTime": combineDateTimeToISOString(departureDate, departureTime),
    "pointType": pointType,
    "tripDirection": tripDirection,
    "costCenter": initialRequest.costCenterId || "",
    "expensePlan": initialRequest.expensePlanId ? initialRequest.expensePlanId : "",
    "tripOrder": tripOrder,
    "travelRegionRef": travelRegionRef,
    "countryRef": getCountryRefFromRegion(travelRegionRef, expenseRulesData),
    "expenseRequest": initialRequest.id || "",
    "project": initialRequest.project ? initialRequest.project.id : "",
    "allowanceRegionRuleDetail": getAllowanceRegionRuleDetailId(travelRegionRef, expenseRulesData) || ""
  };
};

/**
 * Transform trips data
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param initialRequest - Fetched request data
 * @param expenseRulesData - Expense rules data
 * @returns Transformed trips array
 */
export const transformTrips = (startLocation: LocationData, destinations: LocationData[], endLocation: LocationData, initialRequest: any, expenseRulesData: any): TripData[] => {
  const tripsArray: TripData[] = [];
  let tripOrderIndex = 1;
  
  // Add start location
  // Create trip point from start location
  tripsArray.push(createTripPoint(
    startLocation,
    PointTypeEnum.start,
    TripDirectionDefaultValue.go,
    tripOrderIndex,
    initialRequest,
    expenseRulesData
  ));
  
  tripOrderIndex += 1;
  
  // Add destinations
  if (!(destinations.length === 1 && (destinations[0].location === "" && !destinations[0].departureDate && !destinations[0].departureTime))) {
    destinations.forEach((element) => {
      // Create trip point from destination
      tripsArray.push(createTripPoint(
        element,
        PointTypeEnum.destination,
        TripDirectionDefaultValue.go,
        tripOrderIndex++,
        initialRequest,
        expenseRulesData,
        endLocation // Pass end location for reference
      ));
    });
  }
  
  // Add end location
  // Create trip point from end location
  tripsArray.push(createTripPoint(
    endLocation,
    PointTypeEnum.end,
    TripDirectionDefaultValue.back,
    tripOrderIndex,
    initialRequest,
    expenseRulesData
  ));
  
  return tripsArray;
};

/**
 * Find region rule detail from travel region reference
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns Region rule detail or undefined
 */
const findRegionRuleDetail = (travelRegionRef: string, expenseRulesData: any): any => {
  if (!expenseRulesData?.AllowanceRegionRuleDetail) return undefined;
  
  // Check if we have a home region rule
  const hasHomeRegionRule = expenseRulesData.homeRegionRule?.length > 0;
  
  // If travelRegionRef matches home region or is empty, find home region detail
  if (hasHomeRegionRule && 
      (!travelRegionRef || travelRegionRef === expenseRulesData.homeRegionRule[0].travelRegionRef)) {
    return expenseRulesData.AllowanceRegionRuleDetail.find(
      (detail: any) => detail.travelRegionRef === expenseRulesData.homeRegionRule[0].travelRegionRef && detail.home === true
    );
  }
  
  // Try to find by travel region reference
  if (travelRegionRef) {
    const detail = expenseRulesData.AllowanceRegionRuleDetail.find(
      (detail: any) => detail.travelRegionRef === travelRegionRef
    );
    if (detail) return detail;
  }
  
  // Fallback to any home region
  return expenseRulesData.AllowanceRegionRuleDetail.find(
    (detail: any) => detail.home === true
  );
};

/**
 * Get country reference from travel region reference
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns Country reference or empty string
 */
export const getCountryRefFromRegion = (travelRegionRef: string, expenseRulesData: any): string => {
  const detail = findRegionRuleDetail(travelRegionRef, expenseRulesData);
  return detail?.countryRef || "";
};

/**
 * Get allowance region rule detail ID from travel region reference
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns Allowance region rule detail ID or empty string
 */
export const getAllowanceRegionRuleDetailId = (travelRegionRef: string, expenseRulesData: any): string => {
  const detail = findRegionRuleDetail(travelRegionRef, expenseRulesData);
  return detail?.id || "";
};

/**
 * Create border crossing transformer function
 * @returns Border crossing transformer function
 */
export const createBorderCrossingTransformer = () => {
  return function addBorderCrossing(locations: TripData[]): TripData[] {
    const locationsWithBorderCrossing: TripData[] = [];
    let previousLocation: TripData | null = null;
    
    for (const location of locations) {
      if (!(location && location.tripDateTime)) {
        location.tripDateTime = (previousLocation && previousLocation.tripDateTime) || ""; // use the previous location's date time
      }
      
      // check if the country has changed
      if (previousLocation && location && location.countryRef !== previousLocation.countryRef) {
        switch(location.pointType) {
          case PointTypeEnum.start:
            // no border crossing before start
            break;
          case PointTypeEnum.destination:
            locationsWithBorderCrossing.push({
              ...location,
              pointType: PointTypeEnum.border,
              tripDateTime: previousLocation.tripDateTime // use the previous location's date time
            });
            break;
          case PointTypeEnum.end:
            locationsWithBorderCrossing.push({
              ...location,
              pointType: PointTypeEnum.border,
              tripDateTime: location.tripDateTime, // use the end location's date time
            });
            break;
          default:
            console.error('Unsupported pointType: ' + location.pointType);
        }
      }
      
      // add location after border crossing to the list
      locationsWithBorderCrossing.push(location);
      
      // update the previous location
      previousLocation = location;
    }
    
    let indexTripOrder = 1;
    
    return locationsWithBorderCrossing.map(trip => {
      trip.tripOrder = indexTripOrder++;
      return trip;
    });
  };
};

/**
 * Check if trip exists in array
 * @param array - Array of trips
 * @param pointType - Point type
 * @param objectToCheck - Object to check
 * @returns Found trip or null
 */
export const checkTripExists = (array: any[] | undefined, pointType: string, objectToCheck: TripData): TripData | null => {
  if (!array) return null;
  
  const filteredArray = array.filter(item => item.pointType === pointType);
  const objectToCheckTime = new Date(objectToCheck.tripDateTime).getTime();
  
  return filteredArray.find(item => {
    const itemTime = new Date(item.tripDateTime).getTime();
    return item.address === objectToCheck.address &&
      itemTime === objectToCheckTime &&
      item.pointType === objectToCheck.pointType &&
      item.tripDirection === objectToCheck.tripDirection &&
      item.costCenterId === objectToCheck.costCenter &&
      item.tripOrder === objectToCheck.tripOrder &&
      item.travelRegionRef === objectToCheck.travelRegionRef &&
      item.countryRef === objectToCheck.countryRef &&
      item.expenseRequestId === objectToCheck.expenseRequest &&
      item.allowanceRegionRuleDetailId === objectToCheck.allowanceRegionRuleDetail;
  }) || null;
};

export const handleTripSave = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  expenseRulesData: any,
  expenseRequestData: any,
  employeeRuleId: string
): boolean => {
  // Get initial request data
  const initialRequest = expenseRequestData?.ExpenseRequestByPk;
  if (!initialRequest) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:expense_request_wizard.trip_screen.missing_request_data",
        "Missing request data"
      ),
      "error"
    );
    return false;
  }
  
  // Create detailed log object
  const logObject = createTripSaveLogObject(startLocation, endLocation, initialRequest, employeeRuleId);
  
  
  
  // Transform trips data
  const tripsTransformer = transformTrips(startLocation, destinations, endLocation, initialRequest, expenseRulesData);
  // Process border crossings
  const borderCrossTransformer = createBorderCrossingTransformer();
  
  // Verify trips
  const verifiedTrips = (borderCrossTransformer(tripsTransformer).length !== 0) ? borderCrossTransformer(tripsTransformer) : "";
  
  // Create array with existing trips
  const arrayWithExistingTrips: TripData[] = [];
  if (verifiedTrips) {
    verifiedTrips.forEach((element: TripData) => {
      const foundElement = checkTripExists(initialRequest.expenseRequestTrip, element.pointType, element);
      arrayWithExistingTrips.push(foundElement || element);
    });
  }
  
  // Add expenseRequestTrips to logObject
  (logObject as LogObject).expenseRequestTrips = {
    expenseTrips: verifiedTrips ? arrayWithExistingTrips : (initialRequest.expenseRequestTrip || [])
  };
  
  // Log the detailed object
  console.log(logObject);
  
  // Here you would normally save the data
  // TODO: Implement actual save functionality
  
  return true;
};
