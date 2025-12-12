'use client'

import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from './hooks/useDirectReports'
import { useMatrixTeams } from './hooks/useMatrixTeams'
import { useTeamBirthdays } from './hooks/useTeamBirthdays'
import { useTeamAnniversaries } from './hooks/useTeamAnniversaries'
import { useOpenJobPositions } from './hooks/useOpenJobPositions'
import { useCurrentUserProfile } from './hooks/useCurrentUserProfile'
import { useTeamAvailability } from './hooks/useTeamAvailability'
import { useTeamProjectAllocation } from './hooks/useTeamProjectAllocation'
import { useTeamPerformance } from './hooks/useTeamPerformance'
import { useTeamAttendance } from './hooks/useTeamAttendance'
import { useManagerFeedback } from './hooks/useManagerFeedback'
import { useAIInsights } from './hooks/useAIInsights'
import { NotClockedInView } from './views/NotClockedInView'
import { FilteredTeammatesView } from './views/FilteredTeammatesView'
import { TeamPerformanceView } from './views/TeamPerformanceView'
import { TeamInsightsView } from './views/TeamInsightsView'
import { TeammatesView } from './views/TeammatesView'
import { AIInsightsCard } from './components/AIInsightsCard'
import { MyTeamCard } from './components/MyTeamCard'
import { DashboardCards } from './components/DashboardCards'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { Avatar, AvatarImage, AvatarFallback, Toaster, Sheet, SheetContent } from '@newwork/nw-design-system'
import { JobPosition } from './hooks/useOpenJobPositions'
import { JobPositionDetails } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/components/JobPositionDetails'

type TeamTab = 'my-team' | 'my-teams'
type InsightsTab = 'birthdays' | 'anniversaries' | 'open-positions'
type CurrentView = 'dashboard' | 'teammates' | 'filtered-teammates' | 'insights' | 'team-performance' | 'not-clocked-in'

