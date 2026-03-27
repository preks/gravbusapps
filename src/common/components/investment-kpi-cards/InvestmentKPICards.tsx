import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { KPIConfig, BaseKPIData, formatKPIValue, calculateChange, validateKPIData } from '@/common/data/investment/kpis'

export interface InvestmentKPICardsProps<T extends BaseKPIData> {
  /** KPI configuration defining which KPIs to display */
  config: KPIConfig
  /** Current period data */
  data: T
  /** Previous period data for trend comparison */
  previousData: T
  /** Currency code for currency formatting */
  currencyCode?: string
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: Error | null
  /** Retry callback for error state */
  onRetry?: () => void | Promise<void>
  /** Optional data-testid prefix */
  'data-testid'?: string
}

/**
 * Shared KPI Cards Component
 *
 * This component renders KPI cards based on a centralized configuration.
 * It ensures consistent KPI display across Investment View and Analytics View.
 *
 * @example
 * ```tsx
 * import { EQUITY_KPI_CONFIG, EquityKPIData } from '@/common/data/investment/kpis'
 *
 * <InvestmentKPICards
 *   config={EQUITY_KPI_CONFIG}
 *   data={currentKPIs}
 *   previousData={previousKPIs}
 *   currencyCode="EUR"
 *   isLoading={false}
 * />
 * ```
 */
export function InvestmentKPICards<T extends BaseKPIData>({
  config,
  data,
  previousData,
  currencyCode = 'EUR',
  isLoading = false,
  error = null,
  onRetry,
  'data-testid': dataTestId
}: InvestmentKPICardsProps<T>): JSX.Element {
  // Validate data structure matches config in development
  if (process.env.NODE_ENV === 'development') {
    const validation = validateKPIData(data, config)
    if (!validation.isValid) {
      console.warn(
        `[InvestmentKPICards] Data validation failed for ${config.name}:`,
        `Missing fields: ${validation.missingFields.join(', ')}`
      )
    }
  }

  // Transform KPI config to widget items
  const widgets: WidgetItem[] = config.kpis
    .sort((a, b) => a.order - b.order)
    .map(kpi => {
      // Get values from data
      const currentValue = (data as any)[kpi.field]
      const previousValue = (previousData as any)[kpi.field]

      // Format the value
      const formattedValue =
        kpi.format === 'number' ? currentValue : formatKPIValue(currentValue, kpi.format, currencyCode)

      // Calculate trend
      const trend = calculateChange(currentValue, previousValue)

      // Create widget item
      const Icon = kpi.icon
      return {
        key: kpi.key,
        title: kpi.title,
        value: formattedValue,
        prefix: <Icon />,
        color: kpi.color,
        valueIsString: kpi.format !== 'number',
        span: kpi.span || { xs: 24, sm: 12, lg: 6 },
        description: kpi.description,
        trend: {
          value: trend.value,
          positive: trend.positive,
          description: kpi.trendDescription ?? 'vs last quarter'
        }
      }
    })

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      skeletonCount={config.kpis.length}
      emptyText={`No ${config.name.toLowerCase()} data available.`}
      data-testid={dataTestId}
    />
  )
}

export default InvestmentKPICards
