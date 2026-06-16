import dayjs from 'dayjs'
import type { Dispatch, SetStateAction } from 'react'

import type { LocationData } from '../../expense-request-wizard/utils/types'
import { ADDRESS_TYPES_ENUM, PointTypeEnum } from '../../expense-request-wizard/constants/constants'

export interface SharedTripData {
  id?: string
  version?: string | number
  address: string
  tripDateTime: string
  pointType: string
  tripDirection: string
  costCenter: string
  tripOrder: number
  travelRegionRef: string
  countryRef: string
  allowanceRegionRuleDetail: string
  [key: string]: any
}

/**
 * Prepares trip data for saving (request & plan wizards).
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
 * Border-crossing segments for trip legs when country changes between points.
 */
export const createBorderCrossingTransformer = () => {
  return function addBorderCrossing<T extends SharedTripData>(locations: T[]): T[] {
    const locationsWithBorderCrossing: T[] = []
    let previousLocation: T | null = null

    for (const location of locations) {
      if (!location?.tripDateTime) {
        location.tripDateTime = previousLocation?.tripDateTime || '' // use the previous location's date time
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
 * Preserve existing trip ids/versions when the number of computed trips matches existing trips.
 */
export const preserveTripIdsIfCountsMatch = (
  existingTrips: SharedTripData[] | undefined,
  newTrips: SharedTripData[]
): SharedTripData[] => {
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

export type TripExistsEntityIdPredicate<T extends SharedTripData> = (item: any, objectToCheck: T) => boolean

/**
 * Match an existing backend trip row to a computed trip; entity id field differs for request vs plan.
 */
export const checkTripExistsWithEntityPredicate = <T extends SharedTripData>(
  array: any[] | undefined,
  pointType: string,
  objectToCheck: T,
  entityIdMatches: TripExistsEntityIdPredicate<T>
): T | null => {
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
        entityIdMatches(item, objectToCheck) &&
        item.allowanceRegionRuleDetailId === objectToCheck.allowanceRegionRuleDetail
      )
    }) || null
  if (found) {
    const merged: T = {
      ...objectToCheck,
      id: found.id,
      version: found.version
    }
    return merged
  }

  return null
}

export const getValidLocality = (employeeAddresses: any[]): string => {
  if (!Array.isArray(employeeAddresses) || employeeAddresses.length === 0) {
    return ''
  }
  const primary = employeeAddresses.find(address => address.type === ADDRESS_TYPES_ENUM.value.PRIMARY)
  if (primary?.locality?.trim()) {
    return primary.locality
  }
  const secondary = employeeAddresses.find(
    address => address.type === ADDRESS_TYPES_ENUM.value.SECONDARY && address.locality?.trim()
  )
  return secondary ? secondary.locality : ''
}

export const applyDefaultLocalitiesFromEmployeeAddresses = (
  employeeAddresses: any[] | undefined,
  setStartLocation: Dispatch<SetStateAction<LocationData>>,
  setEndLocation: Dispatch<SetStateAction<LocationData>>,
  setLocationsAreSynced: Dispatch<SetStateAction<boolean>>
): void => {
  try {
    const localityToSet = getValidLocality(employeeAddresses ?? [])

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

export const getLatestRejectCommentFromCommentList = (commentList: any[] | undefined | null) => {
  if (!commentList || !Array.isArray(commentList)) {
    return null
  }
  const filteredArray = commentList.filter((comment: any) => comment.commentType?.toUpperCase()?.includes('REJECT'))

  return filteredArray.length > 0
    ? [...filteredArray].sort(
        (a: any, b: any) => new Date(b.commentDate).getTime() - new Date(a.commentDate).getTime()
      )[0]
    : null
}
