import { ExpenseRequestTrip, TravelRegion } from '../types/expenseRequestV2Types'

/**
 * Extracts destinations from a list of trip points.
 */
export const getDestinationsFromTrips = (trips: ExpenseRequestTrip[] = []): ExpenseRequestTrip[] => {
  return trips.filter(trip => trip?.pointType === 'DESTINATION_POINT')
}

/**
 * Resolves a catalog value to display string using a resolver function.
 * The resolver is injected for testability and environment decoupling.
 */
export const resolveCatalogValue = (
  region: TravelRegion | undefined,
  resolver: (region: TravelRegion) => string
): string => {
  if (!region) return ''
  return resolver(region)
}

/**
 * Maps destinations to country display names using the provided resolver.
 */
export const mapDestinationsToCountries = (
  destinations: ExpenseRequestTrip[],
  resolver: (region: TravelRegion) => string
): string[] => {
  return destinations.map(d => resolveCatalogValue(d.travelRegion, resolver)).filter(Boolean)
}

/**
 * Joins an array of countries into a comma-separated string.
 */
export const joinCountries = (countries: string[]): string => countries.join(', ')

/**
 * High-level function returning a typed result with countries string.
 */
export const getDestinationCountriesSummary = (
  trips: ExpenseRequestTrip[] = [],
  resolver: (region: TravelRegion) => string
): { countries: string } => {
  const destinations = getDestinationsFromTrips(trips)
  const countryList = mapDestinationsToCountries(destinations, resolver)
  return { countries: joinCountries(countryList) }
}
