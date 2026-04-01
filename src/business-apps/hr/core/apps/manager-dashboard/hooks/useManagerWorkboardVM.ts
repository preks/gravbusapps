import { useState, useMemo, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useDirectReports } from './useDirectReports'
import { useMatrixTeams } from './useMatrixTeams'
import { useTeamBirthdays } from './useTeamBirthdays'
import { useTeamAnniversaries } from './useTeamAnniversaries'
import { useOpenJobPositions, JobPosition } from './useOpenJobPositions'
import { useCurrentUserProfile } from './useCurrentUserProfile'
import { useCurrentUserOrgData } from './useCurrentUserOrgData'
import { useTeamAvailability } from './useTeamAvailability'
import { useTeamProjectAllocation } from './useTeamProjectAllocation'
import { useTeamPerformance, TeamMemberPerformance, PerformanceGoal } from './useTeamPerformance'
import { useTeamAttendance } from './useTeamAttendance'
import { useManagerFeedback } from './useManagerFeedback'
import { useAIInsights } from './useAIInsights'
import { useFlightRiskPrediction } from './useFlightRiskPrediction'
import { useTeamSkills } from './useTeamSkills'
import { useTeamFeedbackOverview } from './useTeamFeedbackOverview'
import { useTeamEvaluations } from './useTeamEvaluations'
import { useTeamPerformanceInsights } from './useTeamPerformanceInsights'
import { usePerformanceCycles } from '../../performance-evaluation/hooks/usePerformanceCycles'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  computeScoreDistribution,
  computeTrendSeries,
  generateAlerts,
  detectEmployeeSignals,
  detectTeamSignals,
  detectTalentSignals,
  computeTeamDimensionAverages,
  computeAlignmentGaps
} from '../utils/dashboardComputations'
import { computeContainedGoalRollup } from '../utils/managerPerformanceGoalMetrics'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

type TeamTab = 'my-team' | 'my-teams'
type InsightsTab = 'birthdays' | 'anniversaries' | 'open-positions'
type CurrentView =
  | 'dashboard'
  | 'teammates'
  | 'filtered-teammates'
  | 'insights'
  | 'birthdays'
  | 'anniversaries'
  | 'open-positions'
  | 'team-performance'
  | 'team-performance-overview'
  | 'not-clocked-in'
type GoalStatusFilter = 'ALL' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND_TARGET' | 'ACHIEVED'

const getAiInsightType = (index: number): 'warning' | 'success' | 'info' => {
  if (index === 0) {
    return 'warning'
  }
  if (index === 1) {
    return 'success'
  }
  return 'info'
}

interface UseManagerWorkboardVMProps {
  employeeId?: string
  accessToken?: string
}

