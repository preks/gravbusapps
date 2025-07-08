import { DateTimeLimits, LocationData, MaxDateTimeLimits, MinDateTimeLimits } from "./types";

export const getMaxLimits = (destinations: LocationData[], endLocation: LocationData): MaxDateTimeLimits => {
    const destinationLimit = destinations.find((dest) => dest.departureDate);
  
    if (destinationLimit) {
      return { maxDate: destinationLimit.departureDate, maxTime: destinationLimit.departureTime };
    }
  
    return { maxDate: endLocation.departureDate, maxTime: endLocation.departureTime };
  };
  
  export const getMinLimits = (startLocation: LocationData, destinations: LocationData[]): MinDateTimeLimits => {
    const destinationLimit = destinations.find((dest) => dest.departureDate);
  
    if (destinationLimit) {
      return { minDate: destinationLimit.departureDate, minTime: destinationLimit.departureTime };
    }
  
    return { minDate: startLocation.departureDate, minTime: startLocation.departureTime };
  };


  export const getMinMaxLimits = (
    startLocation: LocationData,
    endLocation: LocationData,
    destinations: LocationData[],
    currentDestination: LocationData
  ): DateTimeLimits => {
    const indexOfCurrentDestination = destinations.findIndex((dest) => dest.id === currentDestination.id);
  
    const destinationsBeforeCurrent = destinations.slice(0, indexOfCurrentDestination);
    const destinationsAfterCurrent = destinations.slice(indexOfCurrentDestination + 1);
  
    const minLimits = getMinLimits(startLocation, destinationsBeforeCurrent);
    const maxLimits = getMaxLimits(destinationsAfterCurrent, endLocation);
  
    return {
      minDate: minLimits.minDate,
      minTime: minLimits.minTime,
      maxDate: maxLimits.maxDate,
      maxTime: maxLimits.maxTime,
    };
  };
  
  export const isLocationValid = (locationValues: LocationData, isDateAndTimeOptional: boolean = false) => {
    const { location, departureDate, departureTime, isAbroad } = locationValues;
  
    if (!location) return false;
    if (!departureDate && !isDateAndTimeOptional) return false;
    if (!departureTime && !isDateAndTimeOptional) return false;
    // if (isAbroad && !regionValue) return false;
  
    return true;
  };

/**
 * Validates and sanitizes location data against date/time constraints
 * If date is invalid, clears both date and time
 * If time is invalid but date is valid, only clears time
 * @param location The location data to validate
 * @param limits The date/time constraints to validate against
 * @returns Sanitized location data with invalid values cleared
 */
export const validateAndSanitizeLocation = (location: LocationData, limits: DateTimeLimits): LocationData => {
  const { minDate, maxDate, minTime, maxTime } = limits;
  const { departureDate, departureTime } = location;
  
  // If no date, nothing to validate
  if (!departureDate) return location;
  
  // Check if date is within limits
  const isDateValid = (!minDate || departureDate >= minDate) && 
                     (!maxDate || departureDate <= maxDate);
  
  // If date is invalid, clear both date and time
  if (!isDateValid) {
    return {
      ...location,
      departureDate: undefined,
      departureTime: undefined
    };
  }
  
  // If date is valid but we have time constraints to check
  if (departureTime) {
    // Only apply time constraints if the date matches the boundary date
    const shouldCheckMinTime = minDate && minTime && checkIfSameDay(departureDate, minDate);
    const shouldCheckMaxTime = maxDate && maxTime && checkIfSameDay(departureDate, maxDate);
    
    // Check if time is within limits
    const isTimeValid = (!shouldCheckMinTime || departureTime >= minTime) && 
                       (!shouldCheckMaxTime || departureTime <= maxTime);
    
    // If time is invalid, clear only the time
    if (!isTimeValid) {
      return {
        ...location,
        departureTime: undefined
      };
    }
  }
  
  // Everything is valid
  return location;
};

  export const checkIfSameDay = (date1?: Date, date2?: Date) => {
    if (!date1 || !date2) return false;
  
    const formattedDate1 = new Date(date1);
    const formattedDate2 = new Date(date2);
  
    return (
      formattedDate1.getDate() === formattedDate2.getDate() &&
      formattedDate1.getMonth() === formattedDate2.getMonth() &&
      formattedDate1.getFullYear() === formattedDate2.getFullYear()
    );
  };