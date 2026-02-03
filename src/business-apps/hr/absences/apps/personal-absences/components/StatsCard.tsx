import type { StatsCardProps } from '../types/absenceTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Calendar } from 'lucide-react'

export const StatsCard = ({ stat }: StatsCardProps) => {
  const { title, used, total, progress, daysLeft, color, checkEntitlement } = stat as any
  let normColor: string | undefined
  if (typeof color === 'string' && color.length > 0) {
    normColor = color.startsWith('#') ? color : `#${color}`
  } else {
    normColor = undefined
  }
  const safeUsed = Number.isFinite(Number(used)) ? Number(used) : 0
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0
  const safeProgress = Number.isFinite(Number(progress)) ? Number(progress) : 0
  const safeDaysLeft = Number.isFinite(Number(daysLeft)) ? Number(daysLeft) : 0

  // If checkEntitlement is explicitly false, show only used days
  if (checkEntitlement === false) {
    return (
      <div className="gba:statsCard" data-testid="stats-card">
        <div className="gba:statsCardRow gba:statsCardRow--top" data-testid="stats-card-row-top">
          <span className="gba:statsCardIcon" data-testid="stats-card-icon">
            <Calendar className="gba:w-4 gba:h-4" style={normColor ? { color: normColor } : undefined} />
          </span>
          <span className="gba:statsCardTitle" data-testid="stats-card-title">
            {title}
          </span>
        </div>
        <div className="gba:statsCardRow gba:statsCardRow--bottom" data-testid="stats-card-row-bottom">
          <span
            className="gba:statsCardUsed"
            style={safeUsed > 0 ? { color: 'var(--nw-success)' } : { color: 'var(--nw-foreground)' }}
            data-testid="stats-card-used"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used_colon', 'Used:')} {safeUsed}
          </span>
        </div>
      </div>
    )
  }

  // Default: show all details
  return (
    <div className="gba:statsCard" data-testid="stats-card">
      <div className="gba:statsCardRow gba:statsCardRow--top" data-testid="stats-card-row-top">
        <span className="gba:statsCardIcon" data-testid="stats-card-icon">
          <Calendar className="gba:w-4 gba:h-4" style={normColor ? { color: normColor } : undefined} />
        </span>
        <span className="gba:statsCardTitle" data-testid="stats-card-title">
          {title}
        </span>
        <span className="gba:statsCardDaysLeft" data-testid="stats-card-days-left">
          {safeDaysLeft} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days_left', 'days left')}
        </span>
      </div>
      <div className="gba:statsCardProgressBarContainer" data-testid="stats-card-progress-bar-container">
        <div className="gba:statsCardProgressBarBg" data-testid="stats-card-progress-bar-bg">
          <div
            className="gba:statsCardProgressBarFg"
            style={{ width: `${Math.max(0, Math.min(100, safeProgress))}%` }}
            data-testid="stats-card-progress-bar"
          />
        </div>
      </div>
      <div className="gba:statsCardRow gba:statsCardRow--bottom" data-testid="stats-card-row-bottom">
        <span
          className="gba:statsCardUsed"
          style={safeUsed > 0 ? { color: 'var(--nw-success)' } : { color: 'var(--nw-foreground)' }}
          data-testid="stats-card-used"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used_colon', 'Used:')} {safeUsed}
        </span>
        <span className="gba:statsCardTotal" data-testid="stats-card-total">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.total_colon', 'Total:')} {safeTotal}
        </span>
      </div>
    </div>
  )
}

export default StatsCard
