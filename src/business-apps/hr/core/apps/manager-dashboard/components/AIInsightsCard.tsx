import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Sparkle, CaretRight as CaretRightIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamAnniversary } from '../hooks/useTeamAnniversaries'

interface AIInsightItem {
  id: number
  text: string
  type: string
}

export interface AIInsightsCardProps {
  loadingAI: boolean
  aiInsightItems: AIInsightItem[]
  onLeaveCount: number
  sickLeavesCount: number
  unallocatedCount: number
  employeesWithoutGoals: number
  goalsBehindTarget: number
  notClockedInCount: number
  remoteCount: number
  hasFeedbackRecently: boolean
  daysSinceLastFeedback: number | null
  directReportsCount: number
  upcomingAnniversaries: TeamAnniversary[]
  onNavigateToAbsentTeammates: () => void
  onNavigateToUnallocatedTeammates: () => void
  onNavigateToTeamPerformance: () => void
  onNavigateToNotClockedIn: () => void
  onNavigateToInsights: (tab: 'anniversaries') => void
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  loadingAI,
  aiInsightItems,
  onLeaveCount,
  sickLeavesCount,
  unallocatedCount,
  employeesWithoutGoals,
  goalsBehindTarget,
  notClockedInCount,
  remoteCount,
  hasFeedbackRecently,
  daysSinceLastFeedback,
  directReportsCount,
  upcomingAnniversaries,
  onNavigateToAbsentTeammates,
  onNavigateToUnallocatedTeammates,
  onNavigateToTeamPerformance,
  onNavigateToNotClockedIn,
  onNavigateToInsights
}) => {
  return (
    <Card className="gba:lg:col-span-2" data-testid="manager-dashboard-ai-says-card">
      <CardContent className="gba:p-5">
        <div className="gba:flex gba:items-start gba:gap-4">
          {/* Orange circle with Sparkle icon - matching EveryAI platform icon */}
          <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-warning gba:flex-shrink-0">
            <Sparkle size={24} weight="fill" className="gba:text-warning-foreground" />
          </span>
          <div className="gba:flex-1">
            {/* Header with gradient text - matching InterventionsTable design */}
            <div className="gba:text-lg gba:font-semibold gba:mb-2">
              <span>NEWWORK </span>
              <span className="gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success gba:bg-clip-text gba:text-transparent">
                EveryAI{' '}
              </span>
              <span className="gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success gba:bg-clip-text gba:text-transparent">
                Assistant
              </span>
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.every_ai_noticed',
                  ' noticed data that need your attention!'
                )}
              </span>
            </div>

            {loadingAI ? (
              <div className="gba:space-y-2">
                <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-3/4" />
                <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-2/3" />
              </div>
            ) : aiInsightItems.length > 0 ? (
              <ul className="gba:space-y-1.5">
                {aiInsightItems.map(item => (
                  <li key={item.id} className="gba:flex gba:items-start gba:gap-2">
                    <span
                      className={`gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 ${
                        item.type === 'warning'
                          ? 'gba:bg-destructive'
                          : item.type === 'success'
                            ? 'gba:bg-success'
                            : 'gba:bg-primary'
                      }`}
                    />
                    <span className="gba:text-sm gba:text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="gba:space-y-1.5">
                <li className="gba:flex gba:items-start gba:gap-2">
                  <span
                    className={`gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 ${onLeaveCount > 0 ? 'gba:bg-warning' : 'gba:bg-success'}`}
                  />
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    {onLeaveCount > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={onNavigateToAbsentTeammates}
                          className="gba:text-sm gba:text-primary gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
                          data-testid="manager-dashboard-ai-absent-link"
                        >
                          {`${onLeaveCount} team ${onLeaveCount === 1 ? 'member is' : 'members are'} out of office today`}
                          <CaretRightIcon size={14} className="gba:flex-shrink-0" />
                        </button>
                        {sickLeavesCount > 0 && (
                          <span className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:pl-2 gba:border-l-2 gba:border-destructive">
                            {`Out of which ${sickLeavesCount} ${sickLeavesCount === 1 ? 'is' : 'are'} on sick leave`}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="gba:text-sm gba:text-foreground">
                        {`Your team is 100% available today (${directReportsCount}/${directReportsCount})`}
                      </span>
                    )}
                  </div>
                </li>
                {unallocatedCount > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-warning" />
                    <button
                      type="button"
                      onClick={onNavigateToUnallocatedTeammates}
                      className="gba:text-sm gba:text-primary gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
                      data-testid="manager-dashboard-ai-unallocated-link"
                    >
                      {`${unallocatedCount} team ${unallocatedCount === 1 ? 'member is' : 'members are'} not allocated to projects`}
                      <CaretRightIcon size={14} className="gba:flex-shrink-0" />
                    </button>
                  </li>
                )}
                {employeesWithoutGoals > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-warning" />
                    <button
                      type="button"
                      onClick={onNavigateToTeamPerformance}
                      className="gba:text-sm gba:text-primary gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
                      data-testid="manager-dashboard-ai-no-goals-link"
                    >
                      {`${employeesWithoutGoals} team ${employeesWithoutGoals === 1 ? 'member has' : 'members have'} no performance goals set`}
                      <CaretRightIcon size={14} className="gba:flex-shrink-0" />
                    </button>
                  </li>
                )}
                {goalsBehindTarget > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-destructive" />
                    <button
                      type="button"
                      onClick={onNavigateToTeamPerformance}
                      className="gba:text-sm gba:text-primary gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
                      data-testid="manager-dashboard-ai-goals-behind-link"
                    >
                      {`${goalsBehindTarget} performance ${goalsBehindTarget === 1 ? 'goal is' : 'goals are'} behind target`}
                      <CaretRightIcon size={14} className="gba:flex-shrink-0" />
                    </button>
                  </li>
                )}
                {notClockedInCount > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-info" />
                    <button
                      type="button"
                      onClick={onNavigateToNotClockedIn}
                      className="gba:text-sm gba:text-primary gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
                      data-testid="manager-dashboard-ai-not-clocked-in-link"
                    >
                      {`${notClockedInCount} available team ${notClockedInCount === 1 ? 'member has' : 'members have'} not clocked in yet`}
                      <CaretRightIcon size={14} className="gba:flex-shrink-0" />
                    </button>
                  </li>
                )}
                {remoteCount > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-info" />
                    <span className="gba:text-sm gba:text-foreground">
                      {`${remoteCount} team ${remoteCount === 1 ? 'member is' : 'members are'} working remotely today`}
                    </span>
                  </li>
                )}
                {!hasFeedbackRecently && directReportsCount > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-warning" />
                    <span className="gba:text-sm gba:text-foreground">
                      {daysSinceLastFeedback !== null
                        ? `You haven't given feedback to any team member in the last ${daysSinceLastFeedback} days`
                        : `You haven't given feedback to any team member yet`}
                    </span>
                  </li>
                )}
                {upcomingAnniversaries.length > 0 && (
                  <li className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-primary" />
                    <button
                      type="button"
                      onClick={() => onNavigateToInsights('anniversaries')}
                      className="gba:text-sm gba:text-primary gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
                    >
                      {`${upcomingAnniversaries.length} ${upcomingAnniversaries.length === 1 ? 'anniversary' : 'anniversaries'} coming up this month`}
                      <CaretRightIcon size={14} className="gba:flex-shrink-0" />
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
