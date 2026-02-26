'use client'

import React, { useEffect, useState } from 'react'
import { formatDate, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface LiveClockProps {
  className?: string
  timeClassName?: string
  dateClassName?: string
}

export const LiveClock: React.FC<LiveClockProps> = ({ className, timeClassName, dateClassName }) => {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const formatter = () => {
      const now = new Date()
      const locale = getCurrentActiveUserLocale() || navigator.language || 'en-US'
      const use12h = String(locale).toLowerCase().startsWith('en')

      // Prefer our formatter when available, otherwise fall back to locale-based rendering
      const formattedTime = String(formatDate(now, 'time.short') || '')
      const isIsoLike = (v: string) => v.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(v)

      const humanTime = isIsoLike(formattedTime)
        ? now.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: use12h
          })
        : formattedTime

      // Always render date as long, localized text (Friday, December 05, 2025)
      const humanDate = now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      })

      setTime(humanTime)
      setDate(humanDate)
    }

    formatter()
    const id = setInterval(formatter, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={className}>
      <div
        className={`gba:text-5xl gba:font-bold gba:leading-none gba:mb-1 ${timeClassName || ''}`}
        data-testid="timeclock-time"
      >
        {time}
      </div>
      <div className={`gba:text-sm ${dateClassName || ''}`} data-testid="timeclock-date">
        {date}
      </div>
    </div>
  )
}

export default LiveClock
