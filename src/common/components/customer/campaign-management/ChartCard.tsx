import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Shared chart card wrapper with loading, error, and empty states
 * Eliminates duplication across analytics chart components
 */

export interface ChartCardProps {
  title: React.ReactNode
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  isEmpty?: boolean
  emptyMessage?: string
  children: React.ReactNode
  headerActions?: React.ReactNode
  'data-testid'?: string
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  isLoading = false,
  error = null,
  onRetry,
  isEmpty = false,
  emptyMessage,
  children,
  headerActions,
  'data-testid': dataTestId
}) => {
  // Loading state
  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
            <Spinner className="gba:mb-4" />
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('common.loading', 'Loading...')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:font-semibold gba:mb-1">
                    {getTranslationFromI18nKeyAndLabel('common.error', 'Error')}
                  </div>
                  <div>{error}</div>
                </div>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (isEmpty) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
            <p className="gba:text-sm gba:text-muted-foreground">
              {emptyMessage || getTranslationFromI18nKeyAndLabel('common.noData', 'No data available')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Content state
  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>{title}</CardTitle>
          {headerActions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * Chart type switcher button group
 */
export interface ChartTypeSwitcherProps<T extends string> {
  options: Array<{
    value: T
    label: string
    icon: React.ReactNode
  }>
  activeType: T
  onChange: (type: T) => void
  'data-testid'?: string
}

export function ChartTypeSwitcher<T extends string>({
  options,
  activeType,
  onChange,
  'data-testid': dataTestId
}: Readonly<ChartTypeSwitcherProps<T>>) {
  return (
    <div className="gba:flex gba:gap-2" data-testid={dataTestId}>
      {options.map(option => (
        <Button
          key={option.value}
          variant={activeType === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          className="gba:flex gba:items-center gba:gap-1"
          data-testid={`${dataTestId}-${option.value}`}
        >
          {option.icon}
          {option.label}
        </Button>
      ))}
    </div>
  )
}
