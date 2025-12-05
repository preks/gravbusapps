import React from 'react'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon, EnvelopeIcon } from '@phosphor-icons/react'
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
      value: statistics.genderRatio || t('hr-analytics-not-available'),
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      iconColor: 'var(--nw-chart-1)',
      footer: t('hr-analytics-gender-distribution-balance')
    },
    {
      id: 'common-gender',
      title: t('hr-analytics-most-common-gender'),
      value: statistics.mostCommonGender || t('hr-analytics-not-available'),
      icon: <Icon icon={UsersIcon} size="sm" decorative />,
      iconColor: 'var(--nw-chart-2)',
      footer: t('hr-analytics-most-frequent-gender')
    },
    {
      id: 'average-age',
      title: t('hr-analytics-average-age'),
      value: statistics.averageAge
        ? `${Math.round(statistics.averageAge)} ${t('hr-analytics-years')}`
        : t('hr-analytics-not-available'),
      icon: <Icon icon={CalendarIcon} size="sm" decorative />,
      iconColor: 'var(--nw-chart-3)',
      footer: t('hr-analytics-average-employee-age')
    },
    {
      id: 'nationality-overview',
      title: t('hr-analytics-nationality-distribution'),
      value: statistics.mostCommonNationality || t('hr-analytics-not-available'),
      icon: <Icon icon={EnvelopeIcon} size="sm" decorative />,
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
