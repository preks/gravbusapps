import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const WIDGET_SPAN = { xs: 24, sm: 12, md: 12, lg: 6 } as const

export const VS_LAST_QUARTER = 'vs last quarter'

interface DivestmentStatisticsPanelProps {
  widgets: WidgetItem[]
  isLoading: boolean
  error: string | null
  onRetry: () => void | Promise<void>
  dataTestId: string
}

export const DivestmentStatisticsPanel: React.FC<DivestmentStatisticsPanelProps> = ({
  widgets,
  isLoading,
  error,
  onRetry,
  dataTestId
}) => (
  <WidgetGroup
    widgets={widgets}
    isLoading={isLoading}
    error={error ? new Error(error) : null}
    onRetry={onRetry}
    skeletonCount={4}
    defaultSpan={WIDGET_SPAN}
    emptyText={getTranslationFromI18nKeyAndLabel('no_metrics_available', 'No metrics available')}
    data-testid={dataTestId}
  />
)
