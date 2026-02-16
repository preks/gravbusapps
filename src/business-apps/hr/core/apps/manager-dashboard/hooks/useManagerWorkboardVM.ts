import { useState, useMemo, useEffect } from 'react'
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
import { useTeamPerformance } from './useTeamPerformance'
import { useTeamAttendance } from './useTeamAttendance'
import { useManagerFeedback } from './useManagerFeedback'
import { useAIInsights } from './useAIInsights'
import { useFlightRiskPrediction } from './useFlightRiskPrediction'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
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
  | 'not-clocked-in'
type GoalStatusFilter = 'ALL' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND_TARGET' | 'ACHIEVED'

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
  const [unallocatedDailyCost, setUnallocatedDailyCost] = useState<number>(0)

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

  const { userProfile } = useCurrentUserProfile({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const { orgData: userOrgData } = useCurrentUserOrgData({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
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
        name: `${member.firstName} ${member.lastName}`
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
      .split(/[\n•\-]/)
      .map(line => line.trim())
      .filter(line => line.length > 10)
      .slice(0, 3)

    return lines.map((line, index) => ({
      id: index,
      text: line,
      type: index === 0 ? ('warning' as const) : index === 1 ? ('success' as const) : ('info' as const)
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

  // Calculate daily cost of unallocated employees
  useEffect(() => {
    const fetchUnallocatedSalaryCost = async () => {
      if (!unallocatedEmployeeIds || unallocatedEmployeeIds.length === 0) {
        setUnallocatedDailyCost(0)
        return
      }

      try {
        const today = new Date().toISOString().split('T')[0]

        const query = `
          query GetUnallocatedSalaries($employeeIds: [uuid!]!) {
            EmployeeSalary(
              where: { 
                employeeId: { _in: $employeeIds }
                isDeleted: { _eq: false }
                startDate: { _lte: "${today}" }
              }
              limit: 200
            ) {
              id
              employeeId
              annualGrossSalary
              monthlyGrossSalary
              hourlyGrossSalary
              startDate
              endDate
              currency {
                code
              }
            }
          }
        `

        const response = await graphQLClient.request<{ EmployeeSalary: any[] }>(query, {
          employeeIds: unallocatedEmployeeIds
        })

        // Find current active salary for each employee
        const employeeCurrentSalaries = new Map<string, number>()

        response.EmployeeSalary.forEach(record => {
          // Check if this is an active record
          const startDate = new Date(record.startDate)
          const endDate = record.endDate ? new Date(record.endDate) : null
          const now = new Date()

          if (startDate <= now && (!endDate || endDate >= now)) {
            // Get salary amount (prefer annual, then monthly*12, then hourly*2080)
            let annualAmount = 0
            if (record.annualGrossSalary != null && record.annualGrossSalary > 0) {
              annualAmount = record.annualGrossSalary
            } else if (record.monthlyGrossSalary != null && record.monthlyGrossSalary > 0) {
              annualAmount = record.monthlyGrossSalary * 12
            } else if (record.hourlyGrossSalary != null && record.hourlyGrossSalary > 0) {
              annualAmount = record.hourlyGrossSalary * 2080 // 40 hrs/week * 52 weeks
            }

            // Only set if we don't have a salary yet or this is a newer record
            if (!employeeCurrentSalaries.has(record.employeeId)) {
              employeeCurrentSalaries.set(record.employeeId, annualAmount)
            }
          }
        })

        // Calculate total daily cost (annual salary / 365 days)
        let totalDailyCost = 0
        employeeCurrentSalaries.forEach(annualSalary => {
          totalDailyCost += annualSalary / 365
        })

        setUnallocatedDailyCost(Math.round(totalDailyCost))
      } catch (error) {
        console.error('Failed to fetch unallocated salary cost:', error)
        setUnallocatedDailyCost(0)
      }
    }

    fetchUnallocatedSalaryCost()
  }, [unallocatedEmployeeIds, graphQLClient])

  // Structured return object organized by UI sections
  return {
    // Section 1: Today's Priorities (AI-driven insights)
    priorities: {
      items: aiInsightItems,
      loading: loadingAI,
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
      unallocatedDailyCost,
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

    // Section 6: People & Moments (Insights)
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
    unallocatedDailyCost,
    unallocatedEmployeesWithAllocation,
    directReportsWithAllocation,
    averageTeamProgress,
    totalPerformanceGoals,
    goalsOnTrack,
    goalsAtRisk,
    goalsBehindTarget,
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
