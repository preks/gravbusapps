'use client'

import React, { useEffect, useState } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface LiveClockProps {
  className?: string
  timeClassName?: string
  dateClassName?: string
  greetingClassName?: string
  greeting?: string
}

export const LiveClock: React.FC<LiveClockProps> = ({
  className,
  timeClassName,
  dateClassName,
  greetingClassName,
  greeting
}) => {
  const [timeParts, setTimeParts] = useState<{ hhmm: string; period: string }>({ hhmm: '', period: '' })
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const formatter = () => {
      const now = new Date()
      const locale = getCurrentActiveUserLocale() || navigator.language || 'en-US'
      const use12h = String(locale).toLowerCase().startsWith('en')

      const raw = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: use12h
      })

      if (use12h) {
        const match = raw.match(/^([\d:]+)\s*(AM|PM|am|pm)$/)
        if (match) {
          setTimeParts({ hhmm: match[1], period: match[2] })
        } else {
          setTimeParts({ hhmm: raw, period: '' })
        }
      } else {
        setTimeParts({ hhmm: raw, period: '' })
      }

      const humanDate = now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      })

      setDate(humanDate)
    }

    formatter()
    const id = setInterval(formatter, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={className}>
      <div className={`gba:text-sm ${dateClassName || ''}`} data-testid="timeclock-date">
        {date}
      </div>
      <div
        className={`gba:text-5xl gba:font-bold gba:leading-none gba:mt-1 ${timeClassName || ''}`}
        data-testid="timeclock-time"
      >
        {timeParts.hhmm}
        {timeParts.period && <span className="gba:text-lg gba:font-medium gba:ml-1">{timeParts.period}</span>}
      </div>
      {greeting && (
        <div className={`gba:text-sm gba:mt-2 ${greetingClassName || ''}`} data-testid="timeclock-greeting">
          {greeting}
        </div>
      )}
    </div>
  )
}

export default LiveClock
