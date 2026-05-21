import React from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconAvatar,
  Spinner
} from '@newwork/nw-design-system'

interface AnalyticsChartCardProps {
  title: string
  description: string
  icon: React.ComponentType<any>
  isLoading?: boolean
  error?: string | null
  isEmpty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  headerAction?: React.ReactNode
  children: React.ReactNode
}

export const AnalyticsChartCard: React.FC<AnalyticsChartCardProps> = ({
  title,
  description,
  icon,
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No data available',
  onRetry,
  headerAction,
  children
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:h-80 gba:items-center gba:justify-center">
          <Spinner size="lg" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            <span>{error}</span>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </Alert>
      )
    }

    if (isEmpty) {
      return (
        <div className="gba:flex gba:h-80 gba:items-center gba:justify-center gba:text-muted-foreground">
          {emptyMessage}
        </div>
      )
    }

    return children
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={icon} variant="default" size="md" decorative />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}
