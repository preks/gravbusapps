import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, useTranslation } from '@newwork/nw-design-system'
import { type PulseMetric } from '../hooks/useWorkPulse'
import { navigateTo } from '@/common/utils/navigationUtils'
import translations from '../_i18n'

interface WorkPulseProps {
  metrics: PulseMetric[]
  isLoading: boolean
  'data-testid'?: string
}

const TONE_CLASSES: Record<string, string> = {
  default: 'gba:text-foreground',
  success: 'gba:text-success',
  warning: 'gba:text-warning',
  danger: 'gba:text-destructive'
}

const PULSE_SKELETON_IDS = ['primary', 'secondary', 'tertiary', 'quaternary']

export const WorkPulse: React.FC<WorkPulseProps> = ({
  metrics,
  isLoading,
  'data-testid': testId = 'work-home-pulse'
}) => {
  const { t } = useTranslation(translations)

  if (isLoading) {
    return (
      <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
        <CardHeader>
          <CardTitle className="gba:text-lg">{t('pulse-title')}</CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">{t('pulse-subtitle')}</p>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-2 gba:gap-2">
            {PULSE_SKELETON_IDS.map(id => (
              <div key={id} className="gba:h-16 gba:bg-muted gba:rounded-lg gba:animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (metrics.length === 0) return null

  return (
    <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-lg">{t('pulse-title')}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{t('pulse-subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          {metrics.map(metric => {
            const metricHref = metric.href
            const isClickable = Boolean(metricHref)
            const handleClick = metricHref ? () => navigateTo(metricHref) : undefined
            return (
              <button
                key={metric.id}
                type="button"
                className={`gba:p-2.5 gba:bg-surface gba:rounded-lg gba:transition-colors gba:text-center ${isClickable ? 'gba:hover:bg-muted/40 gba:cursor-pointer' : 'gba:cursor-default'}`}
                onClick={handleClick}
                disabled={!isClickable}
                data-testid={`${testId}-${metric.id}`}
              >
                <p className={`gba:text-xl gba:font-bold ${TONE_CLASSES[metric.tone || 'default']}`}>{metric.value}</p>
                <p className="gba:text-xs gba:text-muted-foreground">{t(metric.label)}</p>
                {metric.subtitle && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{t(metric.subtitle)}</p>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
