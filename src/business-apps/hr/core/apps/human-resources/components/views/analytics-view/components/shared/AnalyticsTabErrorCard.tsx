import React from 'react'
import { Button, Card, CardContent } from '@newwork/nw-design-system'

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
  className = 'gba:p-4'
}) => (
  <div data-testid={dataTestId} className={className}>
    <Card>
      <CardContent className="gba:p-0">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
          <div className="gba:text-destructive gba:text-lg gba:font-medium gba:mb-2">{message}</div>
          {detail ? <div className="gba:text-muted-foreground gba:mb-4">{detail}</div> : null}
          <Button variant="default" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)

export default AnalyticsTabErrorCard
