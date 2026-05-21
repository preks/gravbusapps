import React from 'react'

export interface AnalyticsTooltipMetric {
  label: string
  value: React.ReactNode
  color?: string
}

export interface AnalyticsTooltipMetadata {
  label: string
  value: React.ReactNode
}

export interface AnalyticsTooltipGroup {
  label: string
  color?: string
  metrics: AnalyticsTooltipMetric[]
}

interface AnalyticsChartTooltipProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  metrics?: AnalyticsTooltipMetric[]
  metadata?: AnalyticsTooltipMetadata[]
  groups?: AnalyticsTooltipGroup[]
}

const TooltipColorDot: React.FC<{ color?: string }> = ({ color }) => {
  if (!color) {
    return null
  }

  return (
    <svg className="gba:mt-1 gba:h-3 gba:w-3 gba:shrink-0" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="6" fill={color} />
    </svg>
  )
}

const TooltipMetricRow: React.FC<{ metric: AnalyticsTooltipMetric }> = ({ metric }) => (
  <div className="gba:flex gba:items-start gba:gap-2">
    <TooltipColorDot color={metric.color} />
    <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-baseline gba:justify-between gba:gap-4">
      <span className="gba:text-sm gba:font-medium gba:text-gray-700">{metric.label}</span>
      <span className="gba:text-sm gba:font-semibold gba:text-gray-900">{metric.value}</span>
    </div>
  </div>
)

export const AnalyticsChartTooltip: React.FC<AnalyticsChartTooltipProps> = ({
  title,
  subtitle,
  metrics = [],
  metadata = [],
  groups = []
}) => {
  if (!title && !subtitle && metrics.length === 0 && metadata.length === 0 && groups.length === 0) {
    return null
  }

  return (
    <div className="gba:max-w-sm gba:rounded-lg gba:border gba:border-gray-200 gba:bg-white gba:p-3 gba:shadow-lg">
      {title && <div className="gba:font-medium gba:text-gray-900">{title}</div>}
      {subtitle && <div className="gba:mt-1 gba:text-xs gba:text-gray-500">{subtitle}</div>}

      {metrics.length > 0 && (
        <div className="gba:mt-3 gba:space-y-2">
          {metrics.map(metric => (
            <TooltipMetricRow key={metric.label} metric={metric} />
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <div className="gba:mt-3 gba:space-y-3">
          {groups.map(group => (
            <div key={group.label} className="gba:flex gba:items-start gba:gap-2">
              <TooltipColorDot color={group.color} />
              <div className="gba:min-w-0 gba:flex-1">
                <div className="gba:text-sm gba:font-medium gba:text-gray-900">{group.label}</div>
                <div className="gba:mt-1 gba:space-y-1">
                  {group.metrics.map(metric => (
                    <div
                      key={metric.label}
                      className="gba:flex gba:items-baseline gba:justify-between gba:gap-4 gba:text-xs"
                    >
                      <span className="gba:text-gray-500">{metric.label}</span>
                      <span className="gba:font-medium gba:text-gray-700">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {metadata.length > 0 && (
        <div className="gba:mt-3 gba:space-y-1 gba:border-t gba:border-gray-100 gba:pt-2">
          {metadata.map(item => (
            <div key={item.label} className="gba:flex gba:items-baseline gba:justify-between gba:gap-4 gba:text-xs">
              <span className="gba:text-gray-500">{item.label}</span>
              <span className="gba:text-right gba:font-medium gba:text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AnalyticsChartTooltip
