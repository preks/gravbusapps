import React from 'react'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon } from '@phosphor-icons/react'
import type { HeadcountStatistics } from '../../../../../hooks/useHeadcountTrendsData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface HeadcountStatisticsProps {
  statistics: HeadcountStatistics
  isLoading: boolean
  dataTestId: string
}

const HeadcountStatistics: React.FC<HeadcountStatisticsProps> = ({ statistics, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  const kpiCards: KpiCardData[] = [
    {
      id: 'monthly-hires',
      title: t('hr-analytics-monthly-hires'),
      value: statistics.monthlyHires,
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      iconColor: 'var(--nw-success)',
      footer: t('hr-analytics-new-hires-this-month')
    },
    {
      id: 'monthly-departures',
      title: t('hr-analytics-monthly-departures'),
      value: statistics.monthlyExits,
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      iconColor: 'var(--nw-destructive)',
      footer: t('hr-analytics-departures-this-month')
    },
    {
      id: 'net-change',
      title: t('hr-analytics-net-change'),
      value: statistics.netChange > 0 ? `+${statistics.netChange}` : statistics.netChange.toString(),
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      iconColor: statistics.netChange >= 0 ? 'var(--nw-success)' : 'var(--nw-destructive)',
      footer: t('hr-analytics-monthly-headcount-change')
    },
    {
      id: 'growth-rate',
      title: t('hr-analytics-growth-rate'),
      value: `${statistics.growthRate > 0 ? '+' : ''}${statistics.growthRate.toFixed(2)}%`,
      icon: <Icon icon={CalendarIcon} size="sm" decorative />,
      iconColor: statistics.growthRate >= 0 ? 'var(--nw-success)' : 'var(--nw-destructive)',
      footer: t('hr-analytics-monthly-growth-percentage')
    }
  ]

  if (isLoading) {
    // Create loading placeholder cards
    const loadingCards: KpiCardData[] = kpiCards.map(card => ({
      ...card,
      value: t('hr-data-filter-loading')
    }))

    return (
      <div data-testid={`${dataTestId}-statistics`}>
        <SectionKpiCards cards={loadingCards} />
      </div>
    )
  }

  return (
    <div data-testid={`${dataTestId}-statistics`}>
      <SectionKpiCards cards={kpiCards} />
    </div>
  )
}

export default HeadcountStatistics
