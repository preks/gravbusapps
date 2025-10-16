import React from 'react'
import { Alert, AlertDescription, AlertTitle, Button } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Props for ErrorState component
 */
export interface ErrorStateProps {
  /**
   * Error title
   * @default "Error"
   */
  title?: string
  /**
   * Error message to display
   */
  message: string
  /**
   * Callback for retry action
   */
  onRetry?: () => void
  /**
   * Custom retry button label
   * @default "Retry"
   */
  retryLabel?: string
  /**
   * Data test ID for testing
   */
  dataTestId?: string
}

/**
 * ErrorState Component
 *
 * Standardized error display with optional retry functionality.
 * Used across analytics views for consistent error handling UX.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   message="Failed to load investment data"
 *   onRetry={refetch}
 * />
 * ```
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = getTranslationFromI18nKeyAndLabel('error.title', 'Error'),
  message,
  onRetry,
  retryLabel = getTranslationFromI18nKeyAndLabel('error.retry', 'Retry'),
  dataTestId = 'error-state'
}) => {
  return (
    <Alert variant="destructive" className="gba:my-4" data-testid={dataTestId}>
      <AlertCircle className="gba:h-4 gba:w-4" />
      <AlertTitle data-testid={`${dataTestId}-title`}>{title}</AlertTitle>
      <AlertDescription className="gba:flex gba:flex-col gba:gap-2" data-testid={`${dataTestId}-message`}>
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gba:mt-2 gba:w-fit"
            data-testid={`${dataTestId}-retry-button`}
          >
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default ErrorState
