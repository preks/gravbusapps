import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { BarChart3 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Props for ChartEmptyState component
 */
export interface ChartEmptyStateProps {
  /**
   * Message to display when chart is empty
   * @default "No data available for the selected currency"
   */
  message?: string
  /**
   * Height of the empty state container
   * @default "400px"
   */
  height?: string
  /**
   * Whether to show a hint about currency filtering
   * @default false
   */
  showCurrencyHint?: boolean
  /**
   * Custom icon to display
   * @default BarChart3 icon
   */
  icon?: React.ReactNode
  /**
   * Data test ID for testing
   */
  dataTestId?: string
}

/**
 * ChartEmptyState Component
 *
 * Displays a consistent empty state for charts when no data is available.
 * Used across analytics views to provide a better UX when filtered data is empty.
 *
 * @example
 * ```tsx
 * <ChartEmptyState
 *   message="No investment amounts recorded for this currency"
 *   showCurrencyHint
 * />
 * ```
 */
export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({
  message = getTranslationFromI18nKeyAndLabel('chart.empty.message', 'No data available for the selected currency'),
  height = '400px',
  showCurrencyHint = false,
  icon,
  dataTestId = 'chart-empty-state'
}) => {
  const defaultIcon = <BarChart3 className="gba:w-16 gba:h-16 gba:text-muted-foreground" />

  return (
    <Card className="gba:w-full" style={{ height }} data-testid={dataTestId}>
      <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:p-8">
        <div className="gba:mb-4" data-testid={`${dataTestId}-icon`}>
          {icon || defaultIcon}
        </div>
        <p className="gba:text-muted-foreground gba:text-sm gba:mb-2" data-testid={`${dataTestId}-message`}>
          {message}
        </p>
        {showCurrencyHint && (
          <p className="gba:text-muted-foreground gba:text-xs gba:mt-2" data-testid={`${dataTestId}-hint`}>
            {getTranslationFromI18nKeyAndLabel('chart.empty.hint', 'Try selecting a different currency to see data')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default ChartEmptyState
