import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Alert, AlertTitle, AlertDescription, Card } from '@newwork/nw-design-system'
import { CampaignConversionFunnel } from '../../queries/CampaignAnalyticsQueries'

interface CampaignConversionFunnelProps {
  funnelData: CampaignConversionFunnel | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const CampaignConversionFunnelComponent: React.FC<CampaignConversionFunnelProps> = ({
  funnelData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="funnel-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4"></div>
        <p className="gba:text-muted-foreground">Loading conversion funnel...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="funnel-error-alert">
        <AlertTitle>Error Loading Conversion Funnel</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        {onRetry && (
          <button
            onClick={onRetry}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:text-sm gba:rounded gba:bg-primary gba:text-primary-foreground"
            data-testid="funnel-retry-button"
          >
            Retry
          </button>
        )}
      </Alert>
    )
  }

  if (!funnelData?.stages || funnelData.stages.length === 0) {
    return (
      <div className="gba:p-8 gba:text-center gba:bg-muted">
        <p className="gba:text-muted-foreground">No conversion funnel data available.</p>
      </div>
    )
  }

  // Colors for funnel stages
  const stageColors = ['#8884d8', '#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96']

  // Format tooltip
  const formatTooltip = (value: number) => {
    return [
      <div key="tooltip-content">
        <div>Count: {value}</div>
      </div>,
      'Funnel Stage'
    ]
  }

  return (
    <Card className="gba:p-6" data-testid="campaign-conversion-funnel-container">
      {/* Header */}
      <div className="gba:mb-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-foreground">Conversion Funnel</h3>
        <p className="gba:text-sm gba:text-muted-foreground">Lead progression through the sales funnel</p>
      </div>

      {/* Funnel Chart */}
      <div className="gba:h-80 gba:mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnelData.stages} margin={{ top: 20, right: 30, left: 20, bottom: 80 }} maxBarSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 12 }}
              stroke="var(--color-text-secondary)"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--color-text-secondary)"
              tickFormatter={value => Math.floor(value).toString()}
              domain={[0, 'dataMax']}
              allowDecimals={false}
            />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'var(--color-surface-primary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '12px'
              }}
              data-testid="funnel-tooltip"
            />
            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {funnelData.stages.map((stage, index) => (
                <Cell key={`cell-${stage.stage}`} fill={stageColors[index % stageColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel Statistics - KPI Style */}
      <div
        className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-4"
        data-testid="funnel-kpi-cards"
      >
        {funnelData.stages.map((stage, index) => (
          <div
            key={stage.stage}
            className="gba:text-center gba:p-4 gba:bg-muted gba:rounded-lg gba:border gba:border-border"
            data-testid={`funnel-kpi-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <div
                className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                style={{ backgroundColor: stageColors[index % stageColors.length] }}
              ></div>
              <h4 className="gba:text-sm gba:font-medium gba:text-foreground">{stage.stage}</h4>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{stage.count.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default CampaignConversionFunnelComponent
