import type { UpcomingAbsenceCardProps } from '../types/absenceTypes';
import { CalendarOutlined } from '@ant-design/icons';
import React from 'react';

export const UpcomingAbsenceCard = ({ absence }: UpcomingAbsenceCardProps) => {
  const { type, dates, description, timeUntil, bgColor } = absence
  
  return (
    <div className="gba:upcomingAbsenceCard" style={{ '--gba-bg': `#${bgColor}` } as React.CSSProperties} data-testid="upcoming-absence-card">
      <div className="gba:absenceCardTopRow" data-testid="absence-card-top-row">
        <span className="gba:absenceCardIcon" data-testid="absence-icon"><CalendarOutlined style={{ fontSize: '20px', color: `#${bgColor}` }} /></span>
        <span className="gba:absenceCardType" data-testid="absence-type" style={{ color: `#${bgColor}` }}>{type}</span>
        <span className="gba:absenceCardPill" style={{'--gba-pill-border': `#${bgColor}`, '--gba-pill-color': `#${bgColor}`, color: `#${bgColor}`, borderColor: `#${bgColor}` } as React.CSSProperties} data-testid="absence-pill">{timeUntil}</span>
      </div>
      <div className="gba:absenceCardDates" data-testid="absence-dates" style={{ color: `#${bgColor}` }}>
        {Array.isArray(dates) ? dates.map(date => date).join(', ') : dates}
      </div>
      <div className="gba:absenceCardDescription" data-testid="absence-description" style={{ color: `#${bgColor}` }}>{description}</div>
    </div>
  )
}

export default UpcomingAbsenceCard;
