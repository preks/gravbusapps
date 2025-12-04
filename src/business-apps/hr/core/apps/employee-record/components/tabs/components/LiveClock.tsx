'use client'

import React, { useEffect, useState } from 'react'
import { formatDate, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface LiveClockProps {
  className?: string
}

export const LiveClock: React.FC<LiveClockProps> = ({ className }) => {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const formatter = () => {
      const now = new Date()
      const formattedTime = String(formatDate(now, 'time.long') || '')
      const formattedDate = String(formatDate(now, 'date.long') || '')

      // If the formatter returns an ISO-like string (fallback), compose a human-friendly text locally
      const isIsoLike = (v: string) => v.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(v)

      const locale = getCurrentActiveUserLocale() || navigator.language || 'en-US'
      const use12h = String(locale).toLowerCase().startsWith('en')

      const humanTime = isIsoLike(formattedTime)
        ? now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: use12h
          })
        : formattedTime

      const humanDate = isIsoLike(formattedDate)
        ? now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' })
        : formattedDate

      setTime(humanTime)
      setDate(humanDate)
    }

    formatter()
    const id = setInterval(formatter, 1000)
    return () => clearInterval(id)
  }, [])

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
