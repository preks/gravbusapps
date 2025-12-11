import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface PerformanceGoal {
  id: string
  title: string
  startDate: string
  dueDate: string
  completionDate?: string
  progressPercent: number
  status: 'ON_TRACK' | 'BEHIND_TARGET' | 'AT_RISK' | 'ACHIEVED' | 'NOT_ACHIEVED'
  employeeId: string
}

export interface TeamMemberPerformance {
  employeeId: string
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
}

export interface TeamPerformanceResult {
  teamPerformance: TeamMemberPerformance[]
  averageTeamProgress: number
  totalGoals: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
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
export const useTeamPerformance = ({
  accessToken,
  managerId
}: UseTeamPerformanceProps): TeamPerformanceResult => {
  const [teamPerformance, setTeamPerformance] = useState<TeamMemberPerformance[]>([])
  const [averageTeamProgress, setAverageTeamProgress] = useState(0)
  const [totalGoals, setTotalGoals] = useState(0)
  const [goalsOnTrack, setGoalsOnTrack] = useState(0)
  const [goalsAtRisk, setGoalsAtRisk] = useState(0)
  const [goalsBehindTarget, setGoalsBehindTarget] = useState(0)
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
        setLoading(false)
        return
      }

      // Get employee IDs for the next query
      const employeeIds = employees.map((emp: any) => emp.id)

      // Step 2: Query EmployeePerformanceGoal directly for all team members
      const performanceGoalsQuery = `
        query GetTeamPerformanceGoals($employeeIds: [uuid!]!) {
          EmployeePerformanceGoal(
            where: {
              employeeId: { _in: $employeeIds },
              isDeleted: { _eq: false }
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
          }
        }
      `

      const goalsResponse = await graphQLClient.request(performanceGoalsQuery, { employeeIds })
      const allGoals: PerformanceGoal[] = goalsResponse?.EmployeePerformanceGoal || []

      // Step 3: Group goals by employee and calculate stats
      const goalsByEmployee = new Map<string, PerformanceGoal[]>()
      
      // Initialize map with empty arrays for all employees
      for (const empId of employeeIds) {
        goalsByEmployee.set(empId, [])
      }

      // Populate goals
      for (const goal of allGoals) {
        const empGoals = goalsByEmployee.get(goal.employeeId)
        if (empGoals) {
          empGoals.push(goal)
        }
      }

      // Calculate team-wide stats
      let allGoalsProgress = 0
      let allGoalsCount = 0
      let onTrackCount = 0
      let atRiskCount = 0
      let behindTargetCount = 0

      const teamData: TeamMemberPerformance[] = employees.map((emp: any) => {
        const goals = goalsByEmployee.get(emp.id) || []
        
        // Calculate stats for this employee
        const employeeGoalsOnTrack = goals.filter(g => g.status === 'ON_TRACK' || g.status === 'ACHIEVED').length
        const employeeGoalsAtRisk = goals.filter(g => g.status === 'AT_RISK').length
        const employeeGoalsBehindTarget = goals.filter(g => g.status === 'BEHIND_TARGET' || g.status === 'NOT_ACHIEVED').length
        
        // Calculate average progress for this employee
        const avgProgress = goals.length > 0
          ? Math.round(goals.reduce((sum, g) => sum + (g.progressPercent || 0), 0) / goals.length)
          : 0

        // Accumulate team totals
        allGoalsCount += goals.length
        allGoalsProgress += goals.reduce((sum, g) => sum + (g.progressPercent || 0), 0)
        onTrackCount += employeeGoalsOnTrack
        atRiskCount += employeeGoalsAtRisk
        behindTargetCount += employeeGoalsBehindTarget

        return {
          employeeId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobPositionName: emp.employeePosition?.[0]?.jobPosition?.name || '',
          goals,
          averageProgress: avgProgress,
          totalGoals: goals.length,
          goalsOnTrack: employeeGoalsOnTrack,
          goalsAtRisk: employeeGoalsAtRisk,
          goalsBehindTarget: employeeGoalsBehindTarget
        }
      })

      // Calculate team average
      const teamAvgProgress = allGoalsCount > 0
        ? Math.round(allGoalsProgress / allGoalsCount)
        : 0

      setTeamPerformance(teamData)
      setAverageTeamProgress(teamAvgProgress)
      setTotalGoals(allGoalsCount)
      setGoalsOnTrack(onTrackCount)
      setGoalsAtRisk(atRiskCount)
      setGoalsBehindTarget(behindTargetCount)
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
    loading,
    error,
    refetch: fetchTeamPerformance
  }
}
