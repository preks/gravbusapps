import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { UsersIcon, CakeIcon, TrophyIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type InsightsTab = 'birthdays' | 'anniversaries' | 'open-positions'

interface DashboardCardsProps {
  directReportsCount: number
  onLeaveCount: number
  loadingAvailability: boolean
  averageAllocationPercentage: number
  unallocatedCount: number
  loadingProjectAllocation: boolean
  totalPerformanceGoals: number
  averageTeamProgress: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  loadingTeamPerformance: boolean
  upcomingBirthdays: { id: string }[]
  upcomingAnniversaries: { id: string }[]
  openPositions: { id: string }[]
  loadingBirthdays: boolean
  loadingAnniversaries: boolean
  loadingOpenPositions: boolean
  onNavigateToAbsentTeammates: () => void
  onNavigateToUnallocatedTeammates: () => void
  onNavigateToTeamPerformance: () => void
  onNavigateToInsights: (tab: InsightsTab) => void
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  directReportsCount,
  onLeaveCount,
  loadingAvailability,
  averageAllocationPercentage,
  unallocatedCount,
  loadingProjectAllocation,
  totalPerformanceGoals,
  averageTeamProgress,
  goalsOnTrack,
  goalsAtRisk,
  goalsBehindTarget,
  loadingTeamPerformance,
  upcomingBirthdays,
  upcomingAnniversaries,
  openPositions,
  loadingBirthdays,
  loadingAnniversaries,
  loadingOpenPositions,
  onNavigateToAbsentTeammates,
  onNavigateToUnallocatedTeammates,
  onNavigateToTeamPerformance,
  onNavigateToInsights
}) => {
  const totalMembers = directReportsCount || 1
  const availablePercent = Math.round(((totalMembers - onLeaveCount) / totalMembers) * 100)
  const onLeavePercent = Math.round((onLeaveCount / totalMembers) * 100)

  return (
    <div
      className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:flex-1 gba:min-h-0"
      data-testid="manager-dashboard-cards-grid"
    >
      <div className="gba:lg:col-span-2 gba:space-y-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          <Card
            data-testid="manager-dashboard-team-availability-card"
            className={onLeaveCount > 0 ? 'gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow' : ''}
            onClick={onLeaveCount > 0 ? onNavigateToAbsentTeammates : undefined}
          >
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center gba:justify-between">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.team_availability',
                  'Team Availability'
                )}
                {onLeaveCount > 0 && (
                  <span className="gba:text-xs gba:text-primary gba:font-normal">
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.view_details', 'View details')}{' '}
                    →
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAvailability ? (
                <div className="gba:space-y-2">
                  <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
                  <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
                </div>
              ) : (
                <>
                  <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
                    {availablePercent}%
                    <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'available')}
                    </span>
                  </div>
                  <div className="gba:relative gba:mb-2">
                    <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                      <div
                        className="gba:h-full gba:bg-success gba:rounded-full gba:transition-all gba:duration-500"
                        style={{ width: `${availablePercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
                    <span>0%</span>
                    <span>
                      {onLeavePercent}%{' '}
                      {getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'on leave')}
                    </span>
                    <span>100%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card
            data-testid="manager-dashboard-project-allocation-card"
            className={unallocatedCount > 0 ? 'gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow' : ''}
            onClick={unallocatedCount > 0 ? onNavigateToUnallocatedTeammates : undefined}
          >
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center gba:justify-between">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.project_allocation',
                  'Team Project Allocation'
                )}
                {unallocatedCount > 0 && (
                  <span className="gba:text-xs gba:text-primary gba:font-normal">
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.view_details', 'View details')}{' '}
                    →
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProjectAllocation ? (
                <div className="gba:space-y-2">
                  <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
                  <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
                </div>
              ) : (
                <>
                  <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
                    {averageAllocationPercentage}%
                    <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.avg_allocation',
                        'avg. allocation'
                      )}
                    </span>
                  </div>
                  <div className="gba:relative gba:mb-2">
                    <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                      <div
                        className="gba:h-full gba:bg-primary gba:rounded-full gba:transition-all gba:duration-500"
                        style={{ width: `${averageAllocationPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
                    <span>0%</span>
                    <span>{unallocatedCount > 0 ? `${unallocatedCount} not allocated` : 'all allocated'}</span>
                    <span>100%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card
          data-testid="manager-dashboard-team-performance-card"
          className={totalPerformanceGoals > 0 ? 'gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow' : ''}
          onClick={totalPerformanceGoals > 0 ? onNavigateToTeamPerformance : undefined}
        >
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center gba:justify-between">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.team_performance',
                'Team Performance'
              )}
              {totalPerformanceGoals > 0 && (
                <span className="gba:text-xs gba:text-primary gba:font-normal">
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.view_details', 'View details')} →
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTeamPerformance ? (
              <div className="gba:space-y-2">
                <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
                <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
              </div>
            ) : totalPerformanceGoals === 0 ? (
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.no_performance_goals',
                  'No performance goals set'
                )}
              </div>
            ) : (
              <>
                <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
                  {averageTeamProgress}%
                  <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.avg_progress',
                      'avg. progress'
                    )}
                  </span>
                </div>
                <div className="gba:relative gba:mb-2">
                  <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                    <div
                      className={`gba:h-full gba:rounded-full gba:transition-all gba:duration-500 ${
                        averageTeamProgress >= 70
                          ? 'gba:bg-success'
                          : averageTeamProgress >= 40
                            ? 'gba:bg-warning'
                            : 'gba:bg-destructive'
                      }`}
                      style={{ width: `${averageTeamProgress}%` }}
                    />
                  </div>
                </div>
                <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
                  <span>0%</span>
                  <span>
                    {goalsOnTrack > 0 && <span className="gba:text-success">{goalsOnTrack} on track</span>}
                    {goalsAtRisk > 0 && (
                      <span className={goalsOnTrack > 0 ? 'gba:ml-2' : ''}>
                        <span className="gba:text-warning">{goalsAtRisk} at risk</span>
                      </span>
                    )}
                    {goalsBehindTarget > 0 && (
                      <span className={goalsOnTrack > 0 || goalsAtRisk > 0 ? 'gba:ml-2' : ''}>
                        <span className="gba:text-destructive">{goalsBehindTarget} behind</span>
                      </span>
                    )}
                  </span>
                  <span>100%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="gba:space-y-6">
        <Card data-testid="manager-dashboard-team-insights-summary-card">
          <CardHeader>
            <CardTitle className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_insights', 'Team Insights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              <button
                type="button"
                onClick={() => onNavigateToInsights('birthdays')}
                className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
                data-testid="manager-dashboard-insights-birthdays"
              >
                <CakeIcon size={20} className="gba:text-muted-foreground" />
                <span className="gba:text-sm gba:text-foreground">
                  {loadingBirthdays
                    ? '...'
                    : `${upcomingBirthdays.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'birthday')}${upcomingBirthdays.length !== 1 ? 's' : ''} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.this_month', 'this month')}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToInsights('anniversaries')}
                className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
                data-testid="manager-dashboard-insights-anniversaries"
              >
                <TrophyIcon size={20} className="gba:text-muted-foreground" />
                <span className="gba:text-sm gba:text-foreground">
                  {loadingAnniversaries
                    ? '...'
                    : `${upcomingAnniversaries.length} ${upcomingAnniversaries.length === 1 ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'anniversary') : getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.anniversaries', 'anniversaries')} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.this_month', 'this month')}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToInsights('open-positions')}
                className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
                data-testid="manager-dashboard-insights-open-positions"
              >
                <UsersIcon size={20} className="gba:text-muted-foreground" />
                <span className="gba:text-sm gba:text-foreground">
                  {loadingOpenPositions
                    ? '...'
                    : `${openPositions.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.open_position', 'open position')}${openPositions.length !== 1 ? 's' : ''}`}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
