import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import {
  GET_ACTIVITY_STATS,
  GET_EMPLOYEE_PERFORMANCE,
  GET_EMPLOYEE_ABSENCES,
  ROLLING_PERIOD_DAYS
} from '../queries/ViewSelectorQueries'
import { ActivityStats, EmployeePerformance, AbsenceInfo, EmployeeInfo } from '../types/ViewSelectorTypes'

// Enable quarter calculations
dayjs.extend(quarterOfYear)

// Auto-refresh interval in milliseconds (30 seconds for live updates)
const REFRESH_INTERVAL = 30000

// Working days ratio (approximately 5/7 days are working days)
const WORKING_DAYS_RATIO = 5 / 7

interface UseViewSelectorDataResult {
  stats: ActivityStats | null
  employeePerformance: EmployeePerformance[]
  topPerformers: EmployeePerformance[]
  underperformers: EmployeePerformance[]
  onLeave: EmployeePerformance[]
  loading: boolean
  insightsLoading: boolean
  lastUpdated: Date
}

export const useViewSelectorData = (accessToken: string): UseViewSelectorDataResult => {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [employeePerformance, setEmployeePerformance] = useState<EmployeePerformance[]>([])
  const [currentlyOnLeaveList, setCurrentlyOnLeaveList] = useState<EmployeePerformance[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch stats function with rolling periods
  const fetchStats = useCallback(async () => {
    const todayStart = dayjs().startOf('day').toISOString()
    const weekStart = dayjs().startOf('week').toISOString()
    const lastPeriodStart = dayjs().subtract(ROLLING_PERIOD_DAYS, 'day').startOf('day').toISOString()
    const prevPeriodStart = dayjs()
      .subtract(ROLLING_PERIOD_DAYS * 2, 'day')
      .startOf('day')
      .toISOString()
    const prevPeriodEnd = dayjs().subtract(ROLLING_PERIOD_DAYS, 'day').startOf('day').toISOString()
    const quarterStart = dayjs().startOf('quarter').toISOString()
    const lastQuarterStart = dayjs().subtract(1, 'quarter').startOf('quarter').toISOString()
    const lastQuarterEnd = dayjs().startOf('quarter').toISOString()

    try {
      const result: any = await graphqlClient.request(GET_ACTIVITY_STATS, {
        todayStart,
        weekStart,
        last30DaysStart: lastPeriodStart,
        prev30DaysStart: prevPeriodStart,
        prev30DaysEnd: prevPeriodEnd,
        quarterStart,
        lastQuarterStart,
        lastQuarterEnd
      })

      const lastPeriod = result.last30Days?.aggregate?.count || 0
      const prevPeriod = result.prev30Days?.aggregate?.count || 0
      const thisQuarter = result.thisQuarter?.aggregate?.count || 0
      const lastQuarter = result.lastQuarter?.aggregate?.count || 0

      // Calculate trends
      const rollingTrend = prevPeriod > 0 ? ((lastPeriod - prevPeriod) / prevPeriod) * 100 : 0
      const quarterTrend = lastQuarter > 0 ? ((thisQuarter - lastQuarter) / lastQuarter) * 100 : 0

      setStats({
        total: result.totalActivities?.aggregate?.count || 0,
        today: result.today?.aggregate?.count || 0,
        thisWeek: result.thisWeek?.aggregate?.count || 0,
        last30Days: lastPeriod,
        prev30Days: prevPeriod,
        thisQuarter,
        lastQuarter,
        byAccount: result.accountActivities?.aggregate?.count || 0,
        byContact: result.contactActivities?.aggregate?.count || 0,
        byLead: result.leadActivities?.aggregate?.count || 0,
        byOpportunity: result.opportunityActivities?.aggregate?.count || 0,
        activeEmployees: result.activeEmployees?.length || 0,
        rollingTrend: Math.round(rollingTrend),
        quarterTrend: Math.round(quarterTrend)
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load activity stats:', err)
      setStats({
        total: 0,
        today: 0,
        thisWeek: 0,
        last30Days: 0,
        prev30Days: 0,
        thisQuarter: 0,
        lastQuarter: 0,
        byAccount: 0,
        byContact: 0,
        byLead: 0,
        byOpportunity: 0,
        activeEmployees: 0,
        rollingTrend: 0,
        quarterTrend: 0
      })
    } finally {
      setLoading(false)
    }
  }, [graphqlClient])

  // Fetch employee performance with absences
  const fetchEmployeePerformance = useCallback(async () => {
    const today = dayjs()
    const lastPeriodStart = today.subtract(ROLLING_PERIOD_DAYS, 'day').startOf('day').toISOString()
    const prevPeriodStart = today
      .subtract(ROLLING_PERIOD_DAYS * 2, 'day')
      .startOf('day')
      .toISOString()
    const prevPeriodEnd = today.subtract(ROLLING_PERIOD_DAYS, 'day').startOf('day').toISOString()

    // For absence query - use timestamp format (without timezone suffix)
    const periodStart = today
      .subtract(ROLLING_PERIOD_DAYS * 2, 'day')
      .startOf('day')
      .format('YYYY-MM-DD HH:mm:ss')
    const periodEnd = today.endOf('day').format('YYYY-MM-DD HH:mm:ss')
    const todayStart = today.startOf('day').format('YYYY-MM-DD HH:mm:ss')
    const todayEnd = today.endOf('day').format('YYYY-MM-DD HH:mm:ss')

    try {
      // Fetch both activity performance and absences in parallel
      const [perfResult, absenceResult]: any[] = await Promise.all([
        graphqlClient.request(GET_EMPLOYEE_PERFORMANCE, {
          last30DaysStart: lastPeriodStart,
          prev30DaysStart: prevPeriodStart,
          prev30DaysEnd: prevPeriodEnd
        }),
        graphqlClient.request(GET_EMPLOYEE_ABSENCES, {
          periodStart,
          periodEnd,
          todayStart,
          todayEnd
        })
      ])

      // Build set of employees currently on leave (from the dedicated query)
      const onLeaveEmployeeIds = new Set<string>()
      const onLeaveEmployees: EmployeePerformance[] = []
      // Map to store on-leave absence details for each employee
      const onLeaveAbsenceDetails = new Map<
        string,
        {
          absenceType: string
          startDate: string
          endDate: string
          effectiveDays: number
        }
      >()

      absenceResult.currentlyOnLeave?.forEach((absence: any) => {
        const empId = absence.employeeId || absence.employee?.id
        if (empId && absence.employee) {
          onLeaveEmployeeIds.add(empId)

          // Store absence details for use when building employee map
          onLeaveAbsenceDetails.set(empId, {
            absenceType: absence.type?.value || absence.type?.objectValue || 'Leave',
            startDate: absence.startDate,
            endDate: absence.endDate,
            effectiveDays: absence.effectiveDays || 0
          })

          // Create employee performance entry for on-leave employees
          const existingIndex = onLeaveEmployees.findIndex(e => e.employee.id === empId)
          if (existingIndex === -1) {
            onLeaveEmployees.push({
              employee: absence.employee as EmployeeInfo,
              activitiesLast30Days: 0,
              activitiesPrev30Days: 0,
              trend: 'stable',
              trendPercent: 0,
              avgPerWorkingDay: 0,
              absence: {
                totalDays: absence.effectiveDays || 0,
                isCurrentlyOnLeave: true,
                absenceType: absence.type?.value || absence.type?.objectValue || 'Leave',
                startDate: absence.startDate,
                endDate: absence.endDate
              }
            })
          }
        }
      })

      setCurrentlyOnLeaveList(onLeaveEmployees)

      // Build absence map for period totals: employeeId -> total absence days
      const absenceMap = new Map<string, AbsenceInfo>()

      absenceResult.periodAbsences?.forEach((absence: any) => {
        const empId = absence.employeeId || absence.employee?.id
        if (empId) {
          const existing = absenceMap.get(empId) || {
            totalDays: 0,
            isCurrentlyOnLeave: onLeaveEmployeeIds.has(empId),
            absenceType: undefined
          }
          existing.totalDays += absence.effectiveDays || 0

          // Set absence type if currently on leave
          if (onLeaveEmployeeIds.has(empId)) {
            existing.absenceType = absence.type?.value || absence.type?.objectValue || 'Leave'
          }

          absenceMap.set(empId, existing)
        }
      })

      // Build employee map with last activity tracking
      const employeeMap = new Map<string, EmployeePerformance>()
      const lastActivityMap = new Map<string, string>() // employeeId -> last activity date

      perfResult.allActiveEmployees?.forEach((item: any) => {
        if (item.ownerEmployeeId && item.ownerEmployee) {
          const absence = absenceMap.get(item.ownerEmployeeId)
          const isOnLeave = onLeaveEmployeeIds.has(item.ownerEmployeeId)

          // Track last activity date (from the distinct query ordered by createdAt DESC)
          if (item.createdAt) {
            lastActivityMap.set(item.ownerEmployeeId, item.createdAt)
          }

          // Build absence info - ensure isCurrentlyOnLeave is always set correctly
          // Also include current leave details (type, dates) if available
          let absenceInfo: AbsenceInfo | undefined = undefined
          const onLeaveDetails = onLeaveAbsenceDetails.get(item.ownerEmployeeId)

          if (absence) {
            absenceInfo = {
              ...absence,
              isCurrentlyOnLeave: isOnLeave || absence.isCurrentlyOnLeave,
              // Add current leave details if on leave
              ...(isOnLeave && onLeaveDetails
                ? {
                    absenceType: onLeaveDetails.absenceType,
                    startDate: onLeaveDetails.startDate,
                    endDate: onLeaveDetails.endDate
                  }
                : {})
            }
          } else if (isOnLeave && onLeaveDetails) {
            absenceInfo = {
              totalDays: onLeaveDetails.effectiveDays,
              isCurrentlyOnLeave: true,
              absenceType: onLeaveDetails.absenceType,
              startDate: onLeaveDetails.startDate,
              endDate: onLeaveDetails.endDate
            }
          } else if (isOnLeave) {
            absenceInfo = { totalDays: 0, isCurrentlyOnLeave: true }
          }

          employeeMap.set(item.ownerEmployeeId, {
            employee: item.ownerEmployee,
            activitiesLast30Days: 0,
            activitiesPrev30Days: 0,
            trend: 'stable',
            trendPercent: 0,
            avgPerWorkingDay: 0,
            absence: absenceInfo,
            isInactive: false,
            daysSinceLastActivity: undefined,
            attentionReason: undefined
          })
        }
      })

      // Count activities
      perfResult.activitiesLast30Days?.forEach((item: any) => {
        const emp = employeeMap.get(item.ownerEmployeeId)
        if (emp) emp.activitiesLast30Days++
      })

      perfResult.activitiesPrev30Days?.forEach((item: any) => {
        const emp = employeeMap.get(item.ownerEmployeeId)
        if (emp) emp.activitiesPrev30Days++
      })

      // Calculate trends with absence-adjusted metrics
      employeeMap.forEach((emp, employeeId) => {
        // Calculate working days based on period length
        const totalWorkingDays = Math.round(ROLLING_PERIOD_DAYS * WORKING_DAYS_RATIO)
        const absenceDays = emp.absence?.totalDays || 0
        const actualWorkingDays = Math.max(1, totalWorkingDays - absenceDays)

        // Calculate average per working day for fair comparison
        emp.avgPerWorkingDay = emp.activitiesLast30Days / actualWorkingDays

        // Calculate days since last activity
        const lastActivityDate = lastActivityMap.get(employeeId)
        if (lastActivityDate) {
          emp.daysSinceLastActivity = today.diff(dayjs(lastActivityDate), 'day')
        }

        // Check if employee is inactive (zero activities in recent period but was active before)
        const wasActiveBefore = emp.activitiesPrev30Days > 0
        const isInactiveNow = emp.activitiesLast30Days === 0
        const isOnLeave = emp.absence?.isCurrentlyOnLeave

        if (isInactiveNow && wasActiveBefore && !isOnLeave) {
          emp.isInactive = true
          emp.attentionReason = 'inactive'
          emp.trend = 'down'
          emp.trendPercent = -100 // Complete drop
        } else if (isInactiveNow && wasActiveBefore && isOnLeave) {
          // On leave, don't flag as inactive
          emp.isInactive = false
          emp.trend = 'stable'
          emp.trendPercent = 0
        }

        // Calculate trend for active employees
        if (!emp.isInactive) {
          if (emp.activitiesPrev30Days === 0) {
            emp.trend = emp.activitiesLast30Days > 0 ? 'up' : 'stable'
            emp.trendPercent = emp.activitiesLast30Days > 0 ? 100 : 0
          } else {
            // Adjust for absences - if someone had many absence days, be more lenient
            const adjustmentFactor = absenceDays > 3 ? 0.7 : 1 // Reduce expected performance if absences
            const expectedActivities = emp.activitiesPrev30Days * adjustmentFactor
            const change = ((emp.activitiesLast30Days - expectedActivities) / expectedActivities) * 100
            emp.trendPercent = Math.round(change)

            if (change > 15) {
              emp.trend = 'up'
            } else if (change < -25 && absenceDays < 3) {
              emp.trend = 'down' // Only flag as down if not on significant leave
              emp.attentionReason = 'declining'
            } else {
              emp.trend = 'stable'
            }
          }
        }
      })

      setEmployeePerformance(Array.from(employeeMap.values()))
    } catch (err) {
      console.error('Failed to load employee performance:', err)
      setEmployeePerformance([])
      setCurrentlyOnLeaveList([])
    } finally {
      setInsightsLoading(false)
    }
  }, [graphqlClient])

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchStats()
    fetchEmployeePerformance()

    const interval = setInterval(() => {
      fetchStats()
      fetchEmployeePerformance()
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchStats, fetchEmployeePerformance])

  // Computed lists
  const { topPerformers, underperformers, onLeave } = useMemo(() => {
    const minActivities = Math.max(2, Math.round(ROLLING_PERIOD_DAYS / 7)) // Scale threshold with period

    const top = employeePerformance
      .filter(e => e.trend === 'up' && e.trendPercent >= 15 && e.activitiesLast30Days >= minActivities)
      .sort((a, b) => b.trendPercent - a.trendPercent)
      .slice(0, 5)

    // "Needs Attention" includes:
    // 1. Declining employees (25%+ drop, not on leave)
    // 2. Inactive employees (zero activities this period, but were active before, not on leave)
    const under = employeePerformance
      .filter(e => {
        const notOnLeave = !e.absence?.isCurrentlyOnLeave
        const wasActiveBefore = e.activitiesPrev30Days >= 2 // Had at least 2 activities before

        // Inactive: zero activities now but was active before
        if (e.isInactive && wasActiveBefore && notOnLeave) {
          return true
        }

        // Declining: significant drop in activity
        if (e.trend === 'down' && e.trendPercent <= -25 && wasActiveBefore && notOnLeave) {
          return true
        }

        return false
      })
      .sort((a, b) => {
        // Sort inactive first (they're more urgent), then by trend percent
        if (a.isInactive && !b.isInactive) return -1
        if (!a.isInactive && b.isInactive) return 1
        return a.trendPercent - b.trendPercent
      })
      .slice(0, 5)

    // Use the dedicated on-leave list from the absence query
    // This ensures we show ALL employees currently on leave, not just those who had activities
    const leave =
      currentlyOnLeaveList.length > 0
        ? currentlyOnLeaveList
        : employeePerformance.filter(e => e.absence?.isCurrentlyOnLeave).slice(0, 5)

    return { topPerformers: top, underperformers: under, onLeave: leave }
  }, [employeePerformance, currentlyOnLeaveList])

  return {
    stats,
    employeePerformance,
    topPerformers,
    underperformers,
    onLeave,
    loading,
    insightsLoading,
    lastUpdated
  }
}

export default useViewSelectorData
