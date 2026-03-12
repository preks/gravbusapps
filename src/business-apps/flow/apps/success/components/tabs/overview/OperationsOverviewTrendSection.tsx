import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { LineChart } from 'lucide-react'
import translations from '../../../_i18n'
import type { SystemTaskReliabilityData } from '../../../hooks/useSystemTaskReliability'
import { formatPercent } from '../../../utils/formatters'
import { SuccessPaginatedTableCard, type SuccessPaginatedTableColumn } from '../../shared'

interface OperationsOverviewTrendSectionProps {
  items: SystemTaskReliabilityData['timeSeries']
  isLoading?: boolean
  error?: Error | null
  'data-testid'?: string
}

export const OperationsOverviewTrendSection: React.FC<OperationsOverviewTrendSectionProps> = ({
  items,
  isLoading = false,
  error,
  'data-testid': testId = 'operations-overview-trend'
}) => {
  const { t } = useTranslation(translations)
  const columns: SuccessPaginatedTableColumn<SystemTaskReliabilityData['timeSeries'][number]>[] = [
    {
      id: 'period',
      label: t('label-period'),
      render: item => item.period
    },
    {
      id: 'failures',
      label: t('system-reliability-failures'),
      align: 'right',
      render: item => item.failedTasks
    },
    {
      id: 'timeouts',
      label: t('system-reliability-timeouts'),
      align: 'right',
      render: item => item.timedOutTasks
    },
    {
      id: 'success-rate',
      label: t('system-reliability-success-rate'),
      align: 'right',
      render: item => formatPercent(item.successRate)
    }
  ]
  const footerNote = (
    <span className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-note`}>
      {t('operations-overview-trend-note')}
    </span>
  )

  return (
    <SuccessPaginatedTableCard
      cardId="operations-trend"
      title={t('operations-overview-trend-title')}
      description={t('operations-overview-trend-description')}
      emptyDescription={t('operations-overview-trend-empty')}
      emptyIcon={<LineChart className="gba:h-8 gba:w-8" />}
      items={items}
      rowKey={item => item.period}
      columns={columns}
      isLoading={isLoading}
      error={error}
      footerNote={footerNote}
      pageSize={5}
      dialogPageSize={12}
      data-testid={testId}
    />
  )
}
