import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserIcon, CalendarIcon, UsersIcon, ChartBarIcon } from '@phosphor-icons/react'
import { PerformanceStatistics as PerformanceStatsType } from '../../../../../hooks/usePerformanceData'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface PerformanceStatisticsProps {
  statistics: PerformanceStatsType
  isLoading: boolean
  dataTestId: string
}

const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({ statistics, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  // Transform statistics into widget format
  const widgets: WidgetItem[] = [
    {
      key: 'total-workdays',
      title: t('hr-analytics-total-workdays'),
      value: statistics.totalWorkdays,
      prefix: <CalendarIcon size={16} />,
      color: 'var(--nw-info)',
      description: t('hr-analytics-total-workdays-description'),
      precision: 0
    },
    {
      key: 'average-workdays',
      title: t('hr-analytics-avg-workdays-entity'),
      value: statistics.averageWorkdaysPerEntity,
      prefix: <ChartBarIcon size={16} />,
      color: 'var(--nw-success)',
      description: t('hr-analytics-avg-workdays-entity-description'),
      precision: 1
    },
    {
      key: 'total-entities',
      title: t('hr-analytics-active-entities'),
      value: statistics.totalEntities,
      prefix: <UsersIcon size={16} />,
      color: 'var(--nw-warning)',
      description: t('hr-analytics-active-entities-description'),
      precision: 0
    },
    {
      key: 'total-employees',
      title: t('hr-analytics-total-employees'),
      value: statistics.totalEmployees,
      prefix: <UserIcon size={16} />,
      color: 'var(--nw-info)',
      description: t('hr-analytics-total-employees-description'),
      precision: 0
    }
  ]

  return (
    <div data-testid={dataTestId}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={null}
        skeletonCount={4}
        emptyText={t('hr-analytics-no-performance-stats')}
        data-testid={`${dataTestId}-widgets`}
      />
    </div>
  )
}

export default PerformanceStatistics
