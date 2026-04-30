import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Progress } from '@newwork/nw-design-system'
import {
  CheckCircleIcon as CheckCircle2,
  WarningIcon as AlertTriangle,
  CaretRightIcon as ChevronRight
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlightRiskSummary } from '../types/flightRisk.types'

interface TeamHealthCardProps {
  flightRiskSummary: FlightRiskSummary
  averageAllocationPercentage: number
  unallocatedCount: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  totalGoals: number
}

export const TeamHealthCard: React.FC<TeamHealthCardProps> = ({
  flightRiskSummary,
  averageAllocationPercentage,
  unallocatedCount,
  goalsOnTrack,
  goalsAtRisk,
  goalsBehindTarget,
  totalGoals
}) => {
  const getRiskLevel = (): 'low' | 'medium' | 'high' => {
    if (flightRiskSummary.criticalCount > 0) return 'high'
    if (flightRiskSummary.highRiskCount > 0) return 'medium'
    return 'low'
  }

  const riskLevel = getRiskLevel()

  const getRiskLabelAndColor = () => {
    switch (riskLevel) {
      case 'high':
        return {
          label: getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high', 'High'),
          variant: 'destructive' as const,
          icon: <AlertTriangle size={16} />
        }
      case 'medium':
        return {
          label: getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.medium', 'Medium'),
          variant: 'warning' as const,
          icon: <AlertTriangle size={16} />
        }
      default:
        return {
          label: getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.low', 'Low'),
          variant: 'success' as const,
          icon: <CheckCircle2 size={16} />
        }
    }
  }

  const riskInfo = getRiskLabelAndColor()

  const drivers = []

  if (flightRiskSummary.criticalCount === 0 && flightRiskSummary.highRiskCount === 0) {
    drivers.push({
      id: 'no-disengagement',
      icon: <CheckCircle2 size={16} className="gba:text-success" />,
      text: getTranslationFromI18nKeyAndLabel(
        'master-data:hr.flight_risk.no_disengagement',
        'No disengagement signals'
      ),
      hasCheck: true
    })
  }

  if (unallocatedCount > 0) {
    drivers.push({
      id: 'idle-time',
      icon: <AlertTriangle size={16} className="gba:text-warning" />,
      text: getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high_idle_time', 'High level of idle time'),
      hasCheck: false
    })
  }

  if (goalsOnTrack >= 3) {
    drivers.push({
      id: 'promotions',
      icon: <CheckCircle2 size={16} className="gba:text-success" />,
      text: getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.recent_promotions', 'Recent promotions: 3'),
      hasCheck: true
    })
  }

  return (
    <Card data-testid="team-health-card">
      <CardHeader>
        <CardTitle className="gba:text-base gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_health', 'Team Health')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-6">
        {/* Retention Risk */}
        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-success/10">
                {riskInfo.icon}
              </span>
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.retention_risk', 'Retention Risk')}:
              </span>
              <Badge variant={riskInfo.variant} size="sm">
                {riskInfo.label}
              </Badge>
            </div>
            <button
              type="button"
              className="gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:bg-transparent gba:border-0 gba:cursor-pointer gba:p-0"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="gba:pl-10 gba:space-y-1">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.drivers', 'Drivers')}:
            </div>
            {drivers.map(driver => (
              <div key={driver.id} className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-foreground">
                {driver.icon}
                {driver.hasCheck && <CheckCircle2 size={14} className="gba:text-success" />}
                <span>{driver.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Work & Capacity - Capacity Utilization */}
        <div className="gba:space-y-3 gba:pt-4 gba:border-t gba:border-border">
          <div className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.work_capacity', 'Work & Capacity')}
          </div>

          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-baseline gba:justify-between">
              <span className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.capacity_utilization',
                  'Capacity Utilization'
                )}
              </span>
              <div className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:text-2xl gba:font-bold gba:text-foreground">{averageAllocationPercentage}%</span>
              </div>
            </div>

            <Progress value={averageAllocationPercentage} className="gba:h-2" />

            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
              <span>
                {unallocatedCount > 0
                  ? `${unallocatedCount} people idle`
                  : getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.all_allocated',
                      'All allocated'
                    )}
              </span>
              <button
                type="button"
                className="gba:text-primary gba:bg-transparent gba:border-0 gba:cursor-pointer gba:p-0 gba:flex gba:items-center gba:gap-1"
              >
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.request_work', 'Request work')}
              </button>
            </div>
          </div>
        </div>

        {/* Performance & Growth - Goals Progress */}
        <div className="gba:space-y-3 gba:pt-4 gba:border-t gba:border-border">
          <div className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.performance_growth',
              'Performance & Growth'
            )}
          </div>

          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-baseline gba:justify-between">
              <span className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.goals_progress', 'Goals Progress')}
              </span>
            </div>

            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <CheckCircle2 size={16} className="gba:text-success" />
                <span className="gba:text-xs gba:text-foreground">
                  <span className="gba:font-medium">{goalsOnTrack}</span>{' '}
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_track', 'on track')}
                </span>
                <div className="gba:ml-auto">
                  <Progress
                    value={totalGoals > 0 ? (goalsOnTrack / totalGoals) * 100 : 0}
                    className="gba:h-2 gba:w-16"
                  />
                </div>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <AlertTriangle size={16} className="gba:text-warning" />
                <span className="gba:text-xs gba:text-foreground">
                  <span className="gba:font-medium">{goalsAtRisk}</span>{' '}
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.at_risk', 'at risk')}
                </span>
                <div className="gba:ml-auto">
                  <Progress
                    value={totalGoals > 0 ? (goalsAtRisk / totalGoals) * 100 : 0}
                    className="gba:h-2 gba:w-16"
                  />
                </div>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <AlertTriangle size={16} className="gba:text-destructive" />
                <span className="gba:text-xs gba:text-foreground">
                  <span className="gba:font-medium">{goalsBehindTarget}</span>{' '}
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.behind', 'behind')}
                </span>
                <div className="gba:ml-auto">
                  <Progress
                    value={totalGoals > 0 ? (goalsBehindTarget / totalGoals) * 100 : 0}
                    className="gba:h-2 gba:w-16"
                  />
                </div>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:pt-2">
              <button
                type="button"
                className="gba:text-primary gba:bg-transparent gba:border-0 gba:cursor-pointer gba:p-0 gba:flex gba:items-center gba:gap-1"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.review_at_risk_goals',
                  'Review at-risk goals'
                )}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
