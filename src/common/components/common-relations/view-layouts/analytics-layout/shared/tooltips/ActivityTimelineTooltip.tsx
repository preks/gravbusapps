import React from 'react'

interface TimelineTooltipProps {
  active?: boolean
  payload?: readonly any[]
}

export const ActivityTimelineTooltip: React.FC<TimelineTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{data.fullDate}</div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: 'var(--color-activities)' }} />
          <span className="gba:font-medium">Activities:</span>
          <span className="gba:font-semibold">{data.activities}</span>
        </div>
      </div>
    )
  }
  return null
}
