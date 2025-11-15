import React from 'react'
import { SectionKpiCards, KpiCardData, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

export interface EmploymentStatistics {
  totalFte: number
  employeeCount: number
  averageTenure: string
  gapRate: number
  vacantPositions: number
  totalPositions: number
  probationRate: number
  employeesInProbation: number
  totalEmployees: number
}

interface EmploymentStatisticsProps {
  statistics: EmploymentStatistics
  isLoading: boolean
  dataTestId: string
}

const EmploymentStatistics: React.FC<EmploymentStatisticsProps> = ({ statistics, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  const kpiCards: KpiCardData[] = [
    {
      id: 'fte-employee-count',
      title: t('hr-analytics-fte-employee-count'),
      value: isLoading ? t('hr-data-filter-loading') : `${statistics.totalFte.toFixed(1)} / ${statistics.employeeCount}`,
      icon: 'users',
      iconColor: 'var(--nw-info)',
      footer: t('hr-analytics-fte-ratio')
    },
    {
      id: 'average-tenure',
      title: t('hr-analytics-average-tenure'),
      value: isLoading ? t('hr-data-filter-loading') : statistics.averageTenure,
      icon: 'calendar',
      iconColor: 'var(--nw-info)',
      footer: t('hr-analytics-company-wide-average')
    },
    {
      id: 'gap-rate',
      title: t('hr-analytics-gap-rate'),
      value: isLoading ? t('hr-data-filter-loading') : `${statistics.gapRate.toFixed(1)}%`,
      icon: 'mail',
      iconColor:
        statistics.gapRate > 15
          ? 'var(--nw-destructive)'
          : statistics.gapRate > 10
            ? 'var(--nw-warning)'
            : 'var(--nw-success)',
      footer: `${statistics.vacantPositions}/${statistics.totalPositions} ${t('hr-analytics-positions')}`
    },
    {
      id: 'probation-rate',
      title: t('hr-analytics-probation-rate'),
      value: isLoading ? t('hr-data-filter-loading') : `${statistics.probationRate.toFixed(1)}%`,
      icon: 'users',
      iconColor:
        statistics.probationRate > 20
          ? 'var(--nw-destructive)'
          : statistics.probationRate > 10
            ? 'var(--nw-warning)'
            : 'var(--nw-success)',
      footer: `${statistics.employeesInProbation}/${statistics.totalEmployees} ${t('hr-analytics-employees')}`
    }
  ]

  if (isLoading) {
    // Create loading placeholder cards
    const loadingCards: KpiCardData[] = kpiCards.map(card => ({
      ...card,
      value: 'Loading...'
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

export default EmploymentStatistics
