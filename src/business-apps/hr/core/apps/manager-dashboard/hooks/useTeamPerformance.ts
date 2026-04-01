import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { computeContainedGoalRollup } from '../utils/managerPerformanceGoalMetrics'

export interface PerformanceGoal {
  id: string
  title: string
  startDate: string
  dueDate: string
  completionDate?: string
  progressPercent: number
  status: 'ON_TRACK' | 'BEHIND_TARGET' | 'AT_RISK' | 'ACHIEVED' | 'NOT_ACHIEVED'
  employeeId: string
  /** Timeline-based track state (aligned with employee-record Performance / Goals KPIs) */
  trackState?: 'ON_TRACK' | 'BEHIND_TARGET'
}

export interface TeamMemberPerformance {
  employeeId: string
  userId?: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobPositionName?: string
  goals: PerformanceGoal[]
  averageProgress: number
  totalGoals: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  goalsAchieved: number
}

export interface TeamPerformanceResult {
  teamPerformance: TeamMemberPerformance[]
  averageTeamProgress: number
  totalGoals: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  goalsAchieved: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseTeamPerformanceProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch team performance data
 * Gets all performance goals for direct reports and calculates team averages
 */
export const useTeamPerformance = ({ accessToken, managerId }: UseTeamPerformanceProps): TeamPerformanceResult => {
  const [teamPerformance, setTeamPerformance] = useState<TeamMemberPerformance[]>([])
  const [averageTeamProgress, setAverageTeamProgress] = useState(0)
  const [totalGoals, setTotalGoals] = useState(0)
  const [goalsOnTrack, setGoalsOnTrack] = useState(0)
  const [goalsAtRisk, setGoalsAtRisk] = useState(0)
  const [goalsBehindTarget, setGoalsBehindTarget] = useState(0)
  const [goalsAchieved, setGoalsAchieved] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTeamPerformance = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Get all direct reports with their basic info
      const directReportsQuery = `
        query GetDirectReports($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
          ) {
            id
            userId
            firstName
            lastName
            pictureThumbnail
            employeePosition {
              jobPosition {
                name
              }
            }
          }
        }
      `

      const directReportsResponse = await graphQLClient.request(directReportsQuery, { managerId })
      const employees = directReportsResponse?.Employee || []

      if (employees.length === 0) {
        setTeamPerformance([])
        setAverageTeamProgress(0)
        setTotalGoals(0)
        setGoalsOnTrack(0)
        setGoalsAtRisk(0)
        setGoalsBehindTarget(0)
        setGoalsAchieved(0)
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: any) => emp.id)

      const today = new Date().toISOString()
      const currentCycleQuery = `
        query GetCurrentPerformanceCycle($today: timestamp!) {
          PerformanceCycle(
            where: {
              isDeleted: { _eq: false },
              evaluationPeriodStartDate: { _lte: $today },
              evaluationPeriodEndDate: { _gte: $today }
            },
            limit: 1,
            orderBy: { evaluationPeriodStartDate: DESC }
          ) {
            id
            name
            startDate
            endDate
            evaluationPeriodStartDate
            evaluationPeriodEndDate
          }
        }
      `

      const cycleResponse = await graphQLClient.request(currentCycleQuery, { today })
      let currentCycle = cycleResponse?.PerformanceCycle?.[0]
      let currentCycleId: string | null = currentCycle?.id ?? null

      if (!currentCycleId) {
        const activeCycleQuery = `
          query GetActivePerformanceCycleForGoals {
            PerformanceCycle(
              where: {
                isDeleted: { _eq: false },
                status: { _eq: "ACTIVE_PERFORMANCE_CYCLE_STATUS" }
              },
              limit: 1,
              orderBy: { evaluationPeriodStartDate: DESC }
            ) {
              id
              name
              startDate
              endDate
              evaluationPeriodStartDate
              evaluationPeriodEndDate
            }
          }
        `
        const activeResponse = await graphQLClient.request(activeCycleQuery)
        currentCycle = activeResponse?.PerformanceCycle?.[0]
        currentCycleId = currentCycle?.id ?? null
      }

      if (!currentCycleId) {
        setTeamPerformance(
          employees.map((emp: any) => ({
            employeeId: emp.id,
            userId: emp.userId || emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            pictureThumbnail: emp.pictureThumbnail,
            jobPositionName: emp.employeePosition?.[0]?.jobPosition?.name || '',
            goals: [],
            averageProgress: 0,
            totalGoals: 0,
            goalsOnTrack: 0,
            goalsAtRisk: 0,
            goalsBehindTarget: 0,
            goalsAchieved: 0
          }))
        )
        setAverageTeamProgress(0)
        setTotalGoals(0)
        setGoalsOnTrack(0)
        setGoalsAtRisk(0)
        setGoalsBehindTarget(0)
        setGoalsAchieved(0)
        setLoading(false)
        return
      }

