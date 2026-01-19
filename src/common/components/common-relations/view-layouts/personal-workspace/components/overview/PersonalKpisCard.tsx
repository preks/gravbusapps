import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import type { KpiDefinition } from '../../types'
import { getNestedValue } from '../../utils'

export interface PersonalKpisCardProps {
  kpis: KpiDefinition[]
  data: any
  loading: boolean
}

/**
 * Generic Personal KPIs Card
 * Renders KPIs dynamically based on configuration
 */
export const PersonalKpisCard: React.FC<PersonalKpisCardProps> = ({ kpis, data, loading }) => {
  const formatTrend = (trend: number): string => {
    const sign = trend >= 0 ? '+' : ''
    return `${sign}${trend.toFixed(1)}%`
  }

  if (loading && !data) {
    return (
      <Card data-testid="personal-kpis-loading">
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  // Transform KPI definitions into WidgetItems
  const widgets: WidgetItem[] = kpis.map(kpi => {
    const value = getNestedValue(data, kpi.valueKey)
    const trend = kpi.trendKey ? getNestedValue(data, kpi.trendKey) : undefined

    // Format the value
    const formattedValue = kpi.formatValue ? kpi.formatValue(value) : value
    const isStringValue = typeof formattedValue === 'string' && Number.isNaN(Number(formattedValue))

    const widget: WidgetItem = {
      key: kpi.id,
      title: kpi.label,
      value: isStringValue ? 0 : Number(formattedValue),
      prefix: React.createElement(kpi.icon),
      color: kpi.color,
      description: kpi.description // Add description from KPI definition
    }

    // If value is formatted as string, pass it directly
    if (isStringValue) {
      widget.value = formattedValue
      widget.valueIsString = true
    }

    // Add trend if available
    if (trend !== undefined && trend !== null) {
      widget.trend = {
        value: formatTrend(trend),
        positive: trend >= 0,
        description: kpi.trendDescription || 'vs last month' // Use custom or default description
      }
    }

    return widget
  })

  return (
    <div className="gba:space-y-4" data-testid="personal-kpis-card">
      <WidgetGroup widgets={widgets} isLoading={loading} />
    </div>
  )
}

export default PersonalKpisCard
