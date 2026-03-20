import React from 'react'
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'

interface SuccessErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  'data-testid'?: string
}

export const SuccessErrorState: React.FC<SuccessErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryLabel,
  'data-testid': testId = 'success-error-state'
}) => {
  return (
    <Alert variant="destructive" data-testid={testId}>
      <AlertTriangle className="gba:h-4 gba:w-4" />
      <div className="gba:flex gba:flex-col gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:font-medium">{title}</span>
          <AlertDescription>{message}</AlertDescription>
        </div>
        {onRetry && retryLabel ? (
          <div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </Alert>
  )
}

interface SuccessEmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  'data-testid'?: string
}

export const SuccessEmptyState: React.FC<SuccessEmptyStateProps> = ({
  title,
  description,
  icon,
  'data-testid': testId = 'success-empty-state'
}) => {
  return (
    <div
      className="gba:flex gba:min-h-48 gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/40 gba:p-6 gba:text-center"
      data-testid={testId}
    >
      {icon ? <div className="gba:text-muted-foreground">{icon}</div> : null}
      <div className="gba:flex gba:flex-col gba:gap-1">
        <h3 className="gba:text-base gba:font-medium gba:text-foreground">{title}</h3>
        <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export const SuccessLoadingGrid: React.FC<{ count?: number; 'data-testid'?: string }> = ({
  count = 4,
  'data-testid': testId = 'success-loading-grid'
}) => {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:xl:grid-cols-4" data-testid={testId}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-5">
          <div className="gba:mb-4 gba:h-4 gba:w-28 gba:animate-pulse gba:rounded gba:bg-muted" />
          <div className="gba:mb-3 gba:h-8 gba:w-20 gba:animate-pulse gba:rounded gba:bg-muted" />
          <div className="gba:h-3 gba:w-full gba:animate-pulse gba:rounded gba:bg-muted" />
        </div>
      ))}
    </div>
  )
}
