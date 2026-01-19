import React from 'react'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon, EnvelopeIcon } from '@phosphor-icons/react'
import type { TurnoverRetentionStatistics } from '../../../../../hooks/useTurnoverRetentionData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface TurnoverRetentionStatisticsProps {
  statistics: TurnoverRetentionStatistics
  isLoading: boolean
  dataTestId: string
}

const TurnoverRetentionStatistics: React.FC<TurnoverRetentionStatisticsProps> = ({
  statistics,
  isLoading,
  dataTestId
}) => {
  const { t } = useTranslation(hrTranslations)
  const kpiCards: KpiCardData[] = [
    {
      id: 'turnover-rate',
      title: t('hr-analytics-turnover-rate'),
      value: statistics.currentTurnoverRate
        ? `${statistics.currentTurnoverRate.toFixed(1)}%`
        : t('hr-analytics-not-available'),
      icon: <Icon icon={CalendarIcon} size="sm" decorative />,
      iconColor: statistics.turnoverChange < 0 ? 'var(--nw-success)' : 'var(--nw-warning)',
      trend: {
        value: `${statistics.turnoverChange > 0 ? '+' : ''}${statistics.turnoverChange.toFixed(1)}%`,
        positive: statistics.turnoverChange > 0 ? true : false,
        description: t('hr-analytics-vs-last-month')
      },
      footer: t('hr-analytics-current-month-rate')
    },
    {
      id: 'average-tenure',
      title: t('hr-analytics-average-tenure'),
      value: statistics.averageTenure || t('hr-analytics-not-available'),
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      footer: t('hr-analytics-company-wide-average')
    },
    {
      id: 'at-risk-departments',
      title: t('hr-analytics-at-risk-departments'),
      value: statistics.atRiskDepartments,
      icon: <Icon icon={EnvelopeIcon} size="sm" decorative />,
      footer: t('hr-analytics-below-retention-target', { target: statistics.retentionTarget })
    },
    {
      id: 'retention-target',
      title: t('hr-analytics-target-retention'),
      value: `${statistics.retentionTarget}%`,
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      footer: t('hr-analytics-company-target-retention-rate')
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

export default TurnoverRetentionStatistics
