import React from 'react'
import { Typography } from 'antd'

const { Text } = Typography

export type ChartState = 'loading' | 'error' | 'empty'

interface ChartStateOverlayProps {
  state: ChartState
  message: string
}

/**
 * Shared overlay for chart loading, error, and empty states.
 * Renders a centered message in the chart area.
 */
export const ChartStateOverlay: React.FC<ChartStateOverlayProps> = ({ state, message }) => {
  const textClassName = state === 'error' ? 'gba:text-destructive' : 'gba:text-muted-foreground'
  return (
    <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
      <Text className={textClassName}>{message}</Text>
    </div>
  )
}
