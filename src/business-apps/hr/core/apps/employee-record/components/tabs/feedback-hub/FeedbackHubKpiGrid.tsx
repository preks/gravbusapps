'use client'

import React, { useMemo } from 'react'
import { Icon, SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { ChatCircleIcon, PaperPlaneTiltIcon, UsersIcon } from '@phosphor-icons/react'
import { FeedbackHubKpis } from './types'

interface FeedbackHubKpiGridProps {
  t: (key: string, options?: Record<string, unknown>) => string
  kpis: FeedbackHubKpis
}

const trendLabel = (value: number) => (value > 0 ? `+${value}` : String(value))
const trendPositive = (value: number) => (value === 0 ? undefined : value > 0)

const FeedbackHubKpiGrid: React.FC<FeedbackHubKpiGridProps> = ({ t, kpis }) => {
  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'feedback-received',
        title: t('feedback-hub-kpi-received-title'),
        value: String(kpis.receivedTotal),
        icon: <Icon icon={ChatCircleIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        trend: {
          value: trendLabel(kpis.receivedTrend),
          positive: trendPositive(kpis.receivedTrend),
          description: t('feedback-hub-kpi-trend-vs-30d')
        }
      },
      {
        id: 'feedback-given',
        title: t('feedback-hub-kpi-given-title'),
        value: String(kpis.givenTotal),
        icon: <Icon icon={PaperPlaneTiltIcon} size="sm" decorative />,
        iconColor: 'var(--nw-success)',
        trend: {
          value: trendLabel(kpis.givenTrend),
          positive: trendPositive(kpis.givenTrend),
          description: t('feedback-hub-kpi-trend-vs-30d')
        }
      },
      {
        id: 'feedback-contributors',
        title: t('feedback-hub-kpi-contributors-title'),
        value: String(kpis.distinctContributors),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-decorative)',
        trend: {
          value: trendLabel(kpis.contributorTrend),
          positive: trendPositive(kpis.contributorTrend),
          description: t('feedback-hub-kpi-trend-vs-30d')
        }
      }
    ],
    [
      kpis.receivedTotal,
      kpis.givenTotal,
      kpis.distinctContributors,
      kpis.receivedTrend,
      kpis.givenTrend,
      kpis.contributorTrend,
      t
    ]
  )

  return <SectionKpiCards cards={kpiCards} className="gba:w-full gba:md:grid-cols-3 nw:md:grid-cols-3" />
}

export default FeedbackHubKpiGrid
