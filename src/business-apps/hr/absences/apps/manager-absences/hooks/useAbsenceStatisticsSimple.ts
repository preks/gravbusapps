import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { executeStatisticsRequests, executeSickAbsencesByMonthRequest } from '../utils/graphqlRequests'
import { processStatisticsData } from '../utils/statisticsProcessor'

interface AbsenceStatistics {
  pendingRequests: number
  approvedAbsences: number
  teamMembersAway: number
  upcomingAbsences: number
  vacationCount: number
  sickLeaveCount: number
  averageDaysPerRequest: string
  approvalRate: number
  averageWorkStreak: string
  sickAbsencesByMonth: {
    month: string
    monthNumber: number | null
    count: number
  }

  plannedAbsences: number
  plannedAbsencesDays: number
  unplannedAbsences: number
  unplannedAbsencesDays: number
  absences: any[]
  yearOverYearData: any[]
}

interface UseAbsenceStatisticsSimpleReturn {
  statistics: AbsenceStatistics
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useAbsenceStatisticsSimple = (context: BusinessAppContextProps): UseAbsenceStatisticsSimpleReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId

  const [statistics, setStatistics] = useState<AbsenceStatistics>({
    pendingRequests: 0,
    approvedAbsences: 0,
    teamMembersAway: 0,
    upcomingAbsences: 0,
    vacationCount: 0,
    sickLeaveCount: 0,
    averageDaysPerRequest: '0.0',
    approvalRate: 0,
    averageWorkStreak: '0.0',
    sickAbsencesByMonth: {
      month: 'None',
      monthNumber: null,
      count: 0
    },
    plannedAbsences: 0,
    plannedAbsencesDays: 0,
    unplannedAbsences: 0,
    unplannedAbsencesDays: 0,
    absences: [],
    yearOverYearData: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchStatistics = useCallback(async () => {
    if (!supervisorId) {
      setError('Supervisor ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const currentYear = new Date().getFullYear()
      const previousYear = currentYear - 1
      const currentYearStart = `${currentYear}-01-01 00:00:00+00`
      const currentYearEnd = `${currentYear}-12-31 23:59:59+00`
      const previousYearStart = `${previousYear}-01-01 00:00:00+00`

      const [apiResults, sickAbsencesByMonthResult] = await Promise.all([
        executeStatisticsRequests(graphqlClient, supervisorId, currentYearStart, currentYearEnd, previousYearStart),
        executeSickAbsencesByMonthRequest(graphqlClient, supervisorId, currentYearStart, currentYearEnd)
      ])

      const finalStatistics = processStatisticsData(
        { ...apiResults, sickAbsencesByMonthResult },
        currentYear,
        previousYear
      )

      setStatistics(finalStatistics as AbsenceStatistics)
    } catch (err) {
      console.error('Error fetching absence statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
    } finally {
      setIsLoading(false)
    }
  }, [supervisorId, accessToken, graphqlClient])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchStatistics()
    }
  }, [accessToken, supervisorId, fetchStatistics])

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  }
}
