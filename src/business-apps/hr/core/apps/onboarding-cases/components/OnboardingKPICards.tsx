/**
 * Onboarding KPI Cards
 *
 * Custom KPI cards component for the onboarding dashboard.
 * Shows onboarding-specific metrics instead of generic case metrics.
 */

import React, { useMemo } from 'react'
import { Card, CardContent, cn } from '@newwork/nw-design-system'
import { UserPlus, Users, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { OnboardingKPICardsProps } from '../types'

interface KPICardData {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

const KPICard: React.FC<KPICardData> = ({ title, value, icon: Icon, trend, description, variant = 'default' }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  const variantStyles = {
    default: 'gba:bg-background gba:border gba:border-border',
    success: 'gba:bg-green-50 gba:border gba:border-green-200',
    warning: 'gba:bg-amber-50 gba:border gba:border-amber-200',
    destructive: 'gba:bg-red-50 gba:border gba:border-red-200'
  }

  const iconStyles = {
    default: 'gba:text-primary gba:bg-primary/10',
    success: 'gba:text-green-600 gba:bg-green-100',
    warning: 'gba:text-amber-600 gba:bg-amber-100',
    destructive: 'gba:text-red-600 gba:bg-red-100'
  }

  const trendStyles = {
    up: 'gba:text-green-600',
    down: 'gba:text-red-600',
    neutral: 'gba:text-muted-foreground'
  }

  return (
    <Card className={cn('gba:rounded-lg', variantStyles[variant])}>
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex-1">
            <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              {title}
            </p>
            <div className="gba:flex gba:items-baseline gba:gap-2 gba:mt-1">
              <p className="gba:text-2xl gba:font-bold">{value}</p>
              {trend && <TrendIcon className={cn('gba:h-4 gba:w-4', trendStyles[trend])} />}
            </div>
            {description && <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{description}</p>}
          </div>
          <div className={cn('gba:p-2 gba:rounded-lg', iconStyles[variant])}>
            <Icon className="gba:h-5 gba:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const OnboardingKPICards: React.FC<OnboardingKPICardsProps> = ({ analytics, isLoading }) => {
  // Calculate onboarding-specific metrics from analytics
  const metrics = useMemo(() => {
    if (!analytics) {
      return {
        pendingStarts: 0,
        currentlyOnboarding: 0,
        completedThisMonth: 0,
        averageDays: 0,
        overdueCount: 0
      }
    }

    return {
      pendingStarts: analytics.statusDistribution?.open || 0,
      currentlyOnboarding: analytics.statusDistribution?.in_progress || 0,
      completedThisMonth: analytics.completedCases || 0,
      averageDays: analytics.averageCompletionTime || 0,
      overdueCount: analytics.casesRequiringAttention || 0
    }
  }, [analytics])

  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-5 gba:gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="gba:animate-pulse">
            <CardContent className="gba:p-4 gba:h-24">
              <div className="gba:bg-muted gba:h-4 gba:w-24 gba:rounded gba:mb-2" />
              <div className="gba:bg-muted gba:h-8 gba:w-16 gba:rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const kpiData: KPICardData[] = [
    {
      title: 'Pending Starts',
      value: metrics.pendingStarts,
      icon: UserPlus,
      trend: 'neutral',
      description: 'Starting soon',
      variant: 'default'
    },
    {
      title: 'Currently Onboarding',
      value: metrics.currentlyOnboarding,
      icon: Users,
      trend: metrics.currentlyOnboarding > 0 ? 'up' : 'neutral',
      description: 'In progress',
      variant: 'default'
    },
    {
      title: 'Completed This Month',
      value: metrics.completedThisMonth,
      icon: CheckCircle,
      trend: 'up',
      description: 'Successfully onboarded',
      variant: 'success'
    },
    {
      title: 'Avg. Onboarding Time',
      value: metrics.averageDays > 0 ? `${metrics.averageDays}d` : '-',
      icon: Clock,
      trend: 'neutral',
      description: 'Days to complete',
      variant: 'default'
    },
    {
      title: 'Overdue Tasks',
      value: metrics.overdueCount,
      icon: AlertTriangle,
      trend: metrics.overdueCount > 0 ? 'down' : 'neutral',
      description: 'Needs attention',
      variant: metrics.overdueCount > 0 ? 'destructive' : 'default'
    }
  ]

  return (
    <div className="gba:grid gba:grid-cols-5 gba:gap-4">
      {kpiData.map(kpi => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  )
}

export default OnboardingKPICards
