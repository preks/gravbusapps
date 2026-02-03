import React from 'react'
import { Card, ItemMedia, useTranslation } from '@newwork/nw-design-system'
import { BriefcaseIcon, ClockIcon, TrendUpIcon, WarningIcon, CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import { KpiCardData } from '../types'
import translations from '../_i18n'

interface KpiCardsProps {
  kpis: KpiCardData
  prefixDataTestId?: string
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, prefixDataTestId = 'kpi-cards' }) => {
  const { t } = useTranslation(translations)
  // Primary row cards (4 columns)
  const primaryCards = [
    {
      id: 'total-projects',
      icon: BriefcaseIcon,
      label: t('kpi-total-projects'),
      value: kpis.totalProjects.toString(),
      subtitle: `${kpis.activeProjects} ${t('kpi-active-projects')}`
    },
    {
      id: 'budget-consumption',
      icon: TrendUpIcon,
      label: t('kpi-avg-budget-used'),
      value: `${kpis.averageBudgetConsumption}%`,
      subtitle: `${kpis.totalLoggedHours.toLocaleString()}h / ${kpis.totalBudgetHours.toLocaleString()}h`
    },
    {
      id: 'on-track',
      icon: CheckCircleIcon,
      label: t('kpi-on-track'),
      value: kpis.projectsOnTrack.toString(),
      subtitle: t('kpi-projects-progressing-well')
    },
    {
      id: 'at-risk',
      icon: WarningIcon,
      label: t('kpi-at-risk'),
      value: kpis.projectsAtRisk.toString(),
      subtitle: t('kpi-need-attention')
    }
  ]

  // Secondary row cards (2 columns)
  const secondaryCards = [
    {
      id: 'over-budget',
      icon: XCircleIcon,
      label: t('kpi-over-budget'),
      value: kpis.projectsOverBudget.toString(),
      subtitle: t('kpi-exceeded-budget')
    },
    {
      id: 'hours-logged',
      icon: ClockIcon,
      label: t('kpi-hours-logged'),
      value: kpis.totalLoggedHours.toLocaleString(),
      subtitle: t('hours-budgeted', { hours: kpis.totalBudgetHours.toLocaleString() })
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
