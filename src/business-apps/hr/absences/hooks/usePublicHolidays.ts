/**
 * Hook for fetching public holidays from EmploymentRegionHoliday catalog
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { HolidayEntry, convertHolidaysToDateSet } from '../utils/vacationCalculations'
import { GET_EMPLOYMENT_REGION_HOLIDAYS, GET_EMPLOYEE_REGION } from '../queries/holidaysQueries'

interface UsePublicHolidaysProps {
  accessToken: string
  employeeId?: string
  regionIds?: string[]
}

interface UsePublicHolidaysReturn {
  holidays: HolidayEntry[]
  holidayDateSet: Set<string>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch public holidays for employee's region or specific regions
 *
 * @example
 * // Fetch holidays for specific employee (will auto-fetch their region)
 * const { holidays, holidayDateSet, isLoading } = usePublicHolidays({
 *   accessToken: context.accessToken,
 *   employeeId: 'employee-uuid'
 * })
 *
 * @example
 * // Fetch holidays for specific regions
 * const { holidays, holidayDateSet } = usePublicHolidays({
 *   accessToken: context.accessToken,
 *   regionIds: ['REGION_1', 'REGION_2']
 * })
 *
 * @example
 * // Use with calculateWorkingDays
 * const { holidayDateSet } = usePublicHolidays({ accessToken, employeeId })
 * const workingDays = calculateWorkingDays(startDate, endDate, holidayDateSet)
 */
export const usePublicHolidays = ({
  accessToken,
  employeeId,
  regionIds
}: UsePublicHolidaysProps): UsePublicHolidaysReturn => {
  const [holidays, setHolidays] = useState<HolidayEntry[]>([])
  const [holidayDateSet, setHolidayDateSet] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchHolidays = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      return
    }

    // Need either employeeId or regionIds
    if (!employeeId && (!regionIds || regionIds.length === 0)) {
      setError('Either employeeId or regionIds must be provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let targetRegionIds = regionIds

      // If employeeId provided, fetch their region first
      if (employeeId && !regionIds) {
        const activeLocale = getCurrentActiveUserLocale() || 'en-US'
        const employeeResponse = await graphqlClient.request<{
          employee: Array<{
            id: string
            workingCondition?: Array<{
              region?: {
                id: string
                value?: string
              }
            }>
          }>
        }>(GET_EMPLOYEE_REGION, {
          employeeId,
          activeUserLocale: activeLocale
        })

        const employee = employeeResponse.employee?.[0]
        if (!employee) {
          setError('Employee not found')
          setHolidays([])
          setHolidayDateSet(new Set())
          return
        }

        const regionId = employee.workingCondition?.[0]?.region?.id
        if (!regionId) {
          // No region assigned, return empty holidays
          setHolidays([])
          setHolidayDateSet(new Set())
          setIsLoading(false)
          return
        }

        targetRegionIds = [regionId]
      }

      // Fetch holidays for the region(s)
      const activeUserLocale = getCurrentActiveUserLocale() || 'en-US'
      const holidaysResponse = await graphqlClient.request<{
        holidays: HolidayEntry[]
      }>(GET_EMPLOYMENT_REGION_HOLIDAYS, {
        activeUserLocale,
        regionIds: targetRegionIds
      })

      const fetchedHolidays = holidaysResponse.holidays || []
      setHolidays(fetchedHolidays)

      // Convert to date set for use with calculateWorkingDays
      const dateSet = convertHolidaysToDateSet(fetchedHolidays)
      setHolidayDateSet(dateSet)
    } catch (err) {
      console.error('Error fetching public holidays:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch public holidays'
      setError(errorMessage)
      setHolidays([])
      setHolidayDateSet(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, employeeId, regionIds, graphqlClient])

  useEffect(() => {
    if (accessToken && (employeeId || (regionIds && regionIds.length > 0))) {
      fetchHolidays()
    }
  }, [accessToken, employeeId, regionIds, fetchHolidays])

  return {
    holidays,
    holidayDateSet,
    isLoading,
    error,
    refetch: fetchHolidays
  }
}
