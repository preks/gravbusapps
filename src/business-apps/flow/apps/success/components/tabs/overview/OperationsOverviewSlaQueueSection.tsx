import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import translations from '../../../_i18n'
import { formatDateTime, formatHoursDuration, formatPercent } from '../../../utils/formatters'
import { SuccessExpressionText, SuccessPaginatedTableCard, type SuccessPaginatedTableColumn } from '../../shared'
import type { OperationsOverviewSlaQueueItem } from './operationsOverviewUtils'

interface OperationsOverviewSlaQueueSectionProps {
  items: OperationsOverviewSlaQueueItem[]
  isLoading?: boolean
  error?: Error | null
  'data-testid'?: string
}

export const OperationsOverviewSlaQueueSection: React.FC<OperationsOverviewSlaQueueSectionProps> = ({
  items,
  isLoading = false,
  error,
  'data-testid': testId = 'operations-overview-sla-queue'
}) => {
  const { t } = useTranslation(translations)
  const columns: SuccessPaginatedTableColumn<OperationsOverviewSlaQueueItem>[] = [
    {
      id: 'flow',
      label: t('label-flow'),
      render: item => (
        <span className="gba:font-medium">
          <SuccessExpressionText value={item.flowName} fallback={t('operations-overview-value-unavailable')} />
        </span>
      )
    },
    {
      id: 'step',
      label: t('sla-step'),
      render: item => (
        <SuccessExpressionText value={item.topStep} fallback={t('operations-overview-value-unavailable')} />
      )
    },
    {
      id: 'violations',
      label: t('sla-violations'),
      align: 'right',
      render: item => item.slaViolations
    },
    {
      id: 'rate',
      label: t('sla-violation-rate'),
      align: 'right',
      render: item => formatPercent(item.violationRate)
    },
    {
      id: 'avg-overdue',
      label: t('sla-avg-overdue'),
      align: 'right',
      render: item => formatHoursDuration(item.avgOverdueHours)
    },
    {
      id: 'status',
      label: t('label-status'),
      hideInCard: true,
      render: item => item.status
    },
    {
      id: 'last-activity',
      label: t('overview-last-activity'),
      hideInCard: true,
      render: item => (item.lastActivityTime ? formatDateTime(item.lastActivityTime) : t('value-not-available'))
    }
  ]
  return (
    <SuccessPaginatedTableCard
      cardId="operations-sla-queue"
      title={t('operations-overview-sla-queue-title')}
      description={t('operations-overview-sla-queue-description')}
      emptyDescription={t('operations-overview-sla-queue-empty')}
      emptyIcon={<AlertTriangle className="gba:h-8 gba:w-8" />}
      items={items}
      rowKey={item => item.flowId}
      columns={columns}
      isLoading={isLoading}
      error={error}
      pageSize={5}
      dialogPageSize={10}
      data-testid={testId}
    />
  )
}