      const performanceGoalsQuery = `
        query GetTeamPerformanceGoals($employeeIds: [uuid!]!, $cycleId: uuid!) {
          EmployeePerformanceGoal(
            where: {
              employeeId: { _in: $employeeIds },
              isDeleted: { _eq: false },
              performanceCycleId: { _eq: $cycleId }
            },
            orderBy: { progressPercent: DESC }
          ) {
            id
            title
            startDate
            dueDate
            completionDate
            progressPercent
            status
            employeeId
            performanceCycleId
            updatedAt
            employeePerformanceGoalUpdate(orderBy: { updateTime: ASC }) {
              id
              progressPercent
              comment
              updateTime
              employee {
                firstName
                lastName
              }
            }
          }
        }
      `

      const goalsResponse = await graphQLClient.request(performanceGoalsQuery, {
        employeeIds,
        cycleId: currentCycleId
      })
      const allGoals = goalsResponse?.EmployeePerformanceGoal || []

      const cycleStart = currentCycle?.startDate || currentCycle?.evaluationPeriodStartDate || ''
      const cycleEnd = currentCycle?.endDate || currentCycle?.evaluationPeriodEndDate || ''

      // Step 3: Group raw goals by employee, then apply same containment + track rules as employee-record
      const goalsByEmployee = new Map<string, typeof allGoals>()

      for (const empId of employeeIds) {
        goalsByEmployee.set(empId, [])
      }

      for (const goal of allGoals) {
        const empGoals = goalsByEmployee.get(goal.employeeId)
        if (empGoals) {
          empGoals.push(goal)
        }
      }

      let allGoalsProgress = 0
      let allGoalsCount = 0
      let onTrackCount = 0
      let atRiskCount = 0
      let behindTargetCount = 0
      let achievedCount = 0

      const teamData: TeamMemberPerformance[] = employees.map((emp: any) => {
        const rawGoals = goalsByEmployee.get(emp.id) || []
        const rollup =
          cycleStart && cycleEnd
            ? computeContainedGoalRollup(rawGoals, cycleStart, cycleEnd)
            : {
                goals: [] as PerformanceGoal[],
                totalGoals: 0,
                goalsOnTrack: 0,
                goalsAtRisk: 0,
                goalsBehindTarget: 0,
                goalsAchieved: 0,
                averageProgress: 0
              }

        allGoalsCount += rollup.totalGoals
        allGoalsProgress += rollup.totalGoals > 0 ? rollup.averageProgress * rollup.totalGoals : 0
        onTrackCount += rollup.goalsOnTrack
        atRiskCount += rollup.goalsAtRisk
        behindTargetCount += rollup.goalsBehindTarget
        achievedCount += rollup.goalsAchieved

        return {
          employeeId: emp.id,
          userId: emp.userId || emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobPositionName: emp.employeePosition?.[0]?.jobPosition?.name || '',
          goals: rollup.goals,
          averageProgress: rollup.averageProgress,
          totalGoals: rollup.totalGoals,
          goalsOnTrack: rollup.goalsOnTrack,
          goalsAtRisk: rollup.goalsAtRisk,
          goalsBehindTarget: rollup.goalsBehindTarget,
          goalsAchieved: rollup.goalsAchieved
        }
      })

      // Calculate team average
      const teamAvgProgress = allGoalsCount > 0 ? Math.round(allGoalsProgress / allGoalsCount) : 0

      setTeamPerformance(teamData)
      setAverageTeamProgress(teamAvgProgress)
      setTotalGoals(allGoalsCount)
      setGoalsOnTrack(onTrackCount)
      setGoalsAtRisk(atRiskCount)
      setGoalsBehindTarget(behindTargetCount)
      setGoalsAchieved(achievedCount)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team performance'))
      console.error('Error fetching team performance:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient])

  useEffect(() => {
    fetchTeamPerformance()
  }, [fetchTeamPerformance])

  return {
    teamPerformance,
    averageTeamProgress,
    totalGoals,
    goalsOnTrack,
    goalsAtRisk,
    goalsBehindTarget,
    goalsAchieved,
    loading,
    error,
    refetch: () => {
      fetchTeamPerformance()
    }
  }
}
