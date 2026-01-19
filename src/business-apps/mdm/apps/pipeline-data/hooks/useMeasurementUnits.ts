import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface MeasurementUnit {
  id: string
  value: string
  code: string
  alternativeCode?: string
}

export interface MeasurementUnitsResponse {
  CatalogEntry: MeasurementUnit[]
}

export const GET_TIME_MEASUREMENT_UNITS = (): string => {
  return `
    query GetTimeMeasurementUnits {
      CatalogEntry(where: {
        id: {_like: "MeasurementUnit:v1:%"}
        _or: [
          {code: {_in: ["DAY", "DAYS", "WEEK", "WEEKS", "MONTH", "MONTHS", "YEAR", "YEARS"]}}
          {value: {_ilike: "%day%"}}
          {value: {_ilike: "%week%"}}
          {value: {_ilike: "%month%"}}
          {value: {_ilike: "%year%"}}
        ]
      }) {
        id
        value
        code
        alternativeCode
      }
    }
  `
}

export const useMeasurementUnits = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTimeMeasurementUnits = async (): Promise<MeasurementUnit[]> => {
    try {
      const query = GET_TIME_MEASUREMENT_UNITS()
      const result = await graphqlClient.request<MeasurementUnitsResponse>(query)

      // Sort by common order: Days, Weeks, Months
      const sortOrder = ['DAY', 'DAYS', 'WEEK', 'WEEKS', 'MONTH', 'MONTHS', 'YEAR', 'YEARS']

      return result.CatalogEntry.sort((a, b) => {
        const aIndex = sortOrder.indexOf(a.code)
        const bIndex = sortOrder.indexOf(b.code)

        // If both codes are in sortOrder, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }

        // If only one is in sortOrder, prioritize it
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        // If neither is in sortOrder, sort alphabetically by value
        return a.value.localeCompare(b.value)
      })
    } catch (error) {
      console.error('Error fetching measurement units:', error)
      return []
    }
  }

  return {
    fetchTimeMeasurementUnits
  }
}