export const useManagerWorkboardVM = ({ employeeId, accessToken }: UseManagerWorkboardVMProps) => {
  // View state
  const [activeTeamTab, setActiveTeamTab] = useState<TeamTab>('my-team')
  const [activeInsightsTab, setActiveInsightsTab] = useState<InsightsTab>('birthdays')
  const [currentView, setCurrentView] = useState<CurrentView>('dashboard')
  const [filterAbsentOnly, setFilterAbsentOnly] = useState(false)
  const [filterUnallocatedOnly, setFilterUnallocatedOnly] = useState(false)
  const [filterGoalsBehindOnly, setFilterGoalsBehindOnly] = useState(false)
  const [initialPerformanceStatusFilter, setInitialPerformanceStatusFilter] = useState<GoalStatusFilter>('ALL')
  const [selectedPosition] = useState<JobPosition | null>(null)
  const [isPositionSheetOpen, setIsPositionSheetOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [isMemberPanelOpen, setIsMemberPanelOpen] = useState(false)
  const [enableAISentiment, setEnableAISentiment] = useState(false)
  const [unallocatedMonthlyCost, setUnallocatedMonthlyCost] = useState<number>(0)

  const graphQLClient = useGraphqlClient(accessToken || '')
  const structureId = getCurrentActiveStructureId()

  // Navigation handlers
  const handleNavigateToTeammates = () => {
    setFilterAbsentOnly(false)
    setFilterUnallocatedOnly(false)
    setCurrentView('teammates')
  }

  const handleNavigateToAbsentTeammates = () => {
    setFilterAbsentOnly(true)
    setFilterUnallocatedOnly(false)
    setCurrentView('filtered-teammates')
  }

  const handleNavigateToUnallocatedTeammates = () => {
    setFilterAbsentOnly(false)
    setFilterUnallocatedOnly(true)
    setCurrentView('filtered-teammates')
  }

  const handleNavigateToTeamPerformance = () => {
    setCurrentView('team-performance')
    setFilterGoalsBehindOnly(false)
    setInitialPerformanceStatusFilter('ALL')
  }

  const handleNavigateToGoalsBehind = () => {
    setCurrentView('team-performance')
    setFilterGoalsBehindOnly(true)
    setInitialPerformanceStatusFilter('BEHIND_TARGET')
  }

  const handleNavigateToGoalsAtRisk = () => {
    setCurrentView('team-performance')
    setFilterGoalsBehindOnly(false)
    setInitialPerformanceStatusFilter('AT_RISK')
  }

  const handleNavigateToTeamPerformanceOverview = () => {
    setCurrentView('team-performance-overview')
  }

  const handleNavigateToNotClockedIn = () => {
    setCurrentView('not-clocked-in')
  }

  const handleNavigateToBirthdays = () => {
    setCurrentView('birthdays')
  }

  const handleNavigateToAnniversaries = () => {
    setCurrentView('anniversaries')
  }

  const handleNavigateToOpenPositions = () => {
    setCurrentView('open-positions')
  }

  const handleNavigateToInsights = (tab?: InsightsTab) => {
    if (tab === 'birthdays') {
      setCurrentView('birthdays')
      return
    }
    if (tab === 'anniversaries') {
      setCurrentView('anniversaries')
      return
    }
    if (tab === 'open-positions') {
      setCurrentView('open-positions')
      return
    }
    if (tab) {
      setActiveInsightsTab(tab)
    }
    setCurrentView('insights')
  }

  const handleNavigateBackToDashboard = () => {
    setFilterAbsentOnly(false)
    setFilterUnallocatedOnly(false)
    setFilterGoalsBehindOnly(false)
    setInitialPerformanceStatusFilter('ALL')
    setCurrentView('dashboard')
  }

  const handleNavigateToEmployee = (employeeId: string) => {
    const profileUrl = buildPlatformUrl('/platform/employee-record', {
      employeeId,
      tab: 'summary'
    })
    navigateTo(profileUrl)
  }

  const handleOpenMemberPanel = (memberId: string) => {
    setSelectedMemberId(memberId)
    setIsMemberPanelOpen(true)
  }

  const handleCloseMemberPanel = () => {
    setIsMemberPanelOpen(false)
    setSelectedMemberId(null)
  }

  // Data fetching hooks
  const {
    directReports,
    loading: loadingDirectReports,
    error: directReportsError,
    refetch: refetchDirectReports
  } = useDirectReports({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const {
    matrixTeamMembers,
    loading: loadingMatrixTeams,
    error: matrixTeamsError,
    refetch: refetchMatrixTeams
  } = useMatrixTeams({
    accessToken: accessToken || '',
    employeeId: employeeId || '',
    structureId: structureId || undefined
  })

  const { upcomingBirthdays, loading: loadingBirthdays } = useTeamBirthdays({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const { upcomingAnniversaries, loading: loadingAnniversaries } = useTeamAnniversaries({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const {
    openPositions,
    fullPositions,
    loading: loadingOpenPositions
  } = useOpenJobPositions({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const { loading: loadingAvailability } = useTeamAvailability({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const {
    averageAllocationPercentage,
    unallocatedCount,
    unallocatedEmployeeIds,
    employeeAllocations,
    loading: loadingProjectAllocation,
    refetch: refetchProjectAllocation
  } = useTeamProjectAllocation({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const {
    teamPerformance,
    averageTeamProgress,
    totalGoals: totalPerformanceGoals,
    goalsOnTrack,
    goalsAtRisk,
    goalsBehindTarget,
    goalsAchieved,
    loading: loadingTeamPerformance,
    refetch: refetchTeamPerformance
  } = useTeamPerformance({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const availableEmployeeIds = useMemo(() => {
    return directReports.filter(report => report.status === 'Available').map(report => report.id)
  }, [directReports])

  const {
    teamAttendance,
    remoteCount,
    notClockedInCount,
    notClockedInEmployeeIds,
    loading: loadingAttendance,
    refetch: refetchTeamAttendance
  } = useTeamAttendance({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    availableEmployeeIds
  })

  const directReportIds = useMemo(() => directReports.map(r => r.id), [directReports])

  const { daysSinceLastFeedback, hasFeedbackRecently } = useManagerFeedback({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    directReportIds
  })

  const { insight: aiInsight, isLoading: loadingAI } = useAIInsights({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const {
    summary: flightRiskSummary,
    employees: flightRiskEmployees,
    loading: loadingFlightRisk
  } = useFlightRiskPrediction({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    directReportIds,
    enableAISentiment
  })

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)

  const { cycles: performanceCycles, loading: loadingPerformanceCycles } = usePerformanceCycles(accessToken)

  const dashboardAvailableCycles = useMemo(() => {
    const completed = performanceCycles
      .filter(c => c.apiStatus === 'COMPLETED_PERFORMANCE_CYCLE_STATUS')
      .sort((a, b) => {
        const aEnd = a.evaluationPeriodEndDate ?? a.endDate
        const bEnd = b.evaluationPeriodEndDate ?? b.endDate
        return bEnd.localeCompare(aEnd)
      })
      .map(c => ({
        id: c.id,
        name: c.name,
        apiStatus: c.apiStatus,
        evaluationPeriodStartDate: c.evaluationPeriodStartDate,
        evaluationPeriodEndDate: c.evaluationPeriodEndDate
      }))

    const active = performanceCycles
      .filter(c => c.apiStatus === 'ACTIVE_PERFORMANCE_CYCLE_STATUS')
      .map(c => ({
        id: c.id,
        name: c.name,
        apiStatus: c.apiStatus,
        evaluationPeriodStartDate: c.evaluationPeriodStartDate,
        evaluationPeriodEndDate: c.evaluationPeriodEndDate
      }))

    return [...completed, ...active]
  }, [performanceCycles])

  useEffect(() => {
    if (!loadingPerformanceCycles && selectedCycleId === null && dashboardAvailableCycles.length > 0) {
      const latestCompleted = dashboardAvailableCycles.find(c => c.apiStatus === 'COMPLETED_PERFORMANCE_CYCLE_STATUS')
      if (latestCompleted) {
        setSelectedCycleId(latestCompleted.id)
      } else if (dashboardAvailableCycles.length > 0) {
        setSelectedCycleId(dashboardAvailableCycles[0].id)
      }
    }
  }, [loadingPerformanceCycles, dashboardAvailableCycles, selectedCycleId])

  const selectedCyclePeriod = useMemo(() => {
    const cycle = performanceCycles.find(c => c.id === selectedCycleId)
    if (!cycle || !selectedCycleId) return null
    const start = cycle.evaluationPeriodStartDate || cycle.startDate
    const end = cycle.evaluationPeriodEndDate || cycle.endDate
    if (!start || !end) return null
    return {
      start,
      end,
      name: cycle.name,
      cycleId: selectedCycleId,
      evaluationPeriodStartDate: cycle.evaluationPeriodStartDate ?? start,
      evaluationPeriodEndDate: cycle.evaluationPeriodEndDate ?? end
    }
  }, [performanceCycles, selectedCycleId])

  const {
    members: teamSkillsMembers,
    skillGrowth: teamSkillGrowth,
    teamSkillCoverage,
    topSkillGaps,
    topTeamStrengths,
    loading: loadingTeamSkills,
    error: teamSkillsError
  } = useTeamSkills({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    periodStart: selectedCyclePeriod?.start,
    periodEnd: selectedCyclePeriod?.end
  })

  const {
    members: teamFeedbackMembers,
    teamAvgRating,
    totalReceivedCount: totalFeedbackCount,
    totalGivenCount: totalFeedbackGivenCount,
    feedbackCoverage: teamFeedbackCoverage,
    recognitionRatio: teamRecognitionRatio,
    membersWithNoRecentFeedback,
    loading: loadingTeamFeedback,
    error: teamFeedbackError
  } = useTeamFeedbackOverview({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    periodStart: selectedCyclePeriod?.start,
    periodEnd: selectedCyclePeriod?.end
  })

  const {
    members: teamEvaluationMembers,
    teamAvgScore: teamEvalAvgScore,
    teamCompanyValuesAvg: teamEvalCompanyValuesAvg,
    teamSkillsAvg: teamEvalSkillsAvg,
    pendingEvaluations,
    completedEvaluations,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    availableCycles: evalAvailableCycles,
    loading: loadingTeamEvaluations,
    error: teamEvaluationsError
  } = useTeamEvaluations({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    selectedCycleId
  })

  // Dashboard-specific goals fetch (separate from main dashboard's useTeamPerformance)
  const [dashboardGoals, setDashboardGoals] = useState<TeamMemberPerformance[]>([])
  const [dashboardGoalStats, setDashboardGoalStats] = useState({
    totalGoals: 0,
    goalsOnTrack: 0,
    goalsAtRisk: 0,
    goalsBehindTarget: 0,
    goalsAchieved: 0,
    averageProgress: 0
  })
  const [loadingDashboardGoals, setLoadingDashboardGoals] = useState(false)

  const fetchDashboardGoals = useCallback(async () => {
    if (!selectedCycleId || !accessToken || directReports.length === 0) {
      setDashboardGoals([])
      setDashboardGoalStats({
        totalGoals: 0,
        goalsOnTrack: 0,
        goalsAtRisk: 0,
        goalsBehindTarget: 0,
        goalsAchieved: 0,
        averageProgress: 0
      })
      return
    }

    setLoadingDashboardGoals(true)
    try {
      const employeeIds = directReports.map(r => r.id)
      const goalsQuery = `
        query GetDashboardGoals($employeeIds: [uuid!]!, $cycleId: uuid!) {
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
      const goalsResponse = await graphQLClient.request(goalsQuery, {
        employeeIds,
        cycleId: selectedCycleId
      })
      const allGoals = goalsResponse?.EmployeePerformanceGoal || []

      const cycleMeta = performanceCycles.find(c => c.id === selectedCycleId)
      const cycleStart = cycleMeta?.startDate || cycleMeta?.evaluationPeriodStartDate || ''
      const cycleEnd = cycleMeta?.endDate || cycleMeta?.evaluationPeriodEndDate || ''

      const goalsByEmployee = new Map<string, typeof allGoals>()
      for (const empId of employeeIds) goalsByEmployee.set(empId, [])
      for (const goal of allGoals) {
        const empGoals = goalsByEmployee.get(goal.employeeId)
        if (empGoals) empGoals.push(goal)
      }

      let totalProgress = 0,
        totalCount = 0,
        onTrack = 0,
        atRisk = 0,
        behind = 0,
        achieved = 0

      const memberData: TeamMemberPerformance[] = directReports.map(emp => {
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

        totalCount += rollup.totalGoals
        totalProgress += rollup.totalGoals > 0 ? rollup.averageProgress * rollup.totalGoals : 0
        onTrack += rollup.goalsOnTrack
        atRisk += rollup.goalsAtRisk
        behind += rollup.goalsBehindTarget
        achieved += rollup.goalsAchieved

        return {
          employeeId: emp.id,
          userId: emp.userId || emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobPositionName: emp.jobPositionName || '',
          goals: rollup.goals,
          averageProgress: rollup.averageProgress,
          totalGoals: rollup.totalGoals,
          goalsOnTrack: rollup.goalsOnTrack,
          goalsAtRisk: rollup.goalsAtRisk,
          goalsBehindTarget: rollup.goalsBehindTarget,
          goalsAchieved: rollup.goalsAchieved
        }
      })

      setDashboardGoals(memberData)
      setDashboardGoalStats({
        totalGoals: totalCount,
        goalsOnTrack: onTrack,
        goalsAtRisk: atRisk,
        goalsBehindTarget: behind,
        goalsAchieved: achieved,
        averageProgress: totalCount > 0 ? Math.round(totalProgress / totalCount) : 0
      })
    } catch (err) {
      console.error('Error fetching dashboard goals:', err)
      setDashboardGoals([])
      setDashboardGoalStats({
        totalGoals: 0,
        goalsOnTrack: 0,
        goalsAtRisk: 0,
        goalsBehindTarget: 0,
        goalsAchieved: 0,
        averageProgress: 0
      })
    } finally {
      setLoadingDashboardGoals(false)
    }
  }, [selectedCycleId, accessToken, directReports, graphQLClient, performanceCycles])

  useEffect(() => {
    fetchDashboardGoals()
  }, [fetchDashboardGoals])

  const { userProfile } = useCurrentUserProfile({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const { orgData: userOrgData } = useCurrentUserOrgData({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const teamPerformanceSnapshotParams = useMemo(() => {
    const allLoaded = !loadingTeamSkills && !loadingTeamFeedback && !loadingTeamEvaluations && !loadingDashboardGoals
    if (!allLoaded || !employeeId || !selectedCyclePeriod) return null

    return {
      goals: {
        teamPerformance: dashboardGoals,
        averageTeamProgress: dashboardGoalStats.averageProgress,
        totalGoals: dashboardGoalStats.totalGoals,
        goalsOnTrack: dashboardGoalStats.goalsOnTrack,
        goalsAtRisk: dashboardGoalStats.goalsAtRisk,
        goalsBehindTarget: dashboardGoalStats.goalsBehindTarget,
        goalsAchieved: dashboardGoalStats.goalsAchieved
      },
      skills: {
        members: teamSkillsMembers,
        teamSkillCoverage,
        topSkillGaps,
        topTeamStrengths
      },
      feedback: {
        members: teamFeedbackMembers,
        teamAvgRating,
        totalReceivedCount: totalFeedbackCount,
        totalGivenCount: totalFeedbackGivenCount,
        feedbackCoverage: teamFeedbackCoverage,
        recognitionRatio: teamRecognitionRatio,
        membersWithNoRecentFeedback
      },
      evaluations: {
        members: teamEvaluationMembers,
        teamAvgScore: teamEvalAvgScore,
        teamCompanyValuesAvg: teamEvalCompanyValuesAvg,
        teamSkillsAvg: teamEvalSkillsAvg,
        pendingEvaluations,
        completedEvaluations
      },
      performanceCycle: {
        id: selectedCyclePeriod.cycleId,
        name: selectedCyclePeriod.name,
        evaluation_period_start_date: selectedCyclePeriod.evaluationPeriodStartDate,
        evaluation_period_end_date: selectedCyclePeriod.evaluationPeriodEndDate
      },
      managerName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Manager',
      teamSize: directReports.length
    }
  }, [
    loadingTeamSkills,
    loadingTeamFeedback,
    loadingTeamEvaluations,
    loadingDashboardGoals,
    employeeId,
    selectedCyclePeriod,
    dashboardGoals,
    dashboardGoalStats,
    teamSkillsMembers,
    teamSkillCoverage,
    topSkillGaps,
    topTeamStrengths,
    teamFeedbackMembers,
    teamAvgRating,
    totalFeedbackCount,
    totalFeedbackGivenCount,
    teamFeedbackCoverage,
    teamRecognitionRatio,
    membersWithNoRecentFeedback,
    teamEvaluationMembers,
    teamEvalAvgScore,
    teamEvalCompanyValuesAvg,
    teamEvalSkillsAvg,
    pendingEvaluations,
    completedEvaluations,
    userProfile,
    directReports.length
  ])

  const teamPerformanceInsights = useTeamPerformanceInsights({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    snapshotParams: teamPerformanceSnapshotParams,
    performanceCycleId: selectedCycleId
  })

  const refreshManagerDashboardData = async () => {
    await Promise.all([
      refetchDirectReports(),
      Promise.resolve(refetchMatrixTeams()),
      Promise.resolve(refetchProjectAllocation()),
      Promise.resolve(refetchTeamPerformance()),
      Promise.resolve(refetchTeamAttendance())
    ])
  }

  // Derived selectors
  const sickLeavesCount = useMemo(() => {
    return directReports.filter(report => {
      if (!report.currentAbsence) return false
      if (report.currentAbsence.parentEntryId?.includes('HEALTH')) return true
      if (report.currentAbsence.type?.toLowerCase().includes('sick')) return true
      return false
    }).length
  }, [directReports])

  const onLeaveCount = useMemo(() => {
    return directReports.filter(report => report.status === 'On Leave').length
  }, [directReports])

  const employeesWithoutGoalsCount = useMemo(() => {
    return teamPerformance.filter(member => member.totalGoals === 0).length
  }, [teamPerformance])

  const employeesWithoutGoalsList = useMemo(() => {
    return teamPerformance
      .filter(member => member.totalGoals === 0)
      .map(member => ({
        id: member.employeeId,
        name: `${member.firstName} ${member.lastName}`,
        firstName: member.firstName,
        lastName: member.lastName,
        pictureThumbnail: member.pictureThumbnail,
        jobPositionName: member.jobPositionName
      }))
  }, [teamPerformance])

  // Goals behind target with employee details for BLINK
  const goalsBehindData = useMemo(() => {
    if (!teamPerformance || teamPerformance.length === 0) return []

    const employeesWithGoalsBehind = teamPerformance.filter(member => member.goalsBehindTarget > 0)

    return employeesWithGoalsBehind
      .map(member => {
        const goalsBehind = member.goals.filter(g => g.status === 'BEHIND_TARGET' || g.status === 'NOT_ACHIEVED')

        return {
          employeeId: member.employeeId,
          employeeName: `${member.firstName} ${member.lastName}`,
          employeeUserId: member.userId || '',
          goals: goalsBehind.map(g => ({
            id: g.id,
            title: g.title,
            progressPercent: g.progressPercent
          }))
        }
      })
      .filter(emp => emp.goals.length > 0 && emp.employeeUserId) // Only include with userId and goals
  }, [teamPerformance])

  // Not clocked in employees with userId for chat nudges
  const notClockedInEmployeesWithUserId = useMemo(() => {
    if (
      !directReports ||
      directReports.length === 0 ||
      !notClockedInEmployeeIds ||
      notClockedInEmployeeIds.length === 0
    ) {
      return []
    }

    // Create a Set for O(1) lookup
    const notClockedInSet = new Set(notClockedInEmployeeIds)

    return directReports
      .filter(report => notClockedInSet.has(report.id))
      .map(report => ({
        id: report.id,
        name: `${report.firstName} ${report.lastName}`,
        userId: report.userId || report.id // Fallback to employee ID if userId doesn't exist
      }))
      .filter(emp => emp.userId) // Only include those with some ID
  }, [directReports, notClockedInEmployeeIds])

  const aiInsightItems = useMemo(() => {
    if (!aiInsight) return []

    const lines = aiInsight
      .split(/[\n•-]/)
      .map(line => line.trim())
      .filter(line => line.length > 10)
      .slice(0, 3)

    return lines.map((line, index) => ({
      id: index,
      text: line,
      type: getAiInsightType(index)
    }))
  }, [aiInsight])

  const directReportsWithAllocation = useMemo(
    () =>
      directReports.map(report => ({
        id: report.id,
        allocationPercent: employeeAllocations.find(allocation => allocation.id === report.id)?.allocationPercent || 0
      })),
    [directReports, employeeAllocations]
  )

  const unallocatedEmployeesWithAllocation = useMemo(
    () =>
      directReports
        .filter(report => unallocatedEmployeeIds.includes(report.id))
        .map(report => ({
          id: report.id,
          name: `${report.firstName} ${report.lastName}`,
          allocationPercent: employeeAllocations.find(allocation => allocation.id === report.id)?.allocationPercent || 0
        })),
    [directReports, unallocatedEmployeeIds, employeeAllocations]
  )

  // Calculate monthly cost of unallocated employees based on EmployeeSalary
  useEffect(() => {
    const fetchUnallocatedSalaryCost = async () => {
      if (!unallocatedEmployeeIds || unallocatedEmployeeIds.length === 0) {
        setUnallocatedMonthlyCost(0)
        return
      }

      try {
        const today = new Date().toISOString().split('T')[0]

        const camelCaseQuery = `
          query GetUnallocatedSalariesCamelCase($employeeIds: [uuid!]!, $today: date!) {
            EmployeeSalary(
              where: { 
                employeeId: { _in: $employeeIds }
                isDeleted: { _eq: false }
                startDate: { _lte: $today }
              }
              limit: 200
            ) {
              id
              employeeId
              annualGrossSalary
              monthlyGrossSalary
              startDate
              endDate
            }
          }
        `

        const snakeCaseQuery = `
          query GetUnallocatedSalariesSnakeCase($employeeIds: [uuid!]!, $today: date!) {
            employee_salary(
              where: {
                employee_id: { _in: $employeeIds }
                is_deleted: { _eq: false }
                start_date: { _lte: $today }
              }
              limit: 200
            ) {
              id
              employee_id
              annual_gross_salary
              monthly_gross_salary
              start_date
              end_date
            }
          }
        `

        let salaryRecords: any[] = []

        try {
          const response = await graphQLClient.request<{ EmployeeSalary?: any[] }>(camelCaseQuery, {
            employeeIds: unallocatedEmployeeIds,
            today
          })
          salaryRecords = response?.EmployeeSalary || []
        } catch (camelCaseError) {
          console.warn('EmployeeSalary query failed, trying employee_salary fallback:', camelCaseError)
          const fallbackResponse = await graphQLClient.request<{ employee_salary?: any[] }>(snakeCaseQuery, {
            employeeIds: unallocatedEmployeeIds,
            today
          })
          salaryRecords = fallbackResponse?.employee_salary || []
        }

        // Track the latest active salary record per employee
        const employeeCurrentSalaries = new Map<string, { monthlyAmount: number; startDateMs: number }>()

        salaryRecords.forEach(record => {
          const employeeId = record.employeeId || record.employee_id
          const startDateRaw = record.startDate || record.start_date
          const endDateRaw = record.endDate || record.end_date
          const monthlyGrossSalary = record.monthlyGrossSalary ?? record.monthly_gross_salary
          const annualGrossSalary = record.annualGrossSalary ?? record.annual_gross_salary

          if (!employeeId || !startDateRaw) {
            return
          }

          // Check if this is an active record
          const startDate = new Date(startDateRaw)
          const endDate = endDateRaw ? new Date(endDateRaw) : null
          const now = new Date()

          if (startDate <= now && (!endDate || endDate >= now)) {
            // Get salary amount as MONTHLY (prefer monthlyGross, fallback annualGross / 12)
            let monthlyAmount = 0
            if (monthlyGrossSalary != null && monthlyGrossSalary > 0) {
              monthlyAmount = monthlyGrossSalary
            } else if (annualGrossSalary != null && annualGrossSalary > 0) {
              monthlyAmount = annualGrossSalary / 12
            }

            const current = employeeCurrentSalaries.get(employeeId)
            const startDateMs = startDate.getTime()
            if (!current || startDateMs > current.startDateMs) {
              employeeCurrentSalaries.set(employeeId, { monthlyAmount, startDateMs })
            }
          }
        })

        // Calculate total monthly cost
        let totalMonthlyCost = 0
        employeeCurrentSalaries.forEach(salaryData => {
          totalMonthlyCost += salaryData.monthlyAmount
        })

        setUnallocatedMonthlyCost(Math.round(totalMonthlyCost))
      } catch (error) {
        console.error('Failed to fetch unallocated salary cost:', error)
        setUnallocatedMonthlyCost(0)
      }
    }

    fetchUnallocatedSalaryCost()
  }, [unallocatedEmployeeIds, graphQLClient])

  // Dashboard computed data
  const dashboardScoreDistribution = useMemo(
    () => computeScoreDistribution(teamEvaluationMembers),
    [teamEvaluationMembers]
  )

  const dashboardTrendSeries = useMemo(() => computeTrendSeries(teamEvaluationMembers), [teamEvaluationMembers])

  const dashboardAlerts = useMemo(
    () => generateAlerts(teamEvaluationMembers, teamPerformance, teamFeedbackMembers, teamSkillsMembers),
    [teamEvaluationMembers, teamPerformance, teamFeedbackMembers, teamSkillsMembers]
  )

  const dashboardEmployeeSignals = useMemo(
    () => detectEmployeeSignals(teamEvaluationMembers, teamPerformance, teamFeedbackMembers, teamSkillsMembers),
    [teamEvaluationMembers, teamPerformance, teamFeedbackMembers, teamSkillsMembers]
  )

  const dashboardTeamSignals = useMemo(
    () => detectTeamSignals(teamEvaluationMembers, teamPerformance, teamFeedbackMembers, dashboardEmployeeSignals),
    [teamEvaluationMembers, teamPerformance, teamFeedbackMembers, dashboardEmployeeSignals]
  )

  const dashboardTalentSignals = useMemo(
    () => detectTalentSignals(teamEvaluationMembers, teamPerformance, teamFeedbackMembers, teamSkillsMembers),
    [teamEvaluationMembers, teamPerformance, teamFeedbackMembers, teamSkillsMembers]
  )

  const dashboardCompanyValuesDimensionAvgs = useMemo(
    () => computeTeamDimensionAverages(teamEvaluationMembers, 'companyValues'),
    [teamEvaluationMembers]
  )

  const dashboardSkillsDimensionAvgs = useMemo(
    () => computeTeamDimensionAverages(teamEvaluationMembers, 'skills'),
    [teamEvaluationMembers]
  )

  const dashboardAlignmentGaps = useMemo(() => computeAlignmentGaps(teamEvaluationMembers), [teamEvaluationMembers])

  const dashboardRatingScaleLimit = useMemo(() => {
    for (const m of teamEvaluationMembers) {
      if (m.ratingScaleLimit != null) return m.ratingScaleLimit
    }
    return 5
  }, [teamEvaluationMembers])

  const dashboardSkillGrowthRate = useMemo(() => {
    const withChange = teamEvaluationMembers.filter(m => m.changeSkills != null && m.changeSkills > 0)
    return teamEvaluationMembers.length > 0 ? Math.round((withChange.length / teamEvaluationMembers.length) * 100) : 0
  }, [teamEvaluationMembers])

  const dashboardChangeOverall = useMemo(() => {
    const changes = teamEvaluationMembers.filter(m => m.changeOverall != null).map(m => m.changeOverall!)
    return changes.length > 0 ? Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 10) / 10 : null
  }, [teamEvaluationMembers])

  const dashboardChangeCompanyValues = useMemo(() => {
    const changes = teamEvaluationMembers.filter(m => m.changeCompanyValues != null).map(m => m.changeCompanyValues!)
    return changes.length > 0 ? Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 10) / 10 : null
  }, [teamEvaluationMembers])

  const dashboardChangeSkills = useMemo(() => {
    const changes = teamEvaluationMembers.filter(m => m.changeSkills != null).map(m => m.changeSkills!)
    return changes.length > 0 ? Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 10) / 10 : null
  }, [teamEvaluationMembers])

  // Structured return object organized by UI sections
  return {
    // Section 1: Today's Priorities (AI-driven insights)
    // Do not gate the whole card on allocation or AI — show a dedicated row while project data loads.
    priorities: {
      items: aiInsightItems,
      loading: false,
      counts: {
        onLeave: onLeaveCount,
        sickLeaves: sickLeavesCount,
        unallocated: unallocatedCount,
        withoutGoals: employeesWithoutGoalsCount,
        goalsBehind: goalsBehindTarget,
        notClockedIn: notClockedInCount,
        remote: remoteCount,
        upcomingAnniversaries: upcomingAnniversaries.length
      },
      unallocatedMonthlyCost,
      unallocatedEmployees: unallocatedEmployeesWithAllocation,
      employeesWithoutGoals: employeesWithoutGoalsList,
      goalsBehindData,
      notClockedInEmployees: notClockedInEmployeesWithUserId,
      feedback: {
        daysSince: daysSinceLastFeedback,
        hasRecently: hasFeedbackRecently
      }
    },

    // Section 2: Team Health (Flight Risk)
    teamHealth: {
      summary: flightRiskSummary,
      employees: flightRiskEmployees,
      loading: loadingFlightRisk
    },

    // Section 3: Team Members
    teamMembers: {
      direct: directReports,
      matrix: matrixTeamMembers,
      attendance: teamAttendance,
      unallocatedIds: unallocatedEmployeeIds,
      withAllocation: directReportsWithAllocation,
      availableIds: availableEmployeeIds,
      loading: {
        directReports: loadingDirectReports,
        matrix: loadingMatrixTeams,
        availability: loadingAvailability
      },
      errors: {
        directReports: directReportsError,
        matrix: matrixTeamsError
      }
    },

    // Section 4: Work & Capacity
    workCapacity: {
      utilizationPercent: averageAllocationPercentage,
      idleCount: unallocatedCount,
      openPositions: openPositions,
      fullPositions: fullPositions,
      loading: {
        allocation: loadingProjectAllocation,
        positions: loadingOpenPositions
      }
    },

    // Section 5: Performance & Growth
    performanceGrowth: {
      onTrack: goalsOnTrack,
      atRisk: goalsAtRisk,
      behind: goalsBehindTarget,
      totalGoals: totalPerformanceGoals,
      averageProgress: averageTeamProgress,
      details: teamPerformance,
      loading: loadingTeamPerformance
    },

    // Section 6: Team Performance Dashboard (multi-dimensional)
    teamPerformanceOverview: {
      goals: {
        teamPerformance: dashboardGoals,
        totalGoals: dashboardGoalStats.totalGoals,
        goalsOnTrack: dashboardGoalStats.goalsOnTrack,
        goalsAtRisk: dashboardGoalStats.goalsAtRisk,
        goalsBehindTarget: dashboardGoalStats.goalsBehindTarget,
        goalsAchieved: dashboardGoalStats.goalsAchieved,
        averageProgress: dashboardGoalStats.averageProgress,
        loading: loadingDashboardGoals
      },
      skills: {
        members: teamSkillsMembers,
        skillGrowth: teamSkillGrowth,
        teamSkillCoverage,
        topSkillGaps,
        topTeamStrengths,
        loading: loadingTeamSkills,
        error: teamSkillsError
      },
      feedback: {
        members: teamFeedbackMembers,
        teamAvgRating,
        totalFeedbackCount,
        totalGivenCount: totalFeedbackGivenCount,
        feedbackCoverage: teamFeedbackCoverage,
        recognitionRatio: teamRecognitionRatio,
        membersWithNoRecentFeedback,
        loading: loadingTeamFeedback,
        error: teamFeedbackError
      },
      evaluations: {
        members: teamEvaluationMembers,
        teamAvgScore: teamEvalAvgScore,
        teamCompanyValuesAvg: teamEvalCompanyValuesAvg,
        teamSkillsAvg: teamEvalSkillsAvg,
        availableCycles: dashboardAvailableCycles,
        pendingEvaluations,
        completedEvaluations,
        loading: loadingTeamEvaluations,
        error: teamEvaluationsError
      },
      insights: teamPerformanceInsights,
      dashboard: {
        selectedCycleId,
        setSelectedCycleId,
        scoreDistribution: dashboardScoreDistribution,
        trendSeries: dashboardTrendSeries,
        alerts: dashboardAlerts,
        talentSignals: dashboardTalentSignals,
        employeeSignals: dashboardEmployeeSignals,
        teamSignals: dashboardTeamSignals,
        companyValuesDimensionAverages: dashboardCompanyValuesDimensionAvgs,
        skillsDimensionAverages: dashboardSkillsDimensionAvgs,
        alignmentGaps: dashboardAlignmentGaps,
        ratingScaleLimit: dashboardRatingScaleLimit,
        skillGrowthRate: dashboardSkillGrowthRate,
        changeOverall: dashboardChangeOverall,
        changeCompanyValues: dashboardChangeCompanyValues,
        changeSkills: dashboardChangeSkills
      }
    },

    // Section 7: People & Moments (Insights)
    peopleMoments: {
      birthdays: upcomingBirthdays,
      anniversaries: upcomingAnniversaries,
      openPositions: openPositions,
      loading: {
        birthdays: loadingBirthdays,
        anniversaries: loadingAnniversaries,
        positions: loadingOpenPositions
      }
    },

    // User profile data
    user: {
      profile: userProfile,
      orgData: userOrgData
    },

    // View state
    view: {
      current: currentView,
      activeTeamTab,
      setActiveTeamTab,
      activeInsightsTab,
      setActiveInsightsTab,
      filterAbsentOnly,
      setFilterAbsentOnly,
      filterUnallocatedOnly,
      setFilterUnallocatedOnly,
      selectedPosition,
      isPositionSheetOpen,
      setIsPositionSheetOpen,
      selectedMemberId,
      isMemberPanelOpen,
      setIsMemberPanelOpen
    },

    // All actions/callbacks
    actions: {
      navigateToTeammates: handleNavigateToTeammates,
      navigateToAbsentTeammates: handleNavigateToAbsentTeammates,
      navigateToUnallocatedTeammates: handleNavigateToUnallocatedTeammates,
      navigateToTeamPerformance: handleNavigateToTeamPerformance,
      navigateToGoalsBehind: handleNavigateToGoalsBehind,
      navigateToGoalsAtRisk: handleNavigateToGoalsAtRisk,
      navigateToTeamPerformanceOverview: handleNavigateToTeamPerformanceOverview,
      navigateToNotClockedIn: handleNavigateToNotClockedIn,
      navigateToBirthdays: handleNavigateToBirthdays,
      navigateToAnniversaries: handleNavigateToAnniversaries,
      navigateToOpenPositions: handleNavigateToOpenPositions,
      navigateToInsights: handleNavigateToInsights,
      navigateBackToDashboard: handleNavigateBackToDashboard,
      refreshManagerDashboardData,
      navigateToEmployee: handleNavigateToEmployee,
      openMemberPanel: handleOpenMemberPanel,
      closeMemberPanel: handleCloseMemberPanel,
      toggleSentimentAnalysis: setEnableAISentiment
    },

    // BACKWARD COMPATIBILITY - Flat structure for existing component code
    // These map directly to the nested structure above
    directReports,
    matrixTeamMembers,
    upcomingBirthdays,
    upcomingAnniversaries,
    openPositions,
    fullPositions,
    teamPerformance,
    teamAttendance,
    userProfile,
    userOrgData,
    sickLeavesCount,
    onLeaveCount,
    employeesWithoutGoals: employeesWithoutGoalsCount,
    employeesWithoutGoalsList,
    goalsBehindData,
    notClockedInEmployeesWithUserId,
    aiInsightItems,
    availableEmployeeIds,
    unallocatedEmployeeIds,
    averageAllocationPercentage,
    unallocatedCount,
    // Kept for backward compatibility naming
    unallocatedDailyCost: unallocatedMonthlyCost,
    unallocatedMonthlyCost,
    unallocatedEmployeesWithAllocation,
    directReportsWithAllocation,
    averageTeamProgress,
    totalPerformanceGoals,
    goalsOnTrack,
    goalsAtRisk,
    goalsBehindTarget,
    goalsAchieved,
    remoteCount,
    notClockedInCount,
    daysSinceLastFeedback,
    hasFeedbackRecently,
    flightRiskSummary,
    flightRiskEmployees,
    loadingDirectReports,
    loadingMatrixTeams,
    loadingBirthdays,
    loadingAnniversaries,
    loadingOpenPositions,
    loadingAvailability,
    loadingProjectAllocation,
    loadingTeamPerformance,
    loadingAttendance,
    loadingAI,
    loadingFlightRisk,
    directReportsError,
    matrixTeamsError,
    currentView,
    activeTeamTab,
    setActiveTeamTab,
    activeInsightsTab,
    setActiveInsightsTab,
    filterAbsentOnly,
    setFilterAbsentOnly,
    filterUnallocatedOnly,
    setFilterUnallocatedOnly,
    filterGoalsBehindOnly,
    initialPerformanceStatusFilter,
    selectedPosition,
    isPositionSheetOpen,
    setIsPositionSheetOpen,
    selectedMemberId,
    isMemberPanelOpen,
    setIsMemberPanelOpen,
    enableAISentiment,
    handleNavigateToTeammates,
    handleNavigateToAbsentTeammates,
    handleNavigateToUnallocatedTeammates,
    handleNavigateToTeamPerformance,
    handleNavigateToGoalsBehind,
    handleNavigateToGoalsAtRisk,
    handleNavigateToTeamPerformanceOverview,
    handleNavigateToNotClockedIn,
    handleNavigateToBirthdays,
    handleNavigateToAnniversaries,
    handleNavigateToOpenPositions,
    handleNavigateToInsights,
    handleNavigateBackToDashboard,
    refreshManagerDashboardData,
    handleNavigateToEmployee,
    handleOpenMemberPanel,
    handleCloseMemberPanel,

    // Internal use
    _legacy: {
      directReportIds,
      structureId
    }
  }
}
