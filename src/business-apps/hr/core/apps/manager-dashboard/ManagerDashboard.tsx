// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useManagerWorkboardVM } from './hooks/useManagerWorkboardVM'
import { NotClockedInView } from './views/NotClockedInView'
import { FilteredTeammatesView } from './views/FilteredTeammatesView'
import { TeamPerformanceView } from './views/TeamPerformanceView'
import { TeamPerformanceDashboard } from './views/TeamPerformanceDashboard'
import { TeamInsightsView } from './views/TeamInsightsView'
import { OpenPositionsView } from './views/OpenPositionsView'
import { BirthdaysView } from './views/BirthdaysView'
import { AnniversariesView } from './views/AnniversariesView'
import { TeammatesView } from './views/TeammatesView'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Avatar, AvatarImage, AvatarFallback, Toaster, Sheet, SheetContent } from '@newwork/nw-design-system'
import { JobPositionDetails } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/components/JobPositionDetails'
// New section components
import {
  TodaysPrioritiesSection,
  TeamHealthSection,
  TeamAvatarsSection,
  WorkCapacitySection,
  PerformanceGrowthSection,
  PeopleMomentsSection,
  OpenPositionsSection,
  MemberQuickPanel,
  AssignProjectDialog
} from './components/manager-workboard'

export const ManagerDashboard: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId
  const [assignProjectEmployee, setAssignProjectEmployee] = useState<{
    id: string
    name: string
    avatar?: string
    currentAllocation: number
  } | null>(null)
  const [isAssignProjectOpen, setIsAssignProjectOpen] = useState(false)

  // Use centralized ViewModel hook - all data and actions come from here
  const vm = useManagerWorkboardVM({
    employeeId,
    accessToken
  })

  const allocationByEmployeeId = useMemo(
    () => new Map(vm.directReportsWithAllocation.map(item => [item.id, item.allocationPercent])),
    [vm.directReportsWithAllocation]
  )

  // Handler for opening assign project dialog
  const handleAssignProject = useCallback(
    (employeeId: string) => {
      const employee = vm.directReports.find(report => report.id === employeeId)
      if (employee) {
        setAssignProjectEmployee({
          id: employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          avatar: employee.pictureThumbnail,
          currentAllocation: allocationByEmployeeId.get(employeeId) ?? 0
        })
        setIsAssignProjectOpen(true)
      }
    },
    [vm.directReports, allocationByEmployeeId]
  )

  const handleAssignProjectSuccess = useCallback(() => {
    // Refresh immediately and once again after short delay
    // to account for backend write propagation.
    void vm.actions.refreshManagerDashboardData()
    globalThis.setTimeout(() => {
      void vm.actions.refreshManagerDashboardData()
    }, 1200)
  }, [vm.actions])

  const assignProjectDialog = (
    <AssignProjectDialog
      employee={assignProjectEmployee}
      open={isAssignProjectOpen}
      onOpenChange={setIsAssignProjectOpen}
      onSuccess={handleAssignProjectSuccess}
      accessToken={accessToken || ''}
    />
  )

  // NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.
  const directReportsForWorkboard = useMemo(
    () => vm.teamMembers.direct.map(report => ({ ...report, status: report.status || 'Available' })),
    [vm.teamMembers.direct]
  )
  const selectedMember = useMemo(
    () =>
      vm.selectedMemberId ? directReportsForWorkboard.find(report => report.id === vm.selectedMemberId) || null : null,
    [vm.selectedMemberId, directReportsForWorkboard]
  )

  useEffect(() => {
    const refreshDashboardData = () => {
      void vm.actions.refreshManagerDashboardData()
      globalThis.setTimeout(() => {
        void vm.actions.refreshManagerDashboardData()
      }, 1200)
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      if (customEvent.detail.resolution !== 'success') return
      refreshDashboardData()
    }

    window.addEventListener('com.newwork.process.processCompletion', handler)
    return () => window.removeEventListener('com.newwork.process.processCompletion', handler)
  }, [vm.actions])

  const mainContent = (
    <div
      className="gba:px-4 md:gba:px-6 gba:h-full gba:flex gba:flex-col gba:items-center gba:overflow-auto"
      data-testid="manager-dashboard-content"
    >
      {/* Container with responsive max-width */}
      <div className="gba:w-full gba:py-6" style={{ maxWidth: 'clamp(1200px, 90vw, 1600px)' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)' }} data-testid="manager-dashboard-header-section">
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
                      vm.userProfile?.pictureThumbnail && !vm.userProfile.pictureThumbnail.startsWith('{')
                        ? `data:image/jpeg;base64,${vm.userProfile.pictureThumbnail}`
                        : undefined
                    }
                    alt={`${vm.userProfile?.firstName || userInfo?.employeeDetails?.firstName || ''} ${vm.userProfile?.lastName || userInfo?.employeeDetails?.lastName || ''}`}
                  />
                  <AvatarFallback>
                    {`${vm.userProfile?.firstName?.[0] || userInfo?.employeeDetails?.firstName?.[0] || ''}${vm.userProfile?.lastName?.[0] || userInfo?.employeeDetails?.lastName?.[0] || ''}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive scaling for large screens */}
        <style>{String.raw`
          @media (min-width: 1024px) {
            [data-desktop-grid="2fr-1fr-main"] {
              grid-template-columns: 2fr 1fr !important;
            }
          }
          [data-layout="bottom-row-3col"] {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
          [data-layout="bottom-row-3col"] > div {
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }
          @media (min-width: 1920px) {
            [data-testid="manager-dashboard-content"] { font-size: 110%; }
          }
          @media (min-width: 2560px) {
            [data-testid="manager-dashboard-content"] { font-size: 120%; }
          }
          @media (min-width: 3840px) {
            [data-testid="manager-dashboard-content"] { font-size: 135%; }
          }
        `}</style>

        {/* MAIN LAYOUT: 2-column grid (2fr 1fr) — same as original */}
        <div
          className="gba:grid gba:grid-cols-1"
          style={{
            gap: 'clamp(1.5rem, 1.5vw, 2rem)',
            marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)',
            gridTemplateColumns: 'minmax(0, 1fr)'
          }}
          data-desktop-grid="2fr-1fr-main"
        >
          {/* LEFT COLUMN: Today's Priorities + Your Team */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
            <TodaysPrioritiesSection
              items={vm.priorities.items}
              loading={vm.priorities.loading}
              counts={vm.priorities.counts}
              unallocatedMonthlyCost={vm.priorities.unallocatedMonthlyCost}
              unallocatedEmployees={vm.priorities.unallocatedEmployees}
              employeesWithoutGoals={vm.priorities.employeesWithoutGoals}
              goalsBehindData={vm.priorities.goalsBehindData}
              notClockedInEmployees={vm.priorities.notClockedInEmployees}
              accessToken={accessToken}
              currentUserId={vm.userProfile?.userId}
              onAssignProject={handleAssignProject}
            />

            <TeamAvatarsSection
              directReports={directReportsForWorkboard}
              unallocatedIds={vm.teamMembers.unallocatedIds}
              loading={vm.teamMembers.loading.directReports}
              onNavigateToTeammates={vm.actions.navigateToTeammates}
              onMemberClick={vm.actions.openMemberPanel}
            />
          </div>

          {/* RIGHT COLUMN: Team Health + Current Cycle Performance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
            <TeamHealthSection
              summary={vm.teamHealth.summary}
              employees={vm.teamHealth.employees}
              loading={vm.teamHealth.loading}
              onNavigateToEmployee={vm.actions.navigateToEmployee}
              enableAISentiment={vm.enableAISentiment}
              onToggleSentimentAnalysis={vm.actions.toggleSentimentAnalysis}
            />

            <PerformanceGrowthSection
              onTrack={vm.performanceGrowth.onTrack}
              atRisk={vm.performanceGrowth.atRisk}
              behind={vm.performanceGrowth.behind}
              completed={vm.performanceGrowth.completed}
              totalGoals={vm.performanceGrowth.totalGoals}
              averageProgress={vm.performanceGrowth.averageProgress}
              loading={vm.performanceGrowth.loading}
              onNavigateToTeamPerformance={vm.actions.navigateToTeamPerformance}
              onNavigateToAtRiskGoals={vm.actions.navigateToGoalsAtRisk}
              onNavigateToTeamPerformanceOverview={vm.actions.navigateToTeamPerformanceOverview}
            />
          </div>
        </div>

        {/* BOTTOM ROW: Secondary utility cards — 3 equal columns */}
        <div
          data-layout="bottom-row-3col"
          style={{
            display: 'flex',
            gap: 'clamp(1rem, 1.2vw, 1.5rem)',
            marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)'
          }}
        >
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <WorkCapacitySection
              utilizationPercent={vm.workCapacity.utilizationPercent}
              idleCount={vm.workCapacity.idleCount}
              loading={vm.workCapacity.loading.allocation}
              onNavigateToUnallocatedTeammates={vm.actions.navigateToUnallocatedTeammates}
            />
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <OpenPositionsSection
              openPositions={vm.workCapacity.openPositions}
              loading={vm.workCapacity.loading.positions}
              onNavigateToOpenPositions={vm.actions.navigateToOpenPositions}
            />
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <PeopleMomentsSection
              birthdays={vm.peopleMoments.birthdays}
              anniversaries={vm.peopleMoments.anniversaries}
              loading={vm.peopleMoments.loading.birthdays}
              onNavigateToInsights={vm.actions.navigateToInsights}
            />
          </div>
        </div>
      </div>

      {/* Assign Project Dialog */}
      {assignProjectDialog}

      <Toaster position="bottom-right" richColors />
    </div>
  )

  switch (vm.currentView) {
    case 'teammates':
      return (
        <>
          <TeammatesView
            directReports={vm.directReports}
            matrixTeamMembers={vm.matrixTeamMembers}
            unallocatedEmployeeIds={vm.unallocatedEmployeeIds}
            filterAbsentOnly={vm.filterAbsentOnly}
            filterUnallocatedOnly={vm.filterUnallocatedOnly}
            setFilterAbsentOnly={vm.setFilterAbsentOnly}
            setFilterUnallocatedOnly={vm.setFilterUnallocatedOnly}
            loadingDirectReports={vm.loadingDirectReports}
            loadingMatrixTeams={vm.loadingMatrixTeams}
            directReportsError={vm.directReportsError}
            matrixTeamsError={vm.matrixTeamsError}
            activeTeamTab={vm.activeTeamTab}
            setActiveTeamTab={vm.setActiveTeamTab}
            employeeId={employeeId || ''}
            accessToken={accessToken || ''}
            teamPerformance={vm.teamPerformance}
            employeeAllocations={vm.directReportsWithAllocation}
            lastFeedbackByEmployeeId={vm.lastFeedbackByEmployeeId}
            onNavigateBack={vm.handleNavigateBackToDashboard}
            onNavigateToEmployee={vm.handleNavigateToEmployee}
            onOpenMemberPanel={vm.actions.openMemberPanel}
            userOrgData={vm.userOrgData || undefined}
          />
          <MemberQuickPanel
            isOpen={vm.isMemberPanelOpen}
            onClose={vm.handleCloseMemberPanel}
            member={selectedMember}
            allocationPercent={vm.averageAllocationPercentage}
            teamPerformance={vm.teamPerformance}
            lastFeedbackDate={vm.daysSinceLastFeedback ? `${vm.daysSinceLastFeedback} days ago` : null}
            onNavigateToEmployee={vm.handleNavigateToEmployee}
            onAssignProject={handleAssignProject}
          />
          {assignProjectDialog}
        </>
      )
    case 'filtered-teammates': {
      const FilteredTeammatesViewCompat = FilteredTeammatesView as React.ComponentType<any>

      return (
        <>
          <FilteredTeammatesViewCompat
            directReports={vm.directReports}
            unallocatedEmployeeIds={vm.unallocatedEmployeeIds}
            employeeAllocations={vm.directReportsWithAllocation}
            filterAbsentOnly={vm.filterAbsentOnly}
            filterUnallocatedOnly={vm.filterUnallocatedOnly}
            loadingDirectReports={vm.loadingDirectReports}
            directReportsError={vm.directReportsError}
            onNavigateBack={vm.handleNavigateBackToDashboard}
            onNavigateToEmployee={vm.handleNavigateToEmployee}
            onAssignProject={handleAssignProject}
          />
          {assignProjectDialog}
        </>
      )
    }
    case 'team-performance-overview': {
      const tpo = vm.teamPerformanceOverview
      const db = tpo.dashboard
      return (
        <TeamPerformanceDashboard
          teamPerformance={tpo.goals.teamPerformance}
          averageGoalProgress={tpo.goals.averageProgress}
          loadingGoals={tpo.goals.loading}
          skillsMembers={tpo.skills.members}
          loadingSkills={tpo.skills.loading}
          feedbackMembers={tpo.feedback.members}
          loadingFeedback={tpo.feedback.loading}
          evaluationMembers={tpo.evaluations.members}
          teamAvgScore={tpo.evaluations.teamAvgScore}
          teamCompanyValuesAvg={tpo.evaluations.teamCompanyValuesAvg}
          teamSkillsAvg={tpo.evaluations.teamSkillsAvg}
          loadingEvaluations={tpo.evaluations.loading}
          availableCycles={tpo.evaluations.availableCycles}
          selectedCycleId={db.selectedCycleId}
          onCycleChange={db.setSelectedCycleId}
          scoreDistribution={db.scoreDistribution}
          trendSeries={db.trendSeries}
          ratingScaleLimit={db.ratingScaleLimit}
          skillGrowthRate={db.skillGrowthRate}
          changeOverall={db.changeOverall}
          changeCompanyValues={db.changeCompanyValues}
          changeSkills={db.changeSkills}
          insights={tpo.insights}
          accessToken={accessToken || ''}
          onNavigateBack={vm.handleNavigateBackToDashboard}
          onNavigateToEmployee={vm.handleNavigateToEmployee}
          onNavigateToTeamPerformance={vm.handleNavigateToTeamPerformance}
          onNavigateToTeammates={vm.handleNavigateToTeammates}
        />
      )
    }
    case 'team-performance':
      return (
        <TeamPerformanceView
          teamPerformance={vm.teamPerformance}
          totalPerformanceGoals={vm.totalPerformanceGoals}
          averageTeamProgress={vm.averageTeamProgress}
          goalsOnTrack={vm.goalsOnTrack}
          goalsAtRisk={vm.goalsAtRisk}
          goalsBehindTarget={vm.goalsBehindTarget}
          goalsAchieved={vm.goalsAchieved}
          loadingTeamPerformance={vm.loadingTeamPerformance}
          filterGoalsBehindOnly={vm.filterGoalsBehindOnly}
          initialStatusFilter={vm.initialPerformanceStatusFilter}
          feedbackSummary={vm.teamFeedbackSummary}
          skillsSummary={vm.teamSkillsSummary}
          insights={vm.currentCycleInsights}
          onNavigateBack={vm.handleNavigateBackToDashboard}
          onNavigateToEmployee={vm.handleNavigateToEmployee}
        />
      )
    case 'not-clocked-in':
      return (
        <NotClockedInView
          teamAttendance={vm.teamAttendance}
          availableEmployeeIds={vm.availableEmployeeIds}
          notClockedInCount={vm.notClockedInCount}
          loadingAttendance={vm.loadingAttendance}
          nudgeLoading={false}
          onNavigateBack={vm.handleNavigateBackToDashboard}
          onNavigateToEmployee={vm.handleNavigateToEmployee}
          onNudgeNotClockedIn={() => {}}
        />
      )
    case 'insights':
      return (
        <TeamInsightsView
          upcomingBirthdays={vm.upcomingBirthdays}
          upcomingAnniversaries={vm.upcomingAnniversaries}
          openPositions={vm.openPositions}
          fullPositions={vm.fullPositions}
          loadingBirthdays={vm.loadingBirthdays}
          loadingAnniversaries={vm.loadingAnniversaries}
          loadingOpenPositions={vm.loadingOpenPositions}
          activeInsightsTab={vm.activeInsightsTab}
          setActiveInsightsTab={vm.setActiveInsightsTab}
          accessToken={accessToken || ''}
          onNavigateBack={vm.handleNavigateBackToDashboard}
          onNavigateToEmployee={vm.handleNavigateToEmployee}
        />
      )
    case 'birthdays':
      return (
        <BirthdaysView
          upcomingBirthdays={vm.upcomingBirthdays}
          loadingBirthdays={vm.loadingBirthdays}
          accessToken={accessToken || ''}
          onNavigateBack={vm.handleNavigateBackToDashboard}
          onNavigateToEmployee={vm.handleNavigateToEmployee}
        />
      )
    case 'anniversaries':
      return (
        <AnniversariesView
          upcomingAnniversaries={vm.upcomingAnniversaries}
          loadingAnniversaries={vm.loadingAnniversaries}
          accessToken={accessToken || ''}
          onNavigateBack={vm.handleNavigateBackToDashboard}
          onNavigateToEmployee={vm.handleNavigateToEmployee}
        />
      )
    case 'open-positions':
      return (
        <OpenPositionsView
          openPositions={vm.openPositions}
          fullPositions={vm.fullPositions}
          loadingOpenPositions={vm.loadingOpenPositions}
          accessToken={accessToken || ''}
          onNavigateBack={vm.handleNavigateBackToDashboard}
        />
      )
    default:
      break
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:h-full">{mainContent}</div>

      <Sheet open={vm.isPositionSheetOpen} onOpenChange={vm.setIsPositionSheetOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:flex gba:flex-col gba:p-0">
          <div className="gba:h-10 gba:flex-shrink-0" />
          <div className="gba:flex-1 gba:overflow-y-auto">
            {vm.selectedPosition && accessToken && (
              <JobPositionDetails jobPosition={vm.selectedPosition} accessToken={accessToken} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Member Quick Panel */}
      <MemberQuickPanel
        isOpen={vm.isMemberPanelOpen}
        onClose={vm.handleCloseMemberPanel}
        member={selectedMember}
        allocationPercent={vm.averageAllocationPercentage}
        teamPerformance={vm.teamPerformance}
        lastFeedbackDate={vm.daysSinceLastFeedback ? `${vm.daysSinceLastFeedback} days ago` : null}
        onNavigateToEmployee={vm.handleNavigateToEmployee}
        onAssignProject={handleAssignProject}
      />
    </>
  )
}

export default ManagerDashboard
