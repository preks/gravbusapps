import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Users } from 'lucide-react'
import translations from '../../../_i18n'
import type { GuardianVelocityInsightsData } from '../../../hooks/useGuardianVelocityInsights'
import { formatMinutesDuration } from '../../../utils/formatters'
import { SuccessExpressionText, SuccessPaginatedTableCard, type SuccessPaginatedTableColumn } from '../../shared'

interface OperationsOverviewBottlenecksSectionProps {
  items: GuardianVelocityInsightsData['bottlenecks']
  isLoading?: boolean
  error?: Error | null
  'data-testid'?: string
}

export const OperationsOverviewBottlenecksSection: React.FC<OperationsOverviewBottlenecksSectionProps> = ({
  items,
  isLoading = false,
  error,
  'data-testid': testId = 'operations-overview-bottlenecks'
}) => {
  const { t } = useTranslation(translations)
  const columns: SuccessPaginatedTableColumn<GuardianVelocityInsightsData['bottlenecks'][number]>[] = [
    {
      id: 'flow',
      label: t('label-flow'),
      render: item => (
        <span className="gba:font-medium">
          <SuccessExpressionText
            value={item.templateName || item.templateId}
            fallback={t('operations-overview-value-unavailable')}
          />
        </span>
      )
    },
    {
      id: 'step',
      label: t('sla-step'),
      render: item => (
        <SuccessExpressionText value={item.stepName} fallback={t('operations-overview-value-unavailable')} />
      )
    },
    {
      id: 'affected',
      label: t('capacity-affected-title'),
      align: 'right',
      render: item => item.affectedCount
    },
    {
      id: 'queue',
      label: t('capacity-queue-title'),
      align: 'right',
      render: item => formatMinutesDuration(item.avgQueueMinutes || item.avgTimeInStepMinutes)
    }
  ]
  return (
    <SuccessPaginatedTableCard
      cardId="operations-bottlenecks"
      title={t('operations-overview-bottlenecks-title')}
      description={t('operations-overview-bottlenecks-description')}
      emptyDescription={t('operations-overview-bottlenecks-empty')}
      emptyIcon={<Users className="gba:h-8 gba:w-8" />}
      items={items}
      rowKey={item => item.key}
      columns={columns}
      isLoading={isLoading}
      error={error}
      pageSize={5}
      dialogPageSize={10}
      data-testid={testId}
    />
  )
}
