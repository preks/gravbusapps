import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { AlertTriangle, ChevronRight, Clock, Target, Sparkles } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TodaysPrioritiesProps {
  unallocatedCount: number
  employeesWithoutGoals: number
  goalsBehindTarget: number
  notClockedInCount: number
  onNavigateToUnallocatedTeammates: () => void
  onNavigateToTeamPerformance: () => void
  onNavigateToNotClockedIn: () => void
}

interface PriorityItem {
  id: string
  icon: React.ReactNode
  title: string
  description?: string
  action?: string
  variant: 'destructive' | 'warning' | 'success' | 'default'
  onClick?: () => void
}

const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural)

export const TodaysPriorities: React.FC<TodaysPrioritiesProps> = ({
  unallocatedCount,
  employeesWithoutGoals,
  goalsBehindTarget,
  notClockedInCount,
  onNavigateToUnallocatedTeammates,
  onNavigateToTeamPerformance,
  onNavigateToNotClockedIn
}) => {
  const priorities = useMemo((): PriorityItem[] => {
    const items: PriorityItem[] = []

    // AI Assistant priority
    items.push({
      id: 'ai-assistant',
      icon: <Sparkles size={20} className="gba:text-warning-foreground" />,
      title: 'NEWWORK EveryAI Assistant',
      variant: 'default',
      action: undefined
    })

    // Unallocated team members
    if (unallocatedCount > 0) {
      items.push({
        id: 'unallocated',
        icon: <AlertTriangle size={20} className="gba:text-destructive-foreground" />,
        title: `${unallocatedCount} team ${pluralize(unallocatedCount, 'member is', 'members are')} unallocated`,
        description: `Estimated cost: €${Math.round(unallocatedCount * 4.42)}/day`,
        action: 'Assign project',
        variant: 'destructive',
        onClick: onNavigateToUnallocatedTeammates
      })
    }

    // No performance goals
    if (employeesWithoutGoals > 0) {
      items.push({
        id: 'no-goals',
        icon: <Target size={20} className="gba:text-warning-foreground" />,
        title: `${employeesWithoutGoals} team ${pluralize(employeesWithoutGoals, 'member has', 'members have')} no performance goals`,
        description: 'Set goals by the end of the week',
        action: 'Set goals',
        variant: 'warning',
        onClick: onNavigateToTeamPerformance
      })
    }

    // Goals behind target
    if (goalsBehindTarget > 0) {
      items.push({
        id: 'goals-behind',
        icon: <Target size={20} className="gba:text-warning-foreground" />,
        title: `${goalsBehindTarget} ${pluralize(goalsBehindTarget, 'goal is', 'goals are')} behind target`,
        description: 'Estimated trend after on saaaty',
        action: 'Review blockers',
        variant: 'warning',
        onClick: onNavigateToTeamPerformance
      })
    }

    // Not clocked in
    if (notClockedInCount > 0) {
      items.push({
        id: 'not-clocked-in',
        icon: <Clock size={20} className="gba:text-info-foreground" />,
        title: `${notClockedInCount} team ${pluralize(notClockedInCount, 'member has', 'members have')} not clocked in`,
        description: `Check after 10:30`,
        action: 'View timesheets',
        variant: 'default',
        onClick: onNavigateToNotClockedIn
      })
    }

    return items
  }, [
    unallocatedCount,
    employeesWithoutGoals,
    goalsBehindTarget,
    notClockedInCount,
    onNavigateToUnallocatedTeammates,
    onNavigateToTeamPerformance,
    onNavigateToNotClockedIn
  ])

  const getIconBgClass = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return 'gba:bg-destructive'
      case 'warning':
        return 'gba:bg-warning'
      case 'success':
        return 'gba:bg-success'
      default:
        return 'gba:bg-warning'
    }
  }

  return (
    <Card data-testid="todays-priorities-card">
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.todays_priorities',
              "Today's Priorities"
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gba:text-primary gba:text-xs gba:h-auto gba:p-0"
            data-testid="view-all-priorities"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View all')}
            <ChevronRight size={16} className="gba:ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {priorities.map(priority => (
          <div
            key={priority.id}
            className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border hover:gba:bg-muted/50 gba:transition-colors"
            data-testid={`priority-item-${priority.id}`}
          >
            <span
              className={`gba:inline-flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:flex-shrink-0 ${getIconBgClass(priority.variant)}`}
            >
              {priority.icon}
            </span>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">{priority.title}</div>
              {priority.description && (
                <div className="gba:text-xs gba:text-muted-foreground">{priority.description}</div>
              )}
            </div>
            {priority.action && priority.onClick && (
              <Button
                variant="default"
                size="sm"
                onClick={priority.onClick}
                className="gba:flex-shrink-0"
                data-testid={`priority-action-${priority.id}`}
              >
                {priority.action}
                <ChevronRight size={14} className="gba:ml-1" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
