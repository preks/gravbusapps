import React from 'react'
import { Card, ItemMedia } from '@newwork/nw-design-system'
import { Briefcase, Clock, TrendUp, Warning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { KpiCardData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface KpiCardsProps {
  kpis: KpiCardData
  prefixDataTestId?: string
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, prefixDataTestId = 'kpi-cards' }) => {
  // Primary row cards (4 columns)
  const primaryCards = [
    {
      id: 'total-projects',
      icon: Briefcase,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.kpi_total_projects', 'Total Projects'),
      value: kpis.totalProjects.toString(),
      subtitle: `${kpis.activeProjects} active`
    },
    {
      id: 'budget-consumption',
      icon: TrendUp,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.kpi_avg_budget', 'Avg Budget Used'),
      value: `${kpis.averageBudgetConsumption}%`,
      subtitle: `${kpis.totalLoggedHours.toLocaleString()}h / ${kpis.totalBudgetHours.toLocaleString()}h`
    },
    {
      id: 'on-track',
      icon: CheckCircle,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.kpi_on_track', 'On Track'),
      value: kpis.projectsOnTrack.toString(),
      subtitle: 'Projects progressing well'
    },
    {
      id: 'at-risk',
      icon: Warning,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.kpi_at_risk', 'At Risk'),
      value: kpis.projectsAtRisk.toString(),
      subtitle: 'Need attention'
    }
  ]

  // Secondary row cards (2 columns)
  const secondaryCards = [
    {
      id: 'over-budget',
      icon: XCircle,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.kpi_over_budget', 'Over Budget'),
      value: kpis.projectsOverBudget.toString(),
      subtitle: 'Exceeded budget'
    },
    {
      id: 'hours-logged',
      icon: Clock,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.kpi_hours_logged', 'Hours Logged'),
      value: kpis.totalLoggedHours.toLocaleString(),
      subtitle: `${kpis.totalBudgetHours.toLocaleString()}h budgeted`
    }
  ]

  const renderCard = (card: (typeof primaryCards)[0]) => (
    <Card key={card.id} className="gba:p-6 gba:gap-0" data-testid={`${prefixDataTestId}-${card.id}`}>
      <div className="gba:flex gba:items-start gba:justify-between">
        <div className="gba:text-base gba:font-semibold">{card.label}</div>
        <ItemMedia variant="icon" icon={card.icon} iconVariant="decorative" />
      </div>
      <div className="gba:text-4xl gba:font-bold">{card.value}</div>
      {card.subtitle && <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{card.subtitle}</div>}
    </Card>
  )

  return (
    <div data-testid={prefixDataTestId}>
      {/* Primary row: 4 columns */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-4">{primaryCards.map(renderCard)}</div>

      {/* Secondary row: 2 columns */}
      <div className="gba:mt-4 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {secondaryCards.map(renderCard)}
      </div>
    </div>
  )
}
