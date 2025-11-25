'use client'

import React, { useEffect, useState } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface LiveClockProps {
  className?: string
}

export const LiveClock: React.FC<LiveClockProps> = ({ className }) => {
  const locale = getCurrentActiveUserLocale()
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const formatter = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString(locale || undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      )
      setDate(
        now.toLocaleDateString(locale || undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: '2-digit'
        })
      )
    }

    formatter()
    const id = setInterval(formatter, 1000)
    return () => clearInterval(id)
  }, [locale])

  return (
    <div className={className}>
      <div className="gba:text-5xl gba:font-bold gba:leading-none gba:mb-1 gba:text-info" data-testid="timeclock-time">
        {time}
      </div>
      <div className="gba:text-sm gba:text-muted-foreground" data-testid="timeclock-date">
        {date}
      </div>
    </div>
  )
}

export default LiveClock
