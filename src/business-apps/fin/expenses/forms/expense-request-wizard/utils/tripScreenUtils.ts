import dayjs from 'dayjs';
import { combineDateTimeToISOString } from './locationTimeUtils';
import { LocationData, LogObject, TripData } from './types';
import { showToast } from '../../../utils/notificationUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { ADDRESS_TYPES_ENUM, PointTypeEnum, SCREEN_NAMES_ENUM, TripDirectionDefaultValue } from '../constants/constants';
import { mergeUniqueById } from '../../../utils/functionUtils';

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
      travelRegionRef: !startLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
        ? expenseRulesData.homeRegionRule[0].travelRegionRef
        : startLocation.travelRegionRef
    },
    destinations: destinations.map(destination => ({
      ...destination,
      travelRegionRef: !destination.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
        ? expenseRulesData.homeRegionRule[0].travelRegionRef
        : destination.travelRegionRef
    })),
    endLocation: {
      ...endLocation,
      travelRegionRef: !endLocation.isAbroad && expenseRulesData?.homeRegionRule?.length > 0
        ? expenseRulesData.homeRegionRule[0].travelRegionRef
        : endLocation.travelRegionRef
    }
  };
};

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
  event:string
): LogObject => {
  const startTripDateTime = combineDateTimeToISOString(startLocation.departureDate, startLocation.departureTime);
  const endTripDateTime = combineDateTimeToISOString(endLocation.departureDate, endLocation.departureTime);
  
  return {
    stepKey: SCREEN_NAMES_ENUM.TRIPS_TAB + "_" + event,
    event: event,
    expenseRequest: {
      id: initialRequest.id,
      startDate: startTripDateTime || initialRequest.startDate || "",
      endDate: endTripDateTime || initialRequest.endDate || "",
      expenseRule: employeeRuleId || "",
      version: initialRequest.version || "",
      costCenter: initialRequest.costCenterId || "",
      employee: initialRequest.employeeId || "",
      expensePlan: initialRequest.expensePlanId || "",
      title: currentTitle || initialRequest.title || "",
      status: initialRequest.status,
      requestDate: initialRequest.requestDate ? dayjs(initialRequest.requestDate).format("YYYY-MM-DD") : "",
      requestTypeRef: initialRequest.requestTypeRef,
      additionalProperties: initialRequest.additionalProperties,
      currencyRef: currentCurrency || initialRequest.currency?.id
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
  const travelRegionRef = location.travelRegionRef || 
    (expenseRulesData?.homeRegionRule?.length > 0 ? expenseRulesData.homeRegionRule[0].travelRegionRef : "");
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
  tripsArray.push(createTripPoint(
    startLocation,
    PointTypeEnum.start,
    TripDirectionDefaultValue.go,
    tripOrderIndex,
    initialRequest,
    expenseRulesData
  ));
  
  tripOrderIndex += 1;

  if (!(destinations.length === 1 && (destinations[0].location === "" && !destinations[0].departureDate && !destinations[0].departureTime))) {
    destinations.forEach((element) => {
      tripsArray.push(createTripPoint(
        element,
        PointTypeEnum.destination,
        TripDirectionDefaultValue.go,
        tripOrderIndex++,
        initialRequest,
        expenseRulesData,
        endLocation 
      ));
    });
  }
  
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

  const hasHomeRegionRule = expenseRulesData.homeRegionRule?.length > 0;
  if (hasHomeRegionRule && 
      (!travelRegionRef || travelRegionRef === expenseRulesData.homeRegionRule[0].travelRegionRef)) {
    return expenseRulesData.AllowanceRegionRuleDetail.find(
      (detail: any) => detail.travelRegionRef === expenseRulesData.homeRegionRule[0].travelRegionRef && detail.home === true
    );
  }

  if (travelRegionRef) {
    const detail = expenseRulesData.AllowanceRegionRuleDetail.find(
      (detail: any) => detail.travelRegionRef === travelRegionRef
    );
    if (detail) return detail;
  }
  
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
      if (previousLocation && location && location.countryRef !== previousLocation.countryRef) {
        switch(location.pointType) {
          case PointTypeEnum.start:
            break;
          case PointTypeEnum.destination:
            locationsWithBorderCrossing.push({
              ...location,
              pointType: PointTypeEnum.border,
              tripDateTime: previousLocation.tripDateTime
            });
            break;
          case PointTypeEnum.end:
            locationsWithBorderCrossing.push({
              ...location,
              pointType: PointTypeEnum.border,
              tripDateTime: location.tripDateTime,
            });
            break;
          default:
            console.error('Unsupported pointType: ' + location.pointType);
        }
      }
      locationsWithBorderCrossing.push(location);
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

export const handleTripSubmitAction = (
  startLocation: LocationData,
  destinations: LocationData[],
  endLocation: LocationData,
  expenseRulesData: any,
  expenseRequestData: any,
  employeeRuleId: string,
  currentTitle: string,
  currentCurrency: string | null,
  event:string
): boolean => {
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
  const logObject = createTripLogObject(startLocation, endLocation, initialRequest, employeeRuleId, currentTitle, currentCurrency,event);
  const requestItems: Array<{id: string, code: string, title: string, ruleId: string, expenseRequest: string}> = [];
  if (expenseRequestData.ExpenseItem && Array.isArray(expenseRequestData.ExpenseItem)) {
    expenseRequestData.ExpenseItem.forEach((item: any) => {
      if (item) {
        requestItems.push({
          id: item.id,
          code: item.code || '',
          title: item.title || '',
          ruleId: item.expenseRuleId || '',
          expenseRequest: initialRequest.id || ''
        });
      }
    });
  }
  const additionalItems: Array<{id: string, code: string, title: string, ruleId: string, expenseRequest: string}> = [];
  if (expenseRequestData.additionalData?.psi_taskPayload?.initialParameters?.expenseItems && 
      Array.isArray(expenseRequestData.additionalData.psi_taskPayload.initialParameters.expenseItems)) {
    expenseRequestData.additionalData.psi_taskPayload.initialParameters.expenseItems.forEach((item: any) => {
      additionalItems.push({
        id: item.id,
        code: item.code || '',
        title: item.title || '',
        ruleId: item.expenseRuleId || '',
        expenseRequest: initialRequest.id || ''
      });
    });
  }
  const combinedItems = mergeUniqueById(requestItems, additionalItems);
  
  (logObject as LogObject).expenseRequestItems = {
    expenseItems: combinedItems
  };
  
  const tripsTransformer = transformTrips(startLocation, destinations, endLocation, initialRequest, expenseRulesData);

  const borderCrossTransformer = createBorderCrossingTransformer();

  const verifiedTrips = (borderCrossTransformer(tripsTransformer).length !== 0) ? borderCrossTransformer(tripsTransformer) : "";

  const arrayWithExistingTrips: TripData[] = [];
  if (verifiedTrips) {
    verifiedTrips.forEach((element: TripData) => {
      const foundElement = checkTripExists(initialRequest.expenseRequestTrip, element.pointType, element);
      arrayWithExistingTrips.push(foundElement || element);
    });
  }

  (logObject as LogObject).expenseRequestTrips = {
    expenseTrips: verifiedTrips ? arrayWithExistingTrips : (initialRequest.expenseRequestTrip || [])
  };

  console.log(logObject);
  
  // Here you would normally save the data
  // TODO: Implement actual save functionality
  
  return true;
};


export const getValidLocality = (employeeAddresses: any[]) => {
    if (!Array.isArray(employeeAddresses) || employeeAddresses.length === 0) {
      return "";
    }
    const primary = employeeAddresses.find(address => 
      address.type === ADDRESS_TYPES_ENUM.value.PRIMARY);
    if (primary && primary.locality && primary.locality.trim()) {
      return primary.locality;
    }
    const secondary = employeeAddresses.find(address => 
      address.type === ADDRESS_TYPES_ENUM.value.SECONDARY && 
      address.locality && address.locality.trim());
    return secondary ? secondary.locality : "";
  };

/**
 * Sets trip data from external component data
 * @param expenseRequestData - Expense request data
 * @param expenseRulesData - Expense rules data
 * @param setStartLocation - Function to set start location
 * @param setDestinations - Function to set destinations
 * @param setEndLocation - Function to set end location
 */
export const setByExternalCustomComponent = (
  expenseRequestData: any,
  expenseRulesData: any,
  setStartLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setDestinations: React.Dispatch<React.SetStateAction<LocationData[]>>,
  setEndLocation: React.Dispatch<React.SetStateAction<LocationData>>
) => {
  if (!expenseRequestData?.ExpenseRequestByPk?.expenseRequestTrip || 
      !Array.isArray(expenseRequestData.ExpenseRequestByPk.expenseRequestTrip) || 
      expenseRequestData.ExpenseRequestByPk.expenseRequestTrip.length === 0) {
    return;
  }

  try {
    const tripData = expenseRequestData.ExpenseRequestByPk.expenseRequestTrip;
    
    // Find start point
    const startPoint = tripData.find((trip: any) => trip.pointType === 'START_POINT');
    if (startPoint) {
      const isAbroad = checkIfAbroad(startPoint.travelRegionRef, expenseRulesData);
      setStartLocation(prev => ({
        ...prev,
        location: startPoint.address || '',
        departureDate: startPoint.tripDateTime ? new Date(startPoint.tripDateTime.split('T')[0]) : undefined,
        departureTime: startPoint.tripDateTime ? new Date(startPoint.tripDateTime) : undefined,
        travelRegionRef: startPoint.travelRegionRef || '',
        isAbroad
      }));
    }
    
    // Find destination points
    const destinationPoints = tripData
      .filter((trip: any) => trip.pointType === 'DESTINATION_POINT')
      .sort((a: any, b: any) => a.tripOrder - b.tripOrder);
    
    if (destinationPoints.length > 0) {
      const formattedDestinations = destinationPoints.map((destination: any, index: number) => {
        const isAbroad = checkIfAbroad(destination.travelRegionRef, expenseRulesData);
        return {
          id: `destination-${index}`,
          name: '',
          location: destination.address || '',
          departureDate: destination.tripDateTime ? new Date(destination.tripDateTime.split('T')[0]) : undefined,
          departureTime: destination.tripDateTime ? new Date(destination.tripDateTime) : undefined,
          isCollapsed: false,
          travelRegionRef: destination.travelRegionRef || '',
          isAbroad
        };
      });
      
      setDestinations(formattedDestinations);
    }
    
    // Find end point
    const endPoint = tripData.find((trip: any) => trip.pointType === 'END_POINT');
    if (endPoint) {
      const isAbroad = checkIfAbroad(endPoint.travelRegionRef, expenseRulesData);
      setEndLocation(prev => ({
        ...prev,
        location: endPoint.address || '',
        departureDate: endPoint.tripDateTime ? new Date(endPoint.tripDateTime.split('T')[0]) : undefined,
        departureTime: endPoint.tripDateTime ? new Date(endPoint.tripDateTime) : undefined,
        travelRegionRef: endPoint.travelRegionRef || '',
        isAbroad
      }));
    }
  } catch (error) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:modify_expense_request.error_prefill_trip_data',
        'Error prefilling trip data'
      ),
      'error'
    );
  }
};

