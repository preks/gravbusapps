import React from 'react'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { AbsenceListCardProps } from '../types/absenceTypes'
import { Calendar } from 'lucide-react'

const AbsenceListCard: React.FC<AbsenceListCardProps> = ({ absence }) => {
  const {
    type,
    status,
    title,
    startDate,
    endDate,
    duration,
    description,
    requestedInfo,
    requestDate,
    typeColor,
    statusColor
  } = absence

  return (
    <div className="gba:absenceListCard" data-testid="absence-list-card">
      <div className="gba:absenceListCardHeader" data-testid="absence-list-card-header">
        <span
          className="gba:absenceType"
          style={
            {
              '--gba-pill-bg': `#${typeColor}`,
              '--gba-pill-border': `#${typeColor}`,
              '--gba-pill-color': `#${typeColor}`,
              color: `#${typeColor}`,
              borderColor: `#${typeColor}`
            } as React.CSSProperties
          }
          data-testid="absence-type"
        >
          {type}
        </span>
        <span
          className="gba:absenceStatus"
          style={
            {
              '--gba-pill-bg': statusColor,
              '--gba-pill-border': statusColor,
              '--gba-pill-color': statusColor,
              color: statusColor,
              borderColor: statusColor
            } as React.CSSProperties
          }
          data-testid="absence-status"
        >
          {status}
        </span>
      </div>
      <div className="gba:absenceListCardTitle" data-testid="absence-list-card-title">
        {title}
      </div>
      <div className="gba:absenceListCardDetails" data-testid="absence-list-card-details">
        <span data-testid="absence-icon">
          <Calendar className="gba:w-4 gba:h-4" />
        </span>
        <div className="gba:absenceListDates" data-testid="absence-dates">
          {formatDate(startDate, 'date.long')} - {formatDate(endDate, 'date.long')}
        </div>
        <span className="gba:absenceDuration" data-testid="absence-list-card-duration">
          {duration}
        </span>
      </div>
      <div className="gba:absenceDescription" data-testid="absence-list-card-description">
        {description}
      </div>
      <div className="gba:absenceRequestedInfo" data-testid="absence-list-card-requested-info">
        {requestedInfo}
      </div>
      <div className="gba:absenceRequestedInfo" data-testid="absence-list-card-requested-info">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.requested_on', 'Requested on')}{' '}
        {formatDate(requestDate, 'date.long')}
      </div>
    </div>
  )
}

export default AbsenceListCard
