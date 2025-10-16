import React from 'react'
import { Loader2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Props for LoadingState component
 */
export interface LoadingStateProps {
  /**
   * Loading message to display
   * @default "Loading..."
   */
  message?: string
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Data test ID for testing
   */
  dataTestId?: string
}

/**
 * LoadingState Component
 *
 * Standardized loading spinner with optional message.
 * Used across analytics views for consistent loading UX.
 *
 * @example
 * ```tsx
 * <LoadingState message="Loading investment data..." size="lg" />
 * ```
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = getTranslationFromI18nKeyAndLabel('loading.message', 'Loading...'),
  size = 'md',
  dataTestId = 'loading-state'
}) => {
  const sizeClasses = {
    sm: 'gba:w-6 gba:h-6',
    md: 'gba:w-10 gba:h-10',
    lg: 'gba:w-16 gba:h-16'
  }

  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12" data-testid={dataTestId}>
      <Loader2
        className={`${sizeClasses[size]} gba:animate-spin gba:text-primary`}
        data-testid={`${dataTestId}-spinner`}
      />
      {message && (
        <p className="gba:text-muted-foreground gba:text-sm gba:mt-4" data-testid={`${dataTestId}-message`}>
          {message}
        </p>
      )}
    </div>
  )
}

export default LoadingState
