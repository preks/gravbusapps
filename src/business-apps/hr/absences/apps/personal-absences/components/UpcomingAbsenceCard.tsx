import type { UpcomingAbsenceCardProps } from '../types/absenceTypes'
import { Calendar } from 'lucide-react'
import React from 'react'

export const UpcomingAbsenceCard = ({ absence }: UpcomingAbsenceCardProps) => {
  const { type, dates, description, timeUntil, bgColor } = absence

  return (
    <div
      className="gba:upcomingAbsenceCard"
      style={
        {
          '--gba-bg': `#${bgColor}`,
          backgroundColor: `rgba(${parseInt(
            bgColor?.slice(0, 2) || 'a3',
            16
          )}, ${parseInt(bgColor?.slice(2, 4) || '51', 16)}, ${parseInt(bgColor?.slice(4, 6) || '9a', 16)}, 0.1)`,
          border: `1px solid #${bgColor}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px'
        } as React.CSSProperties
      }
      data-testid="upcoming-absence-card"
    >
      <div
        className="gba:absenceCardTopRow gba:flex gba:items-center gba:justify-between gba:mb-2"
        data-testid="absence-card-top-row"
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:absenceCardIcon" data-testid="absence-icon">
            <Calendar className="gba:w-5 gba:h-5" style={{ color: `#${bgColor}` }} />
          </span>
          <span
            className="gba:absenceCardType gba:font-medium"
            data-testid="absence-type"
            style={{ color: `#${bgColor}` }}
          >
            {type}
          </span>
        </div>
        <span
          className="gba:absenceCardPill gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium"
          style={
            {
              '--gba-pill-border': `#${bgColor}`,
              '--gba-pill-color': `#${bgColor}`,
              color: `#${bgColor}`,
              borderColor: `#${bgColor}`,
              border: `1px solid #${bgColor}`,
              backgroundColor: `rgba(${parseInt(
                bgColor?.slice(0, 2) || 'a3',
                16
              )}, ${parseInt(bgColor?.slice(2, 4) || '51', 16)}, ${parseInt(bgColor?.slice(4, 6) || '9a', 16)}, 0.1)`
            } as React.CSSProperties
          }
          data-testid="absence-pill"
        >
          {timeUntil}
        </span>
      </div>
      <div
        className="gba:absenceCardDates gba:font-medium"
        data-testid="absence-dates"
        style={{ color: `#${bgColor}` }}
      >
        {Array.isArray(dates) ? dates.map(date => date).join(', ') : dates}
      </div>
      {description && (
        <div
          className="gba:absenceCardDescription gba:text-sm gba:mt-1"
          data-testid="absence-description"
          style={{ color: `#${bgColor}` }}
        >
          {description}
        </div>
      )}
    </div>
  )
}

export default UpcomingAbsenceCard
