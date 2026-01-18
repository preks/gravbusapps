import React, { useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@newwork/nw-design-system'
import { formatTime, formatFullTimestamp } from './messageUtils'

interface TimestampDisplayProps {
  createdAt: Date | string
  t: (key: string, params?: Record<string, any>) => string
  className?: string
}

/**
 * A self-updating timestamp display component.
 * Each instance manages its own update interval to avoid re-rendering
 * the entire message list when timestamps need to be refreshed.
 */
export const TimestampDisplay: React.FC<TimestampDisplayProps> = ({ createdAt, t, className }) => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    // Update timestamp every minute
    // This only re-renders this specific timestamp, not the entire message list
    const intervalId = setInterval(() => {
      forceUpdate(prev => prev + 1)
    }, 60000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{formatTime(createdAt, t)}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="gba:text-xs">{formatFullTimestamp(createdAt)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
