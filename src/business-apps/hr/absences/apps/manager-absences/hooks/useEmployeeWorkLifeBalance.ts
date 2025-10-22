import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_WORK_LIFE_BALANCE } from '../queries/StatisticsQueries'
import dayjs from 'dayjs'

interface EmployeeWorkLifeBalance {
  id: string
  name: string
  initials: string
  status: 'excellent' | 'good' | 'needs-attention'
  avgStreak: number
  longestStreak: number
  avgBreak: number
  organizationalUnit: string
  pictureThumbnail?: string
}

interface UseEmployeeWorkLifeBalanceReturn {
  employees: EmployeeWorkLifeBalance[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useEmployeeWorkLifeBalance = (context: BusinessAppContextProps): UseEmployeeWorkLifeBalanceReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId

  const [employees, setEmployees] = useState<EmployeeWorkLifeBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateWorkLifeBalance = useCallback((employeeAbsences: any[]) => {
    if (!employeeAbsences || employeeAbsences.length === 0) {
      return {
        avgStreak: 0,
        longestStreak: 0,
        avgBreak: 0,
        status: 'excellent' as const
      }
    }

    // Sort absences chronologically
    const sortedAbsences = employeeAbsences.sort((a: any, b: any) => dayjs(a.startDate).diff(dayjs(b.startDate)))

    const yearStart = dayjs().startOf('year')
    const currentDate = dayjs()

    let currentStreak = 0
    let longestStreak = 0
    let lastAbsenceEnd = yearStart
    let totalWorkDays = 0
    let workPeriods = 0

    // Calculate work streaks
    sortedAbsences.forEach((absence: any) => {
      const absenceStart = dayjs(absence.startDate)
      const absenceEnd = dayjs(absence.endDate)

      // Calculate work days between last absence end and this absence start
      if (absenceStart.isAfter(lastAbsenceEnd)) {
        const workDays = absenceStart.diff(lastAbsenceEnd, 'day')
        currentStreak += workDays
        totalWorkDays += workDays
        workPeriods++

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak
        }
      }

      // Update last absence end
      if (absenceEnd.isAfter(lastAbsenceEnd)) {
        lastAbsenceEnd = absenceEnd
      }
    })

    // Add work days from last absence to current date
    if (currentDate.isAfter(lastAbsenceEnd)) {
      const finalWorkDays = currentDate.diff(lastAbsenceEnd, 'day')
      currentStreak += finalWorkDays
      totalWorkDays += finalWorkDays
      workPeriods++

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }
    }

    // Calculate average streak
    const avgStreak = workPeriods > 0 ? Math.round(totalWorkDays / workPeriods) : 0

    // Calculate average break (average absence duration)
    const totalAbsenceDays = sortedAbsences.reduce((sum: number, absence: any) => {
      const start = dayjs(absence.startDate)
      const end = dayjs(absence.endDate)
      return sum + end.diff(start, 'day') + 1 // +1 to include both start and end day
    }, 0)

    const avgBreak = sortedAbsences.length > 0 ? Math.round((totalAbsenceDays / sortedAbsences.length) * 10) / 10 : 0

    // Determine status based on metrics
    let status: 'excellent' | 'good' | 'needs-attention' = 'good'
    if (avgStreak >= 20 && longestStreak >= 40 && avgBreak <= 3) {
      status = 'excellent'
    } else if (avgStreak < 10 || longestStreak < 20 || avgBreak > 5) {
      status = 'needs-attention'
    }

    return {
      avgStreak,
      longestStreak,
      avgBreak,
      status
    }
  }, [])

  const fetchWorkLifeBalanceData = useCallback(async () => {
    if (!supervisorId || !graphqlClient) {
      setError('Supervisor ID or GraphQL client not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get current year date range
      const currentYear = new Date().getFullYear()
      const currentYearStart = `${currentYear}-01-01 00:00:00+00`
      const currentYearEnd = `${currentYear}-12-31 23:59:59+00`

      const result = await graphqlClient.request(GET_EMPLOYEE_WORK_LIFE_BALANCE, {
        supervisorId,
        currentYearStart,
        currentYearEnd
      })

      if (!result) {
        throw new Error('No response from GraphQL query')
      }

      const employeesData = result.employees || []
      const absencesData = result.absences || []

      // Group absences by employee
      const absencesByEmployee: { [key: string]: any[] } = {}
      absencesData.forEach((absence: any) => {
        const employeeId = absence.employee.id
        if (!absencesByEmployee[employeeId]) {
          absencesByEmployee[employeeId] = []
        }
        absencesByEmployee[employeeId].push(absence)
      })

      // Calculate work-life balance for each employee
      const workLifeBalanceEmployees: EmployeeWorkLifeBalance[] = employeesData.map((employee: any) => {
        const employeeAbsences = absencesByEmployee[employee.id] || []
        const balance = calculateWorkLifeBalance(employeeAbsences)

        return {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          initials: `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase(),
          organizationalUnit: employee.employeePosition?.organizationalUnit?.name || 'Unknown',
          pictureThumbnail: employee.pictureThumbnail,
          ...balance
        }
      })

      setEmployees(workLifeBalanceEmployees)
    } catch (err) {
      console.error('Error fetching work-life balance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch work-life balance data')
    } finally {
      setIsLoading(false)
    }
  }, [supervisorId, graphqlClient, calculateWorkLifeBalance])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchWorkLifeBalanceData()
    }
  }, [accessToken, supervisorId, fetchWorkLifeBalanceData])

  return {
    employees,
    isLoading,
    error,
    refetch: fetchWorkLifeBalanceData
  }
}
