'use client'

import React, { useEffect, useState } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface LiveClockProps {
  className?: string
}

export const LiveClock: React.FC<LiveClockProps> = ({ className }) => {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const formatter = () => {
      const now = new Date()
      const locale = getCurrentActiveUserLocale()

      const humanTime = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now)
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      }
      let humanDate = new Intl.DateTimeFormat(locale, dateOptions).format(now)
      // Some environments can still return numeric-only formats for certain locales.
      // If no letters are present (e.g., 27.11.2025), try a locale-specific fallback.
      if (!/[A-Za-z]/.test(humanDate)) {
        const lc = (locale || '').toLowerCase()
        const fallbackLocale = lc.startsWith('de') ? 'de-DE' : locale || 'en-US'
        humanDate = new Intl.DateTimeFormat(fallbackLocale, dateOptions).format(now)
      }
      /*
      const humanTime = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      const humanDate = now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      })*/

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
