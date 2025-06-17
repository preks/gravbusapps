import React from 'react';

import type { UpcomingAbsenceCardProps } from '../types/absenceTypes';
import '../styles/upcomingAbsenceCard.css';

export const UpcomingAbsenceCard = ({ absence }: UpcomingAbsenceCardProps) => {
  const { icon: Icon, type, dates, description, timeUntil, bgColor } = absence
  
  const colorClass = bgColor.includes('green') ? 'gba:absenceCard--green' :
                     bgColor.includes('red') ? 'gba:absenceCard--red' : 'gba:absenceCard--blue';

  const renderIcon = () => {
    if (React.isValidElement(Icon)) {
      return React.cloneElement(Icon as React.ReactElement, { style: { fontSize: '18px' } })
    } else if (typeof Icon === 'function') {
      const IconComponent = Icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>
      return <IconComponent style={{ fontSize: '18px' }} />
    }
    return null
  }

  return (
    <div className={`gba:upcomingAbsenceCard ${colorClass}`} data-testid="upcoming-absence-card">
      <div className="gba:absenceCardTopRow">
        <span className="gba:absenceCardIcon" data-testid="absence-icon">{renderIcon()}</span>
        <span className="gba:absenceCardType" data-testid="absence-type">{type}</span>
        <span className="gba:absenceCardPill" data-testid="absence-pill">{timeUntil}</span>
      </div>
      <div className="gba:absenceCardDates" data-testid="absence-dates">{dates}</div>
      <div className="gba:absenceCardDescription" data-testid="absence-description">{description}</div>
    </div>
  )
}

export default UpcomingAbsenceCard;
