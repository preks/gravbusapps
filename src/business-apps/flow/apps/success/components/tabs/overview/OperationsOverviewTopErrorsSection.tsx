import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import translations from '../../../_i18n'
import type { SystemTaskReliabilityData } from '../../../hooks/useSystemTaskReliability'
import { SuccessPaginatedTableCard, type SuccessPaginatedTableColumn } from '../../shared'

interface OperationsOverviewTopErrorsSectionProps {
  items: SystemTaskReliabilityData['topErrors']
  isLoading?: boolean
  error?: Error | null
  'data-testid'?: string
}

export const OperationsOverviewTopErrorsSection: React.FC<OperationsOverviewTopErrorsSectionProps> = ({
  items,
  isLoading = false,
  error,
  'data-testid': testId = 'operations-overview-top-errors'
}) => {
  const { t } = useTranslation(translations)
  const columns: SuccessPaginatedTableColumn<SystemTaskReliabilityData['topErrors'][number]>[] = [
    {
      id: 'step',
      label: t('system-reliability-step'),
      render: item => <span className="gba:font-medium">{item.stepTitle || item.stepReference}</span>
    },
    {
      id: 'task-type',
      label: t('audit-task-type'),
      render: item => item.taskType
    },
    {
      id: 'failures',
      label: t('system-reliability-failures'),
      align: 'right',
      render: item => item.totalOccurrences
    },
    {
      id: 'message',
      label: t('operations-overview-error-message'),
      render: (item, mode) => (
        <span className={mode === 'card' ? 'gba:line-clamp-2 gba:text-muted-foreground' : 'gba:text-muted-foreground'}>
          {item.errorMessage}
        </span>
      )
    }
  ]
  return (
    <SuccessPaginatedTableCard
      cardId="operations-top-errors"
      title={t('system-reliability-top-errors-title')}
      description={t('system-reliability-top-errors-description')}
      emptyDescription={t('system-reliability-top-errors-description')}
      emptyIcon={<AlertTriangle className="gba:h-8 gba:w-8" />}
      items={items}
      rowKey={item => `${item.taskType}-${item.stepReference}-${item.errorMessage}`}
      columns={columns}
      isLoading={isLoading}
      error={error}
      pageSize={5}
      dialogPageSize={10}
      data-testid={testId}
    />
  )
}
