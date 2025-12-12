import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { Users, Cake, Trophy } from 'lucide-react'
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

const LoadingSkeleton: React.FC = () => (
  <div className="gba:space-y-2">
    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
    <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
  </div>
)

const ProgressBar: React.FC<{ percent: number; colorClass: string }> = ({ percent, colorClass }) => (
  <div className="gba:relative gba:mb-2">
    <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden">
      <div
        className={`gba:h-full gba:rounded-full gba:transition-all gba:duration-500 ${colorClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
)

const ViewDetailsLink: React.FC = () => (
  <span className="gba:text-xs gba:text-primary gba:font-normal">
    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.view_details', 'View details')} →
  </span>
)

interface MetricCardProps {
  testId: string
  title: string
  isClickable: boolean
  onClick?: () => void
  loading: boolean
  percent: number
  percentLabel: string
  progressColorClass: string
  footerLeft?: string
  footerCenter: React.ReactNode
  footerRight?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  testId,
  title,
  isClickable,
  onClick,
  loading,
  percent,
  percentLabel,
  progressColorClass,
  footerLeft = '0%',
  footerCenter,
  footerRight = '100%'
}) => (
  <Card
    data-testid={testId}
    className={isClickable ? 'gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow' : ''}
    onClick={isClickable ? onClick : undefined}
  >
    <CardHeader className="gba:pb-3">
      <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center gba:justify-between">
        {title}
        {isClickable && <ViewDetailsLink />}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
            {percent}%
            <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">{percentLabel}</span>
          </div>
          <ProgressBar percent={percent} colorClass={progressColorClass} />
          <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
            <span>{footerLeft}</span>
            <span>{footerCenter}</span>
            <span>{footerRight}</span>
          </div>
        </>
      )}
    </CardContent>
  </Card>
)

interface InsightButtonProps {
  testId: string
  icon: React.ReactNode
  loading: boolean
  text: string
  onClick: () => void
}

const InsightButton: React.FC<InsightButtonProps> = ({ testId, icon, loading, text, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
    data-testid={testId}
  >
    {icon}
    <span className="gba:text-sm gba:text-foreground">{loading ? '...' : text}</span>
  </button>
)

const getProgressColorClass = (progress: number): string => {
  if (progress >= 70) return 'gba:bg-success'
  if (progress >= 40) return 'gba:bg-warning'
  return 'gba:bg-destructive'
}

const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural)

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

  const renderGoalStatus = () => {
    const parts: React.ReactNode[] = []

    if (goalsOnTrack > 0) {
      parts.push(
        <span key="on-track" className="gba:text-success">
          {goalsOnTrack} on track
        </span>
      )
    }
    if (goalsAtRisk > 0) {
      parts.push(
        <span key="at-risk" className={parts.length > 0 ? 'gba:ml-2' : ''}>
          <span className="gba:text-warning">{goalsAtRisk} at risk</span>
        </span>
      )
    }
    if (goalsBehindTarget > 0) {
      parts.push(
        <span key="behind" className={parts.length > 0 ? 'gba:ml-2' : ''}>
          <span className="gba:text-destructive">{goalsBehindTarget} behind</span>
        </span>
      )
    }

    return <>{parts}</>
  }

  const renderPerformanceContent = () => {
    if (loadingTeamPerformance) {
      return <LoadingSkeleton />
    }

    if (totalPerformanceGoals === 0) {
      return (
        <div className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.no_performance_goals',
            'No performance goals set'
          )}
        </div>
      )
    }

    return (
      <>
        <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
          {averageTeamProgress}%
          <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.avg_progress', 'avg. progress')}
          </span>
        </div>
        <ProgressBar percent={averageTeamProgress} colorClass={getProgressColorClass(averageTeamProgress)} />
        <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
          <span>0%</span>
          <span>{renderGoalStatus()}</span>
          <span>100%</span>
        </div>
      </>
    )
  }

  return (
    <div
      className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:flex-1 gba:min-h-0"
      data-testid="manager-dashboard-cards-grid"
    >
      <div className="gba:lg:col-span-2 gba:space-y-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          <MetricCard
            testId="manager-dashboard-team-availability-card"
            title={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.team_availability',
              'Team Availability'
            )}
            isClickable={onLeaveCount > 0}
            onClick={onNavigateToAbsentTeammates}
            loading={loadingAvailability}
            percent={availablePercent}
            percentLabel={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'available')}
            progressColorClass="gba:bg-success"
            footerCenter={
              <>
                {onLeavePercent}%{' '}
                {getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'on leave')}
              </>
            }
          />

          <MetricCard
            testId="manager-dashboard-project-allocation-card"
            title={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.project_allocation',
              'Team Project Allocation'
            )}
            isClickable={unallocatedCount > 0}
            onClick={onNavigateToUnallocatedTeammates}
            loading={loadingProjectAllocation}
            percent={averageAllocationPercentage}
            percentLabel={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.avg_allocation',
              'avg. allocation'
            )}
            progressColorClass="gba:bg-primary"
            footerCenter={unallocatedCount > 0 ? `${unallocatedCount} not allocated` : 'all allocated'}
          />
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
              {totalPerformanceGoals > 0 && <ViewDetailsLink />}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderPerformanceContent()}</CardContent>
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
              <InsightButton
                testId="manager-dashboard-insights-birthdays"
                icon={<Cake size={20} className="gba:text-muted-foreground" />}
                loading={loadingBirthdays}
                text={`${upcomingBirthdays.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'birthday')}${pluralize(upcomingBirthdays.length, '', 's')} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.this_month', 'this month')}`}
                onClick={() => onNavigateToInsights('birthdays')}
              />

              <InsightButton
                testId="manager-dashboard-insights-anniversaries"
                icon={<Trophy size={20} className="gba:text-muted-foreground" />}
                loading={loadingAnniversaries}
                text={`${upcomingAnniversaries.length} ${pluralize(upcomingAnniversaries.length, getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'anniversary'), getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.anniversaries', 'anniversaries'))} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.this_month', 'this month')}`}
                onClick={() => onNavigateToInsights('anniversaries')}
              />

              <InsightButton
                testId="manager-dashboard-insights-open-positions"
                icon={<Users size={20} className="gba:text-muted-foreground" />}
                loading={loadingOpenPositions}
                text={`${openPositions.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.open_position', 'open position')}${pluralize(openPositions.length, '', 's')}`}
                onClick={() => onNavigateToInsights('open-positions')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