export const ManagerDashboard: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId
  const [activeTeamTab, setActiveTeamTab] = useState<TeamTab>('my-team')
  const [activeInsightsTab, setActiveInsightsTab] = useState<InsightsTab>('birthdays')
  const [currentView, setCurrentView] = useState<CurrentView>('dashboard')
  const [filterAbsentOnly, setFilterAbsentOnly] = useState(false)
  const [filterUnallocatedOnly, setFilterUnallocatedOnly] = useState(false)
  const [selectedPosition] = useState<JobPosition | null>(null)
  const [isPositionSheetOpen, setIsPositionSheetOpen] = useState(false)
  const structureId = getCurrentActiveStructureId()

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
  }

  const handleNavigateToNotClockedIn = () => {
    setCurrentView('not-clocked-in')
  }

  const handleNavigateToInsights = (tab?: InsightsTab) => {
    if (tab) {
      setActiveInsightsTab(tab)
    }
    setCurrentView('insights')
  }

  const handleNavigateBackToDashboard = () => {
    setFilterAbsentOnly(false)
    setFilterUnallocatedOnly(false)
    setCurrentView('dashboard')
  }

  const handleNavigateToEmployee = (employeeId: string) => {
    const profileUrl = buildPlatformUrl('/platform/employee-record', {
      employeeId,
      tab: 'summary'
    })
    navigateTo(profileUrl)
  }

  const {
    directReports,
    loading: loadingDirectReports,
    error: directReportsError
  } = useDirectReports({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  const {
    matrixTeamMembers,
    loading: loadingMatrixTeams,
    error: matrixTeamsError
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
    loading: loadingProjectAllocation
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
    loading: loadingTeamPerformance
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
    loading: loadingAttendance
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

  const employeesWithoutGoals = useMemo(() => {
    return teamPerformance.filter(member => member.totalGoals === 0).length
  }, [teamPerformance])

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
      type: index === 0 ? 'warning' : index === 1 ? 'success' : 'info'
    }))
  }, [aiInsight])

  const { userProfile } = useCurrentUserProfile({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const mainContent = (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid="manager-dashboard-content">
      <div className="gba:mb-6" data-testid="manager-dashboard-header-section">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground" data-testid="manager-dashboard-title">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.title', 'Manager Workboard')}
            </h1>
            <p className="gba:text-muted-foreground" data-testid="manager-dashboard-subtitle">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.subtitle',
                'AI insights at a glance'
              )}
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3" data-testid="manager-dashboard-welcome-section">
            <div className="gba:text-right">
              <p
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid="manager-dashboard-welcome-title"
              >
                {getTranslationFromI18nKeyAndLabel('setup:welcome.title', 'Welcome')},{' '}
                {userInfo?.employeeDetails?.firstName ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.manager_title',
                    'Manager'
                  )}
                !
              </p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {userInfo?.employeeDetails?.organizationalUnit?.name ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
                    'Department'
                  )}
              </p>
            </div>
            <div data-testid="manager-dashboard-user-avatar">
              <Avatar size="lg" className="gba:h-12 gba:w-12" data-testid="manager-dashboard-user-avatar-image">
                <AvatarImage
                  src={
                    userProfile?.pictureThumbnail && !userProfile.pictureThumbnail.startsWith('{')
                      ? `data:image/jpeg;base64,${userProfile.pictureThumbnail}`
                      : undefined
                  }
                  alt={`${userProfile?.firstName || userInfo?.employeeDetails?.firstName || ''} ${userProfile?.lastName || userInfo?.employeeDetails?.lastName || ''}`}
                />
                <AvatarFallback>
                  {`${userProfile?.firstName?.[0] || userInfo?.employeeDetails?.firstName?.[0] || ''}${userProfile?.lastName?.[0] || userInfo?.employeeDetails?.lastName?.[0] || ''}`.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
        <AIInsightsCard
          loadingAI={loadingAI}
          aiInsightItems={aiInsightItems}
          onLeaveCount={onLeaveCount}
          sickLeavesCount={sickLeavesCount}
          unallocatedCount={unallocatedCount}
          employeesWithoutGoals={employeesWithoutGoals}
          goalsBehindTarget={goalsBehindTarget}
          notClockedInCount={notClockedInCount}
          remoteCount={remoteCount}
          hasFeedbackRecently={hasFeedbackRecently}
          daysSinceLastFeedback={daysSinceLastFeedback}
          directReportsCount={directReports.length}
          upcomingAnniversaries={upcomingAnniversaries}
          onNavigateToAbsentTeammates={handleNavigateToAbsentTeammates}
          onNavigateToUnallocatedTeammates={handleNavigateToUnallocatedTeammates}
          onNavigateToTeamPerformance={handleNavigateToTeamPerformance}
          onNavigateToNotClockedIn={handleNavigateToNotClockedIn}
          onNavigateToInsights={handleNavigateToInsights}
        />

        <MyTeamCard
          directReports={directReports}
          teamAttendance={teamAttendance}
          onLeaveCount={onLeaveCount}
          remoteCount={remoteCount}
          loadingDirectReports={loadingDirectReports}
          loadingAvailability={loadingAvailability}
          onNavigateToTeammates={handleNavigateToTeammates}
          onNavigateToEmployee={handleNavigateToEmployee}
        />
      </div>

      <DashboardCards
        directReportsCount={directReports.length}
        onLeaveCount={onLeaveCount}
        loadingAvailability={loadingAvailability}
        averageAllocationPercentage={averageAllocationPercentage}
        unallocatedCount={unallocatedCount}
        loadingProjectAllocation={loadingProjectAllocation}
        totalPerformanceGoals={totalPerformanceGoals}
        averageTeamProgress={averageTeamProgress}
        goalsOnTrack={goalsOnTrack}
        goalsAtRisk={goalsAtRisk}
        goalsBehindTarget={goalsBehindTarget}
        loadingTeamPerformance={loadingTeamPerformance}
        upcomingBirthdays={upcomingBirthdays}
        upcomingAnniversaries={upcomingAnniversaries}
        openPositions={openPositions}
        loadingBirthdays={loadingBirthdays}
        loadingAnniversaries={loadingAnniversaries}
        loadingOpenPositions={loadingOpenPositions}
        onNavigateToAbsentTeammates={handleNavigateToAbsentTeammates}
        onNavigateToUnallocatedTeammates={handleNavigateToUnallocatedTeammates}
        onNavigateToTeamPerformance={handleNavigateToTeamPerformance}
        onNavigateToInsights={handleNavigateToInsights}
      />
      <Toaster position="bottom-right" richColors />
    </div>
  )

  if (currentView === 'teammates') {
    return (
      <TeammatesView
        directReports={directReports}
        matrixTeamMembers={matrixTeamMembers}
        unallocatedEmployeeIds={unallocatedEmployeeIds}
        filterAbsentOnly={filterAbsentOnly}
        filterUnallocatedOnly={filterUnallocatedOnly}
        setFilterAbsentOnly={setFilterAbsentOnly}
        setFilterUnallocatedOnly={setFilterUnallocatedOnly}
        loadingDirectReports={loadingDirectReports}
        loadingMatrixTeams={loadingMatrixTeams}
        directReportsError={directReportsError}
        matrixTeamsError={matrixTeamsError}
        activeTeamTab={activeTeamTab}
        setActiveTeamTab={setActiveTeamTab}
        employeeId={employeeId || ''}
        accessToken={accessToken || ''}
        onNavigateBack={handleNavigateBackToDashboard}
        onNavigateToEmployee={handleNavigateToEmployee}
      />
    )
  }

  if (currentView === 'filtered-teammates') {
    return (
      <FilteredTeammatesView
        directReports={directReports}
        unallocatedEmployeeIds={unallocatedEmployeeIds}
        filterAbsentOnly={filterAbsentOnly}
        filterUnallocatedOnly={filterUnallocatedOnly}
        loadingDirectReports={loadingDirectReports}
        directReportsError={directReportsError}
        onNavigateBack={handleNavigateBackToDashboard}
        onNavigateToEmployee={handleNavigateToEmployee}
      />
    )
  }

  if (currentView === 'team-performance') {
    return (
      <TeamPerformanceView
        teamPerformance={teamPerformance}
        totalPerformanceGoals={totalPerformanceGoals}
        averageTeamProgress={averageTeamProgress}
        goalsOnTrack={goalsOnTrack}
        goalsAtRisk={goalsAtRisk}
        goalsBehindTarget={goalsBehindTarget}
        loadingTeamPerformance={loadingTeamPerformance}
        onNavigateBack={handleNavigateBackToDashboard}
        onNavigateToEmployee={handleNavigateToEmployee}
      />
    )
  }

  if (currentView === 'not-clocked-in') {
    return (
      <NotClockedInView
        teamAttendance={teamAttendance}
        availableEmployeeIds={availableEmployeeIds}
        notClockedInCount={notClockedInCount}
        loadingAttendance={loadingAttendance}
        onNavigateBack={handleNavigateBackToDashboard}
        onNavigateToEmployee={handleNavigateToEmployee}
      />
    )
  }

  if (currentView === 'insights') {
    return (
      <TeamInsightsView
        upcomingBirthdays={upcomingBirthdays}
        upcomingAnniversaries={upcomingAnniversaries}
        openPositions={openPositions}
        fullPositions={fullPositions}
        loadingBirthdays={loadingBirthdays}
        loadingAnniversaries={loadingAnniversaries}
        loadingOpenPositions={loadingOpenPositions}
        activeInsightsTab={activeInsightsTab}
        setActiveInsightsTab={setActiveInsightsTab}
        accessToken={accessToken || ''}
        onNavigateBack={handleNavigateBackToDashboard}
        onNavigateToEmployee={handleNavigateToEmployee}
      />
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:h-full">{mainContent}</div>

      <Sheet open={isPositionSheetOpen} onOpenChange={setIsPositionSheetOpen} title="">
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:flex gba:flex-col gba:p-0">
          <div className="gba:h-10 gba:flex-shrink-0" />
          <div className="gba:flex-1 gba:overflow-y-auto">
            {selectedPosition && accessToken && (
              <JobPositionDetails jobPosition={selectedPosition} accessToken={accessToken} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ManagerDashboard
