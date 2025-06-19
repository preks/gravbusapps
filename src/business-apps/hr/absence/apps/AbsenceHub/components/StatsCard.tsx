import type { StatsCardProps } from "../types/absenceTypes"
import { CalendarOutlined } from '@ant-design/icons';

export const StatsCard = ({ stat }: StatsCardProps) => {
  const { title, used, total, progress, daysLeft, color } = stat;

  return (
    <div className="gba:statsCard" data-testid="stats-card">
      <div className="gba:statsCardRow gba:statsCardRow--top" data-testid="stats-card-row-top">
        <span className="gba:statsCardIcon" data-testid="stats-card-icon">
          <CalendarOutlined style={{ color: `#${color}` }} />
        </span>
        <span className="gba:statsCardTitle" data-testid="stats-card-title">{title}</span>
        <span className="gba:statsCardDaysLeft" data-testid="stats-card-days-left">{daysLeft} days left</span>
      </div>
      <div className="gba:statsCardProgressBarContainer" data-testid="stats-card-progress-bar-container">
        <div className="gba:statsCardProgressBarBg" data-testid="stats-card-progress-bar-bg">
          <div
            className="gba:statsCardProgressBarFg"
            style={{ width: `${progress}%` }}
            data-testid="stats-card-progress-bar"
          />
        </div>
      </div>
      <div className="gba:statsCardRow gba:statsCardRow--bottom" data-testid="stats-card-row-bottom">
        <span className="gba:statsCardUsed" data-testid="stats-card-used">Used: {used}</span>
        <span className="gba:statsCardTotal" data-testid="stats-card-total">Total: {total}</span>
      </div>
    </div>
  );
}

export default StatsCard
