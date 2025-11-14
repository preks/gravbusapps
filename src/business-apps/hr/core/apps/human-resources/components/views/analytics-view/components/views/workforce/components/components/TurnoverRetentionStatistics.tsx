import React from 'react'
import { SectionKpiCards, KpiCardData, useTranslation } from '@newwork/nw-design-system'
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
      id: 'voluntary-turnover',
      title: t('hr-analytics-voluntary-turnover-rate'),
      value: statistics.currentTurnoverRate
        ? `${statistics.currentTurnoverRate.toFixed(1)}%`
        : t('hr-analytics-not-available'),
      icon: 'calendar',
      footer: t('hr-analytics-current-month-rate')
    },
    {
      id: 'average-tenure',
      title: t('hr-analytics-average-tenure'),
      value: statistics.averageTenure || t('hr-analytics-not-available'),
      icon: 'users',
      footer: t('hr-analytics-company-wide-average')
    },
    {
      id: 'at-risk-departments',
      title: t('hr-analytics-at-risk-departments'),
      value: statistics.atRiskDepartments,
      icon: 'mail',
      footer: t('hr-analytics-below-retention-target', { target: statistics.retentionTarget })
    },
    {
      id: 'retention-target',
      title: t('hr-analytics-target-retention'),
      value: `${statistics.retentionTarget}%`,
      icon: 'users',
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