/**
 * Check if a travel region is abroad
 * @param travelRegionRef - Travel region reference
 * @param expenseRulesData - Expense rules data
 * @returns True if region is abroad, false otherwise
 */
const checkIfAbroad = (travelRegionRef: string, expenseRulesData: any): boolean => {
  if (!travelRegionRef || !expenseRulesData?.homeRegionRule || !Array.isArray(expenseRulesData.homeRegionRule)) {
    return false;
  }
  
  // If the travel region is found in home region rules, it's not abroad
  const isHomeRegion = expenseRulesData.homeRegionRule.some(
    (rule: any) => rule.travelRegionRef === travelRegionRef
  );
  
  return !isHomeRegion;
};


export const setLocalitiesDefault = (expenseRequestData: any,
  setStartLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setEndLocation: React.Dispatch<React.SetStateAction<LocationData>>,
  setLocationsAreSynced: React.Dispatch<React.SetStateAction<boolean>>
) => {
    try {
      const employeeAddresses = expenseRequestData?.EmployeeAddress || [];
      const localityToSet = getValidLocality(employeeAddresses);
      
      if (localityToSet) {
        setStartLocation(prevLocation => ({
          ...prevLocation,
          location: localityToSet
        }));
        setEndLocation(prevLocation => ({
          ...prevLocation,
          location: localityToSet
        }));
        
        setLocationsAreSynced(true);
      }
    } catch (error) {
      
    }
  };
