import { DateTimeLimits, LocationData, MaxDateTimeLimits, MinDateTimeLimits } from './types'
import dayjs from 'dayjs'

export const getMaxLimits = (destinations: LocationData[], endLocation: LocationData): MaxDateTimeLimits => {
  const destinationLimit = destinations.find(dest => dest.departureDate)

  if (destinationLimit) {
    return { maxDate: destinationLimit.departureDate, maxTime: destinationLimit.departureTime }
  }

  return { maxDate: endLocation.departureDate, maxTime: endLocation.departureTime }
}

export const getMinLimits = (startLocation: LocationData, destinations: LocationData[]): MinDateTimeLimits => {
  const destinationLimit = destinations.find(dest => dest.departureDate)

  if (destinationLimit) {
    return { minDate: destinationLimit.departureDate, minTime: destinationLimit.departureTime }
  }

  return { minDate: startLocation.departureDate, minTime: startLocation.departureTime }
}

export const getMinMaxLimits = (
  startLocation: LocationData,
  endLocation: LocationData,
  destinations: LocationData[],
  currentDestination: LocationData
): DateTimeLimits => {
  const indexOfCurrentDestination = destinations.findIndex(dest => dest.id === currentDestination.id)

  if (destinations.length === 1) {
    return {
      minDate: startLocation.departureDate,
      minTime: startLocation.departureTime,
      maxDate: endLocation.departureDate,
      maxTime: endLocation.departureTime
    }
  }
  const destinationsBeforeCurrent = destinations.slice(0, indexOfCurrentDestination)
  const destinationsAfterCurrent = destinations.slice(indexOfCurrentDestination + 1)

  const minLimits = getMinLimits(startLocation, destinationsBeforeCurrent)
  const maxLimits = getMaxLimits(destinationsAfterCurrent, endLocation)

  return {
    minDate: minLimits.minDate,
    minTime: minLimits.minTime,
    maxDate: maxLimits.maxDate,
    maxTime: maxLimits.maxTime
  }
}

export const isLocationValid = (locationValues: LocationData, isDateAndTimeOptional: boolean = false) => {
  const { location, departureDate, departureTime } = locationValues

  if (!location) return false
  if (!departureDate && !isDateAndTimeOptional) return false
  if (!departureTime && !isDateAndTimeOptional) return false
  // Note: Travel region validation is handled elsewhere

  return true
}

/**
 * Validates and sanitizes location data against date/time constraints
 * If date is invalid, clears both date and time
 * If time is invalid but date is valid, only clears time
 * @param location The location data to validate
 * @param limits The date/time constraints to validate against
 * @returns Sanitized location data with invalid values cleared
 */
export const validateAndSanitizeLocation = (location: LocationData, limits: DateTimeLimits): LocationData => {
  const { minDate, maxDate, minTime, maxTime } = limits
  const { departureDate, departureTime } = location

  // If no date, ensure time is also cleared
  if (!departureDate) {
    return {
      ...location,
      departureTime: undefined
    }
  }

  // Check if date is within limits (compare by calendar day only, regardless of time)
  // This avoids clearing the date when a time is selected but the day is valid
  const toYMD = (d?: Date) => (d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : null)
  const dep = toYMD(departureDate)
  const min = toYMD(minDate)
  const max = toYMD(maxDate)
  const minOk = min === null || (dep !== null && dep >= min)
  const maxOk = max === null || (dep !== null && dep <= max)
  const isDateValid: boolean = minOk && maxOk

  // If date is invalid, clear both date and time
  if (!isDateValid) {
    return {
      ...location,
      departureDate: undefined,
      departureTime: undefined
    }
  }

  // If date is valid but we have time constraints to check
  if (departureTime) {
    // Only apply time constraints if the date matches the boundary date
    const shouldCheckMinTime = minDate && minTime && checkIfSameDay(departureDate, minDate)
    const shouldCheckMaxTime = maxDate && maxTime && checkIfSameDay(departureDate, maxDate)
    // Normalize comparisons to time-of-day only (ignore embedded date on time objects)
    const toMinutesSinceMidnight = (t: Date): number => {
      const d = new Date(t)
      return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
    }

    const depMinutes = toMinutesSinceMidnight(departureTime as Date)
    const minMinutes = minTime ? toMinutesSinceMidnight(minTime as Date) : undefined
    const maxMinutes = maxTime ? toMinutesSinceMidnight(maxTime as Date) : undefined

    // Check if time is within limits for the same-day boundary
    const minOk = !shouldCheckMinTime || (minMinutes !== undefined && depMinutes >= minMinutes)
    const maxOk = !shouldCheckMaxTime || (maxMinutes !== undefined && depMinutes <= maxMinutes)
    const isTimeValid = minOk && maxOk

    // If time is invalid, clear only the time
    if (!isTimeValid) {
      return {
        ...location,
        departureTime: undefined
      }
    }
  }

  // Everything is valid
  return location
}

export const checkIfSameDay = (date1: Date | undefined, date2: Date | undefined): boolean => {
  if (!date1 || !date2) return false

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Combines date and time into an ISO string
 * @param date - Date object or string
 * @param time - Time as Date object or string
 * @param fallbackDate - Optional fallback date when both date and time are missing
 * @returns ISO string representation of the combined date and time, or fallback date if provided, or empty string if all are missing
 */
export const combineDateTimeToISOString = (
  date: Date | undefined,
  time: Date | undefined,
  fallbackDate?: Date | string
): string => {
  if (!date && !time) {
    if (fallbackDate) {
      return dayjs(fallbackDate).format('YYYY-MM-DD') + 'T00:00:00'
    }
    return ''
  }

  // If we only have time, return time as string
  if (!date && time) {
    const dateString = dayjs(time).format('YYYY-MM-DD')
    const timeString = dayjs(time).format('HH:mm:ss')
    return `${dateString}T${timeString}`
  }

  // If we only have date, return date as ISO string
  if (date && !time) {
    return dayjs(date).format('YYYY-MM-DD') + 'T00:00:00'
  }

  // If we have both, combine them
  const dateString = dayjs(date).format('YYYY-MM-DD')
  const timeString = dayjs(time).format('HH:mm:ss')

  // Create ISO string from combined date and time
  return `${dateString}T${timeString}`
}
