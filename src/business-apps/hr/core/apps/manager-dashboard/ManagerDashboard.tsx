// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

'use client'

import React, { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useManagerWorkboardVM } from './hooks/useManagerWorkboardVM'
import { NotClockedInView } from './views/NotClockedInView'
import { FilteredTeammatesView } from './views/FilteredTeammatesView'
import { TeamPerformanceView } from './views/TeamPerformanceView'
import { TeamInsightsView } from './views/TeamInsightsView'
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

  // Handler for opening assign project dialog
  const handleAssignProject = useCallback(
    (employeeId: string) => {
      const employee = vm.unallocatedEmployeesWithAllocation.find(e => e.id === employeeId)
      if (employee) {
        setAssignProjectEmployee({
          id: employee.id,
          name: employee.name,
          currentAllocation: employee.allocationPercent || 0
        })
        setIsAssignProjectOpen(true)
      }
    },
    [vm.unallocatedEmployeesWithAllocation]
  )

  const handleAssignProjectSuccess = useCallback(() => {
    // The ViewModel hooks will automatically refetch data
    // Close dialog is handled by the dialog component
  }, [])

  // NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.
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

        {/* MAIN LAYOUT: 2-column grid (2fr 1fr) on desktop, stacks on mobile */}
        <div
          className="gba:grid gba:grid-cols-1"
          style={{
            gap: 'clamp(1.5rem, 1.5vw, 2rem)',
            marginBottom: 'clamp(1.5rem, 1.5vw, 2rem)',
            gridTemplateColumns: 'minmax(0, 1fr)'
          }}
          data-desktop-grid="2fr-1fr-main"
        >
          <style>{`
            @media (min-width: 1024px) {
              [data-desktop-grid="2fr-1fr-main"] {
                grid-template-columns: 2fr 1fr !important;
              }
            }
            
            /* Enhanced scaling for large screens only */
            @media (min-width: 1920px) {
              [data-testid="manager-dashboard-content"] {
                font-size: 110%;
              }
            }
            
            @media (min-width: 2560px) {
              [data-testid="manager-dashboard-content"] {
                font-size: 120%;
              }
            }
            
            @media (min-width: 3840px) {
              [data-testid="manager-dashboard-content"] {
                font-size: 135%;
              }
            }
            
            /* Responsive card spacing for smaller screens */
            @media (max-height: 800px) {
              [data-testid="manager-dashboard-content"] .gba\\:space-y-2 > * + * {
                margin-top: 0.375rem !important;
              }
              [data-testid="manager-dashboard-content"] .gba\\:space-y-3 > * + * {
                margin-top: 0.5rem !important;
              }
            }
          `}</style>

          {/* LEFT COLUMN: Today's Priorities + Your Team */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
            {/* Today's Priorities */}
            <TodaysPrioritiesSection
              items={vm.priorities.items}
              loading={vm.priorities.loading}
              counts={vm.priorities.counts}
              unallocatedDailyCost={vm.priorities.unallocatedDailyCost}
              unallocatedEmployees={vm.priorities.unallocatedEmployees}
              employeesWithoutGoals={vm.priorities.employeesWithoutGoals}
              goalsBehindData={vm.priorities.goalsBehindData}
              notClockedInEmployees={vm.priorities.notClockedInEmployees}
              accessToken={accessToken}
              currentUserId={vm.userProfile?.userId}
              onAssignProject={handleAssignProject}
            />

            {/* Your Team */}
            <TeamAvatarsSection
              directReports={vm.teamMembers.direct}
              unallocatedIds={vm.teamMembers.unallocatedIds}
              loading={vm.teamMembers.loading.directReports}
              onNavigateToTeammates={vm.actions.navigateToTeammates}
              onMemberClick={vm.actions.openMemberPanel}
            />
          </div>

          {/* RIGHT COLUMN: Team Health + 2-column grid for Performance/Work and People/Positions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}>
            {/* Team Health */}
            <TeamHealthSection
              summary={vm.teamHealth.summary}
              employees={vm.teamHealth.employees}
              loading={vm.teamHealth.loading}
              onNavigateToEmployee={vm.actions.navigateToEmployee}
              enableAISentiment={vm.enableAISentiment}
              onToggleSentimentAnalysis={vm.actions.toggleSentimentAnalysis}
            />

            {/* 2x2 Grid: Performance/Open Positions (left column) and Work/People (right column) */}
            <div
              className="gba:grid gba:grid-cols-1"
              style={{ gap: 'clamp(1.5rem, 1.5vw, 2rem)' }}
              data-desktop-grid="stacked-cards-grid"
            >
              <style>{`
                @media (min-width: 1024px) {
                  [data-desktop-grid="stacked-cards-grid"] {
                    grid-template-columns: 1fr 1fr !important;
                  }
                }
              `}</style>

              {/* LEFT COLUMN: Performance & Growth + Open Positions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.2vw, 1.75rem)' }}>
                <PerformanceGrowthSection
                  onTrack={vm.performanceGrowth.onTrack}
                  atRisk={vm.performanceGrowth.atRisk}
                  behind={vm.performanceGrowth.behind}
                  totalGoals={vm.performanceGrowth.totalGoals}
                  averageProgress={vm.performanceGrowth.averageProgress}
                  loading={vm.performanceGrowth.loading}
                  onNavigateToTeamPerformance={vm.actions.navigateToTeamPerformance}
                />
                <OpenPositionsSection
                  openPositions={vm.workCapacity.openPositions}
                  loading={vm.workCapacity.loading.openPositions}
                  onNavigateToInsights={vm.actions.navigateToInsights}
                />
              </div>

              {/* RIGHT COLUMN: Work & Capacity + People & Moments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem, 1.2vw, 1.75rem)' }}>
                <WorkCapacitySection
                  utilizationPercent={vm.workCapacity.utilizationPercent}
                  idleCount={vm.workCapacity.idleCount}
                  loading={vm.workCapacity.loading.allocation}
                  onNavigateToUnallocatedTeammates={vm.actions.navigateToUnallocatedTeammates}
                />
                <PeopleMomentsSection
                  birthdays={vm.peopleMoments.birthdays}
                  anniversaries={vm.peopleMoments.anniversaries}
                  openPositions={vm.peopleMoments.openPositions}
                  loading={vm.peopleMoments.loading.birthdays}
                  onNavigateToInsights={vm.actions.navigateToInsights}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Project Dialog */}
      <AssignProjectDialog
        employee={assignProjectEmployee}
        open={isAssignProjectOpen}
        onOpenChange={setIsAssignProjectOpen}
        onSuccess={handleAssignProjectSuccess}
        accessToken={accessToken || ''}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  )

  if (vm.currentView === 'teammates') {
    return (
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
        onNavigateBack={vm.handleNavigateBackToDashboard}
        onNavigateToEmployee={vm.handleNavigateToEmployee}
        userOrgData={vm.userOrgData || undefined}
      />
    )
  }

  if (vm.currentView === 'filtered-teammates') {
    return (
      <FilteredTeammatesView
        directReports={vm.directReports}
        unallocatedEmployeeIds={vm.unallocatedEmployeeIds}
        filterAbsentOnly={vm.filterAbsentOnly}
        filterUnallocatedOnly={vm.filterUnallocatedOnly}
        loadingDirectReports={vm.loadingDirectReports}
        directReportsError={vm.directReportsError}
        onNavigateBack={vm.handleNavigateBackToDashboard}
        onNavigateToEmployee={vm.handleNavigateToEmployee}
      />
    )
  }

  if (vm.currentView === 'team-performance') {
    return (
      <TeamPerformanceView
        teamPerformance={vm.teamPerformance}
        totalPerformanceGoals={vm.totalPerformanceGoals}
        averageTeamProgress={vm.averageTeamProgress}
        goalsOnTrack={vm.goalsOnTrack}
        goalsAtRisk={vm.goalsAtRisk}
        goalsBehindTarget={vm.goalsBehindTarget}
        loadingTeamPerformance={vm.loadingTeamPerformance}
        filterGoalsBehindOnly={vm.filterGoalsBehindOnly}
        onNavigateBack={vm.handleNavigateBackToDashboard}
        onNavigateToEmployee={vm.handleNavigateToEmployee}
      />
    )
  }

  if (vm.currentView === 'not-clocked-in') {
    return (
      <NotClockedInView
        teamAttendance={vm.teamAttendance}
        availableEmployeeIds={vm.availableEmployeeIds}
        notClockedInCount={vm.notClockedInCount}
        loadingAttendance={vm.loadingAttendance}
        onNavigateBack={vm.handleNavigateBackToDashboard}
        onNavigateToEmployee={vm.handleNavigateToEmployee}
      />
    )
  }

  if (vm.currentView === 'insights') {
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
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:h-full">{mainContent}</div>

      <Sheet open={vm.isPositionSheetOpen} onOpenChange={vm.setIsPositionSheetOpen} title="">
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
        member={vm.selectedMemberId ? vm.directReports.find(r => r.id === vm.selectedMemberId) || null : null}
        allocationPercent={vm.averageAllocationPercentage}
        teamPerformance={vm.teamPerformance}
        lastFeedbackDate={vm.daysSinceLastFeedback ? `${vm.daysSinceLastFeedback} days ago` : null}
        onNavigateToEmployee={vm.handleNavigateToEmployee}
        onAssignProject={vm.handleNavigateToUnallocatedTeammates}
      />
    </>
  )
}

export default ManagerDashboard
