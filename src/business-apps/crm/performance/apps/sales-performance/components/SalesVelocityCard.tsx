import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  IconAvatar
} from '@newwork/nw-design-system'
import { RocketIcon, TrendUpIcon, TrendDownIcon, MinusIcon } from '@phosphor-icons/react'
import { type SalesVelocityData } from '../hooks/useSalesVelocity'
import { formatCurrency } from '@/common/utils/numberFormatter'

interface SalesVelocityCardProps {
  velocityData: SalesVelocityData | null
  currencyCode?: string
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const DATA_TEST_ID_PREFIX = 'sales-velocity-card'

/**
 * Sales Velocity Card component
 * Shows current month revenue compared to 3 months ago with trend indicators
 */
export const SalesVelocityCard: React.FC<SalesVelocityCardProps> = ({
  velocityData,
  currencyCode = 'EUR',
  isLoading = false,
  error = null,
  onRetry
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendUpIcon className="gba:h-5 gba:w-5 gba:text-success" weight="bold" />
      case 'down':
        return <TrendDownIcon className="gba:h-5 gba:w-5 gba:text-destructive" weight="bold" />
      default:
        return <MinusIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" weight="bold" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'gba:text-success'
      case 'down':
        return 'gba:text-destructive'
      default:
        return 'gba:text-muted-foreground'
    }
  }

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change}%`
  }

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={RocketIcon} variant="default" size="md" decorative />
            Monthly Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[220px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={RocketIcon} variant="default" size="md" decorative />
            Monthly Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[220px] gba:gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!velocityData) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-empty`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={RocketIcon} variant="default" size="md" decorative />
            Monthly Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[220px] gba:text-muted-foreground">
          No sales data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={RocketIcon} variant="default" size="md" decorative />
          Monthly Sales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Month Revenue - Main Display */}
        <div className="gba:text-center gba:mb-4">
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{velocityData.currentMonthName}</div>
          <div className="gba:text-4xl gba:font-bold gba:text-primary">
            {formatCurrency(velocityData.currentMonthRevenue, currencyCode)}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground">{velocityData.currentMonthDeals} deals closed</div>

          {/* Trend indicator */}
          <div
            className={`gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mt-2 ${getTrendColor(velocityData.trend)}`}
          >
            {getTrendIcon(velocityData.trend)}
            <span className="gba:text-sm gba:font-medium">
              {formatChange(velocityData.revenueChange)} vs {velocityData.comparisonMonthName}
            </span>
          </div>
        </div>

        {/* Comparison Month */}
        <div className="gba:bg-muted/50 gba:rounded-lg gba:p-3 gba:mb-4">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <div className="gba:text-xs gba:text-muted-foreground">{velocityData.comparisonMonthName}</div>
              <div className="gba:text-lg gba:font-semibold">
                {formatCurrency(velocityData.comparisonMonthRevenue, currencyCode)}
              </div>
            </div>
            <div className="gba:text-right">
              <div className="gba:text-xs gba:text-muted-foreground">Deals</div>
              <div className="gba:text-lg gba:font-semibold">{velocityData.comparisonMonthDeals}</div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-3 gba:pt-3 gba:border-t">
          <div className="gba:text-center">
            <div className="gba:text-lg gba:font-semibold gba:text-foreground">
              {formatCurrency(velocityData.avgDealSize, currencyCode)}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Avg Deal</div>
          </div>

          <div className="gba:text-center">
            <div className="gba:text-lg gba:font-semibold gba:text-foreground">{velocityData.winRate}%</div>
            <div className="gba:text-xs gba:text-muted-foreground">Win Rate</div>
          </div>

          <div className="gba:text-center">
            <div className="gba:text-lg gba:font-semibold gba:text-foreground">{velocityData.avgSalesCycleDays}d</div>
            <div className="gba:text-xs gba:text-muted-foreground">Avg Cycle</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SalesVelocityCard
