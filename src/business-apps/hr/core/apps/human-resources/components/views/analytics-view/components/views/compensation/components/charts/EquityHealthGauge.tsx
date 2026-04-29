import GaugeComponent from 'react-gauge-component'
import { Typography } from 'antd'
import { Badge, Icon, useTranslation } from '@newwork/nw-design-system'
import { ShieldWarningIcon } from '@phosphor-icons/react'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Text } = Typography

// Determine status and color based on score
function getStatusInfo(score: number) {
  if (score >= 80) {
    return { label: 'STABLE', color: '#10b981', bgColor: '#dcfce7' } // Green
  } else if (score >= 60) {
    return { label: 'WATCH', color: '#f59e0b', bgColor: '#fef3c7' } // Yellow/Orange
  } else {
    return { label: 'CRITICAL', color: '#dc2626', bgColor: '#fee2e2' } // Red
  }
}

const cardShellClassName =
  'gba:w-full gba:h-full gba:min-h-52 gba:bg-card gba:rounded-lg gba:p-4 gba:shadow-sm gba:border gba:border-border gba:flex gba:flex-col'

interface EquityHealthGaugeProps {
  score: number | undefined
  loading?: boolean
  error?: string | null
}

interface EquityHealthKpiPlaceholderProps {
  title: string
  value: string
  footer: string
  dataTestId: string
}

function EquityHealthKpiPlaceholder({ title, value, footer, dataTestId }: Readonly<EquityHealthKpiPlaceholderProps>) {
  return (
    <div className={cardShellClassName} data-testid={dataTestId}>
      <div className="gba:flex gba:flex-row gba:justify-between gba:items-start">
        <span className="gba:text-sm gba:text-muted-foreground gba:font-normal">{title}</span>
        <Icon icon={ShieldWarningIcon} size="sm" className="gba:text-muted-foreground" decorative />
      </div>
      <div className="gba:flex-1 gba:flex gba:flex-col gba:justify-center gba:py-2">
        <span className="gba:text-3xl gba:font-bold gba:text-foreground">{value}</span>
      </div>
      <p className="gba:text-sm gba:text-muted-foreground gba:m-0">{footer}</p>
    </div>
  )
}

export default function EquityHealthGauge({ score, loading = false, error = null }: Readonly<EquityHealthGaugeProps>) {
  const { t } = useTranslation(hrTranslations)

  const title = (
    <div className="gba:mb-3">
      <Text className="gba:text-sm gba:text-muted-foreground gba:font-normal">
        {t('hr-analytics-equity-health-score-title')}
      </Text>
    </div>
  )

  if (loading) {
    return (
      <div className={`${cardShellClassName} gba:animate-pulse`} data-testid="equity-health-score-gauge-loading">
        <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-3/4 gba:mb-3"></div>
        <div className="gba:h-32 gba:bg-muted gba:rounded gba:mx-auto"></div>
      </div>
    )
  }

  if (error) {
    return (
      <EquityHealthKpiPlaceholder
        title={t('hr-analytics-equity-health-score-title')}
        value={t('hr-analytics-error-loading')}
        footer={t('hr-analytics-equity-health-score-error-footer')}
        dataTestId="equity-health-score-gauge-error"
      />
    )
  }

  if (score === undefined) {
    return (
      <EquityHealthKpiPlaceholder
        title={t('hr-analytics-equity-health-score-title')}
        value={t('hr-analytics-not-available')}
        footer={t('hr-analytics-equity-health-score-no-data-footer')}
        dataTestId="equity-health-score-gauge-na"
      />
    )
  }

  const statusInfo = getStatusInfo(score)

  return (
    <div className={`${cardShellClassName}`} data-testid="equity-health-score-gauge">
      {title}
      {/* Gauge visualization */}
      <div className="gba:flex gba:flex-col gba:items-center gba:flex-1 gba:justify-center">
        <div className="gba:w-full gba:max-w-45">
          <GaugeComponent
            value={score}
            type="semicircle"
            minValue={0}
            maxValue={100}
            arc={{
              width: 0.2,
              padding: 0.015,
              cornerRadius: 3,
              subArcs: [
                {
                  limit: 60,
                  color: '#dc2626',
                  showTick: true
                },
                {
                  limit: 80,
                  color: '#f59e0b',
                  showTick: true
                },
                { color: '#10b981' }
              ],
              subArcsStrokeWidth: 0,
              effects: { glow: false, innerShadow: false }
            }}
            pointer={{
              type: 'arrow',
              length: 0.7,
              width: 20,
              maxFps: 30,
              baseColor: '#374151',
              strokeWidth: 0,
              arrowOffset: 0.65
            }}
            labels={{
              valueLabel: {
                renderContent: () => (
                  <Badge
                    style={{
                      backgroundColor: statusInfo.bgColor,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.color}`,
                      fontWeight: 'bold',
                      fontSize: '8px',
                      padding: '2px 8px'
                    }}
                  >
                    {statusInfo.label}
                  </Badge>
                ),
                style: {
                  fontSize: '32px',
                  fill: '#000',
                  fontWeight: '700'
                },
                offsetY: 0,
                hide: false,
                animateValue: true
              },
              tickLabels: {
                type: 'outer',
                defaultTickValueConfig: {
                  formatTextValue: (value: number) => value.toString(),
                  style: { fontSize: '10px', fill: '#6b7280' },
                  hide: false
                },
                defaultTickLineConfig: {
                  color: '#9ca3af',
                  length: 3,
                  width: 1,
                  hide: false,
                  distanceFromArc: 2,
                  distanceFromText: 4
                },
                hideMinMax: true,
                autoSpaceTickLabels: false
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
