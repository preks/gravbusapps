import React from 'react'

interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="gba:bg-card gba:p-3 gba:border gba:rounded gba:shadow gba:min-w-40">
      <p className="gba:font-medium gba:mb-2 gba:text-sm">{label}</p>
      <div className="gba:space-y-1 gba:text-xs">
        {payload.map(entry => (
          <p key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
            <span className="gba:font-medium">{entry.name}:</span>
            <span>{typeof entry.value === 'number' ? Math.round(entry.value * 10) / 10 : entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export default ChartTooltip
