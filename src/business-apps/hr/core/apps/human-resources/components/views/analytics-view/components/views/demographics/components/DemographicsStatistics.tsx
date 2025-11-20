import React from 'react'
import { SectionKpiCards, KpiCardData, useTranslation } from '@newwork/nw-design-system'
import type { DemographicsStatistics } from '../../../../hooks/useDemographicsDataIntegration'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface DemographicsStatisticsProps {
  statistics: DemographicsStatistics
  isLoading: boolean
  dataTestId: string
}

const DemographicsStatistics: React.FC<DemographicsStatisticsProps> = ({ statistics, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  const kpiCards: KpiCardData[] = [
    {
      id: 'gender-diversity',
      title: t('hr-analytics-gender-diversity'),
      value: `${statistics.genderDiversity.toFixed(1)}%`,
      icon: 'users',
      iconColor: 'var(--nw-chart-1)',
      footer: t('hr-analytics-gender-distribution-balance')
    },
    {
      id: 'common-gender',
      title: t('hr-analytics-most-common-gender'),
      value: statistics.mostCommonGender || t('hr-analytics-not-available'),
      icon: 'users',
      iconColor: 'var(--nw-chart-2)',
      footer: t('hr-analytics-most-frequent-gender')
    },
    {
      id: 'average-age',
      title: t('hr-analytics-average-age'),
      value: statistics.averageAge ? `${statistics.averageAge.toFixed(1)} ${t('hr-analytics-years')}` : t('hr-analytics-not-available'),
      icon: 'calendar',
      iconColor: 'var(--nw-chart-3)',
      footer: t('hr-analytics-average-employee-age')
    },
    {
      id: 'nationality-overview',
      title: t('hr-analytics-nationality-distribution'),
      value: statistics.mostCommonNationality || t('hr-analytics-not-available'),
      icon: 'mail',
      iconColor: 'var(--nw-chart-4)',
      footer: `${t('hr-analytics-most-common')} • ${statistics.nationalityDiversity} ${t('hr-analytics-different-nationalities')}`
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

export default DemographicsStatistics
