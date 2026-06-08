import React from 'react'

const DEFAULT_CHART_LABEL_MAX_LENGTH = 16

interface CategoryAxisTickProps {
  x?: number
  y?: number
  payload?: {
    value?: string
  }
}

const CategoryAxisTick: React.FC<CategoryAxisTickProps> = ({ x = 0, y = 0, payload }) => (
  <g transform={`translate(${x},${y})`}>
    <text dy={10} transform="rotate(-35)" textAnchor="end" className="gba:fill-muted-foreground" fontSize={12}>
      {truncateChartLabel(String(payload?.value ?? ''))}
    </text>
  </g>
)

export const CATEGORY_CHART_MARGIN = {
  top: 16,
  right: 24,
  left: 8,
  bottom: 48
}

export const CATEGORY_AXIS_PROPS = {
  interval: 0,
  height: 72,
  tick: <CategoryAxisTick />
}

export const truncateChartLabel = (label: string, maxLength = DEFAULT_CHART_LABEL_MAX_LENGTH): string => {
  if (label.length <= maxLength) return label

  return `${label.slice(0, maxLength).trimEnd()}...`
}

// Reusable tooltip wrapper component
interface TooltipWrapperProps {
  title: string
  children: React.ReactNode
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ title, children }) => (
  <div className="gba:bg-card gba:text-card-foreground gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-md">
    <p className="gba:font-semibold gba:mb-2">{title}</p>
    <div className="gba:space-y-1">{children}</div>
  </div>
)

// Reusable tooltip data line component
interface TooltipDataLineProps {
  label: string
  value: string | number
  color: string
}

export const TooltipDataLine: React.FC<TooltipDataLineProps> = ({ label, value, color }) => (
  <p className="gba:text-sm gba:text-foreground">
    <span className="gba:font-medium" style={{ color }}>
      {label}:
    </span>{' '}
    {value}
  </p>
)
