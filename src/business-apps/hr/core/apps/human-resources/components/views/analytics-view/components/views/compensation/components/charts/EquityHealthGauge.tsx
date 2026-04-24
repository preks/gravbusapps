import GaugeComponent from 'react-gauge-component'
import { Typography } from 'antd'
import { Badge } from '@newwork/nw-design-system'

const { Text } = Typography

interface EquityHealthGaugeProps {
  score: number
  loading?: boolean
  error?: string | null
}

export default function EquityHealthGauge({ score, loading = false, error = null }: Readonly<EquityHealthGaugeProps>) {
  // Determine status and color based on score
  const getStatusInfo = (score: number) => {
    if (score >= 80) {
      return { label: 'STABLE', color: '#10b981', bgColor: '#dcfce7' } // Green
    } else if (score >= 60) {
      return { label: 'WATCH', color: '#f59e0b', bgColor: '#fef3c7' } // Yellow/Orange
    } else {
      return { label: 'CRITICAL', color: '#dc2626', bgColor: '#fee2e2' } // Red
    }
  }

  const statusInfo = getStatusInfo(score)

  if (loading) {
    return (
      <div className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-4 gba:shadow-sm gba:border gba:border-border gba:animate-pulse">
        <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-3/4 gba:mb-3"></div>
        <div className="gba:h-32 gba:bg-muted gba:rounded gba:mx-auto"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-4 gba:shadow-sm gba:border gba:border-border">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
          <Text type="danger">Error loading equity health score</Text>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-4 gba:shadow-sm gba:border gba:border-border"
      data-testid="equity-health-score-gauge"
    >
      {/* Title matching KPI card style */}
      <div className="gba:mb-3">
        <Text className="gba:text-sm gba:text-muted-foreground gba:font-normal">Equity Health Score</Text>
      </div>

      {/* Gauge visualization */}
      <div className="gba:flex gba:flex-col gba:items-center">
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
