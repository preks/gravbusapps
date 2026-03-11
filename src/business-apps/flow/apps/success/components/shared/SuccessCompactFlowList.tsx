import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Workflow } from 'lucide-react'
import translations from '../../_i18n'
import type { FlowSuccessFlowListItem } from '../../hooks/useFlowAnalytics.types'
import { formatDateTime } from '../../utils/formatters'
import { SuccessExpressionText } from './SuccessExpressionText'
import {
  SuccessPaginatedTableCard,
  type SuccessPaginatedTableAction,
  type SuccessPaginatedTableColumn
} from './SuccessPaginatedTableCard'

interface SuccessCompactFlowListProps {
  title: string
  description: string
  flows: FlowSuccessFlowListItem[]
  isLoading?: boolean
  error?: Error | null
  emptyDescription: string
  metricLabel: string
  renderMetric: (flow: FlowSuccessFlowListItem) => React.ReactNode
  actions?: SuccessPaginatedTableAction<FlowSuccessFlowListItem>[]
  'data-testid'?: string
}

export const SuccessCompactFlowList: React.FC<SuccessCompactFlowListProps> = ({
  title,
  description,
  flows,
  isLoading = false,
  error,
  emptyDescription,
  metricLabel,
  renderMetric,
  actions = [],
  'data-testid': testId = 'success-compact-flow-list'
}) => {
  const { t } = useTranslation(translations)
  const columns: SuccessPaginatedTableColumn<FlowSuccessFlowListItem>[] = [
    {
      id: 'flow',
      label: t('label-flow'),
      render: flow => (
        <span className="gba:font-medium gba:text-foreground">
          <SuccessExpressionText
            value={flow.flowName || flow.flowId}
            fallback={t('operations-overview-value-unavailable')}
          />
        </span>
      )
    },
    {
      id: 'last-activity',
      label: t('overview-last-activity'),
      render: flow => formatDateTime(flow.lastActivityTime || flow.updateTime || flow.startTime)
    },
    {
      id: 'metric',
      label: metricLabel,
      align: 'right',
      render: flow => renderMetric(flow)
    },
    {
      id: 'started',
      label: t('overview-started'),
      hideInCard: true,
      render: flow => formatDateTime(flow.startTime)
    }
  ]

  return (
    <SuccessPaginatedTableCard
      title={title}
      description={description}
      emptyDescription={emptyDescription}
      emptyIcon={<Workflow className="gba:h-8 gba:w-8" />}
      items={flows}
      rowKey={flow => flow.flowId}
      columns={columns}
      actions={actions}
      isLoading={isLoading}
      error={error}
      pageSize={5}
      dialogPageSize={10}
      detailDescription={description}
      data-testid={testId}
    />
  )
}
