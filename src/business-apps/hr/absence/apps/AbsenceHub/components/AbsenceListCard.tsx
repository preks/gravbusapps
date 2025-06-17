import React from 'react';
import type { AbsenceListCardProps } from '../types/absenceTypes';
import '../styles/absenceListCard.css';

const AbsenceListCard: React.FC<AbsenceListCardProps> = ({ absence }) => {
  const {
    type,
    status,
    title,
    dates,
    duration,
    description,
    requestedInfo,
    icon,
    typeColor,
    statusColor,
  } = absence;

  return (
    <div className="gba:absenceListCard" data-testid="absence-list-card">
      <div className="gba:absenceListCardHeader">
        <span className={`gba:absenceType gba:absenceType--${typeColor}`} data-testid="absence-type">{type}</span>
        <span className={`gba:absenceStatus gba:status--${statusColor}`} data-testid="absence-status">{status}</span>
      </div>
      <div className="gba:absenceListCardTitle" data-testid="absence-title">{title}</div>
      <div className="gba:absenceListCardDetails">
        <span className="gba:absenceListCardIcon" data-testid="absence-icon">{icon}</span>
        <span className="gba:absenceDates" data-testid="absence-dates">{dates}</span>
        <span className="gba:absenceDuration" data-testid="absence-duration">{duration}</span>
      </div>
      <div className="gba:absenceDescription" data-testid="absence-description">{description}</div>
      <div className="gba:absenceRequestedInfo" data-testid="absence-requested-info">{requestedInfo}</div>
    </div>
  );
};

export default AbsenceListCard;
