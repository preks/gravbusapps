import React from 'react'
import type { StatsCardProps } from "../types/absenceTypes"
import '../styles/statsCard.css'

export const StatsCard = ({ stat }: StatsCardProps) => {
  const { title, used, total, progress, icon: Icon, daysLeft } = stat;

  const renderIcon = () => {
    if (React.isValidElement(Icon)) {
      return React.cloneElement(Icon as React.ReactElement, { style: { fontSize: '24px', verticalAlign: 'middle' } });
    } else if (typeof Icon === 'function') {
      const IconComponent = Icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
      return <IconComponent style={{ fontSize: '24px', verticalAlign: 'middle' }} />;
    }
    return null;
  };

  return (
    <div className="gba:statsCard" data-testid="stats-card">
      <div className="gba:statsCardRow gba:statsCardRow--top">
        <span className="gba:statsCardIcon" data-testid="stats-card-icon">
          {renderIcon()}
        </span>
        <span className="gba:statsCardTitle" data-testid="stats-card-title">{title}</span>
        <span className="gba:statsCardDaysLeft" data-testid="stats-card-days-left">{daysLeft} days left</span>
      </div>
      <div className="gba:statsCardProgressBarContainer">
        <div className="gba:statsCardProgressBarBg">
          <div
            className="gba:statsCardProgressBarFg"
            style={{ width: `${progress}%` }}
            data-testid="stats-card-progress-bar"
          />
        </div>
      </div>
      <div className="gba:statsCardRow gba:statsCardRow--bottom">
        <span className="gba:statsCardUsed" data-testid="stats-card-used">Used: {used}</span>
        <span className="gba:statsCardTotal" data-testid="stats-card-total">Total: {total}</span>
      </div>
    </div>
  );
}

export default StatsCard
