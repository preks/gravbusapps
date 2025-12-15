import React, { useMemo } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Sparkles, ChevronRight } from 'lucide-react'
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

type InsightColor = 'warning' | 'success' | 'destructive' | 'info' | 'primary'

interface InsightItemConfig {
  id: string
  color: InsightColor
  text: string
  subText?: string
  onClick?: () => void
  testId?: string
}

const colorClasses: Record<InsightColor, string> = {
  warning: 'gba:bg-warning',
  success: 'gba:bg-success',
  destructive: 'gba:bg-destructive',
  info: 'gba:bg-info',
  primary: 'gba:bg-primary'
}

const InsightBullet: React.FC<{ color: InsightColor }> = ({ color }) => (
  <span className={`gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 ${colorClasses[color]}`} />
)

const InsightLink: React.FC<{ onClick: () => void; testId?: string; children: React.ReactNode }> = ({
  onClick,
  testId,
  children
}) => (
  <button
    type="button"
    onClick={onClick}
    className="gba:text-sm gba:text-primary gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1 gba:-mx-1 hover:gba:bg-muted/50 gba:transition-colors"
    data-testid={testId}
  >
    {children}
    <ChevronRight size={14} className="gba:flex-shrink-0" />
  </button>
)

const InsightText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="gba:text-sm gba:text-foreground">{children}</span>
)

const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural)

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
  const insights = useMemo((): InsightItemConfig[] => {
    const items: InsightItemConfig[] = []

    items.push({
      id: 'availability',
      color: onLeaveCount > 0 ? 'warning' : 'success',
      text:
        onLeaveCount > 0
          ? `${onLeaveCount} team ${pluralize(onLeaveCount, 'member is', 'members are')} out of office today`
          : `Your team is 100% available today (${directReportsCount}/${directReportsCount})`,
      subText:
        onLeaveCount > 0 && sickLeavesCount > 0
          ? `Out of which ${sickLeavesCount} ${pluralize(sickLeavesCount, 'is', 'are')} on sick leave`
          : undefined,
      onClick: onLeaveCount > 0 ? onNavigateToAbsentTeammates : undefined,
      testId: onLeaveCount > 0 ? 'manager-dashboard-ai-absent-link' : undefined
    })

    if (unallocatedCount > 0) {
      items.push({
        id: 'unallocated',
        color: 'warning',
        text: `${unallocatedCount} team ${pluralize(unallocatedCount, 'member is', 'members are')} not allocated to projects`,
        onClick: onNavigateToUnallocatedTeammates,
        testId: 'manager-dashboard-ai-unallocated-link'
      })
    }

    if (employeesWithoutGoals > 0) {
      items.push({
        id: 'no-goals',
        color: 'warning',
        text: `${employeesWithoutGoals} team ${pluralize(employeesWithoutGoals, 'member has', 'members have')} no performance goals set`,
        onClick: onNavigateToTeamPerformance,
        testId: 'manager-dashboard-ai-no-goals-link'
      })
    }

    if (goalsBehindTarget > 0) {
      items.push({
        id: 'goals-behind',
        color: 'destructive',
        text: `${goalsBehindTarget} performance ${pluralize(goalsBehindTarget, 'goal is', 'goals are')} behind target`,
        onClick: onNavigateToTeamPerformance,
        testId: 'manager-dashboard-ai-goals-behind-link'
      })
    }

    if (notClockedInCount > 0) {
      items.push({
        id: 'not-clocked-in',
        color: 'info',
        text: `${notClockedInCount} available team ${pluralize(notClockedInCount, 'member has', 'members have')} not clocked in yet`,
        onClick: onNavigateToNotClockedIn,
        testId: 'manager-dashboard-ai-not-clocked-in-link'
      })
    }

    if (remoteCount > 0) {
      items.push({
        id: 'remote',
        color: 'info',
        text: `${remoteCount} team ${pluralize(remoteCount, 'member is', 'members are')} working remotely today`
      })
    }

    if (!hasFeedbackRecently && directReportsCount > 0) {
      items.push({
        id: 'feedback',
        color: 'warning',
        text:
          daysSinceLastFeedback === null
            ? `You haven't given feedback to any team member yet`
            : `You haven't given feedback to any team member in the last ${daysSinceLastFeedback} days`
      })
    }

    if (upcomingAnniversaries.length > 0) {
      items.push({
        id: 'anniversaries',
        color: 'primary',
        text: `${upcomingAnniversaries.length} ${pluralize(upcomingAnniversaries.length, 'anniversary', 'anniversaries')} coming up this month`,
        onClick: () => onNavigateToInsights('anniversaries')
      })
    }

    return items
  }, [
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
  ])

  const renderInsightItem = (item: InsightItemConfig) => (
    <li key={item.id} className="gba:flex gba:items-start gba:gap-2">
      <InsightBullet color={item.color} />
      <div className="gba:flex gba:flex-col gba:gap-1">
        {item.onClick ? (
          <InsightLink onClick={item.onClick} testId={item.testId}>
            {item.text}
          </InsightLink>
        ) : (
          <InsightText>{item.text}</InsightText>
        )}
        {item.subText && (
          <span className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:pl-2 gba:border-l-2 gba:border-destructive">
            {item.subText}
          </span>
        )}
      </div>
    </li>
  )

  const renderAIInsightItem = (item: AIInsightItem) => {
    const color: InsightColor =
      item.type === 'warning' ? 'destructive' : item.type === 'success' ? 'success' : 'primary'
    return (
      <li key={item.id} className="gba:flex gba:items-start gba:gap-2">
        <InsightBullet color={color} />
        <InsightText>{item.text}</InsightText>
      </li>
    )
  }

  const renderContent = () => {
    if (loadingAI) {
      return (
        <div className="gba:space-y-2">
          <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-3/4" />
          <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-2/3" />
        </div>
      )
    }

    if (aiInsightItems.length > 0) {
      return <ul className="gba:space-y-1.5">{aiInsightItems.map(renderAIInsightItem)}</ul>
    }

    return <ul className="gba:space-y-1.5">{insights.map(renderInsightItem)}</ul>
  }

  return (
    <Card className="gba:lg:col-span-2" data-testid="manager-dashboard-ai-says-card">
      <CardContent className="gba:p-5">
        <div className="gba:flex gba:items-start gba:gap-4">
          <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-warning gba:flex-shrink-0">
            <Sparkles size={24} className="gba:text-warning-foreground" />
          </span>
          <div className="gba:flex-1">
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
            {renderContent()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
