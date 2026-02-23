import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'

export interface AnalyticsTabErrorCardProps {
  /** e.g. "Employment-tab" */
  dataTestId: string
  /** Error message (or title when detail is provided) */
  message: string
  /** Optional detail text (when set, uses row layout with message as title) */
  detail?: string
  /** Retry button label (e.g. from t('common-retry')) */
  retryLabel: string
  /** Called when user clicks retry */
  onRetry: () => void
  /** Optional CSS class for the wrapper */
  className?: string
  /** 'centered' = single message + button; 'row' = title + detail + button (default when detail is set) */
  variant?: 'centered' | 'row'
}

/**
 * Shared error state card for analytics tabs (Employment, HeadcountTrends, TurnoverRetention).
 * Reduces duplicated error UI and keeps styling consistent.
 */
const AnalyticsTabErrorCard: React.FC<AnalyticsTabErrorCardProps> = ({
  dataTestId,
  message,
  detail,
  retryLabel,
  onRetry,
  className = 'gba:p-4',
  variant = detail ? 'row' : 'centered'
}) => (
  <div data-testid={dataTestId} className={className}>
    <Card
      className={
        variant === 'centered'
          ? 'gba:border-destructive-secondary'
          : 'gba:border-destructive-secondary gba:bg-destructive-secondary/50'
      }
    >
      <CardContent className="gba:p-6">
        {variant === 'centered' ? (
          <div className="gba:text-center">
            <p className="gba:text-destructive gba:mb-4">{message}</p>
            <button
              type="button"
              onClick={onRetry}
              className="gba:px-4 gba:py-2 gba:bg-destructive gba:text-primary-foreground gba:rounded gba:hover:bg-destructive"
            >
              {retryLabel}
            </button>
          </div>
        ) : (
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex-1">
              <h3 className="gba:text-destructive-secondary-foreground gba:font-medium gba:mb-2">{message}</h3>
              {detail && <p className="gba:text-destructive-secondary-foreground">{detail}</p>}
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="gba:px-4 gba:py-2 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive-secondary"
            >
              {retryLabel}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)

export default AnalyticsTabErrorCard
